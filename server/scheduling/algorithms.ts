import { welshPowellOrder } from "./conflict-graph";
import type { AlgorithmId, Assignment, Diagnostic, EngineConfig } from "./domain";
import { Occupancy, type SchedulingModel } from "./model";

export interface SolverResult {
  assignments: Assignment[];
  unscheduledExamIds: string[];
  diagnostics: Diagnostic[];
  /** Search nodes expanded (backtracking only). */
  searchNodes: number | null;
  /** How the solver stopped. Only "exhausted" (a complete search with no solution) establishes infeasibility. */
  stop: "complete" | "heuristic-gave-up" | "exhausted" | "limit";
  /** Slots used, the "colours" of a graph-colouring schedule. */
  colorsUsed?: number;
}

export interface AlgorithmDescriptor {
  id: AlgorithmId;
  name: string;
  version: string;
  family: string;
  summary: string;
  complete: boolean;
  solve(model: SchedulingModel, config: EngineConfig): SolverResult;
}

function collect(model: SchedulingModel, occupancy: Occupancy) {
  const assignments: Assignment[] = [];
  const unscheduled: number[] = [];
  model.exams.forEach((exam, e) => {
    if (occupancy.slotOf[e] === -1) unscheduled.push(e);
    else assignments.push({ examId: exam.id, slotId: model.slots[occupancy.slotOf[e]].id, roomId: model.rooms[occupancy.roomOf[e]].id });
  });
  return { assignments, unscheduled };
}

/** Explains, slot by slot, why a heuristic could not place an exam given the assignments already made. */
export function explainRejection(model: SchedulingModel, occupancy: Occupancy, e: number, algorithm: string): Diagnostic {
  const exam = model.exams[e];
  const studentBlocked: string[] = [], roomBlocked: string[] = [];
  const blockers = new Set<string>();
  for (const s of model.candidateSlots[e]) {
    if (!occupancy.studentsFree(e, s)) {
      studentBlocked.push(model.slots[s].id);
      for (const u of model.graph.adjacency[e]) if (occupancy.slotOf[u] !== -1 && model.slotOverlap[s][occupancy.slotOf[u]]) blockers.add(model.exams[u].id);
    } else if (occupancy.bestFitRoom(e, s) === -1) roomBlocked.push(model.slots[s].id);
  }
  const parts = [];
  if (studentBlocked.length) parts.push(`${studentBlocked.length} slot${studentBlocked.length > 1 ? "s" : ""} clashed with students already placed in ${[...blockers].sort().slice(0, 4).join(", ")}${blockers.size > 4 ? ` and ${blockers.size - 4} more` : ""}`);
  if (roomBlocked.length) parts.push(`${roomBlocked.length} slot${roomBlocked.length > 1 ? "s" : ""} had no free ${exam.requiredRoomType === "LAB" ? "laboratory" : "room"} for ${model.graph.studentCount[e]} students`);
  return {
    code: "UNSCHEDULED_EXAM", severity: "error", kind: "search", constraint: studentBlocked.length >= roomBlocked.length ? "Student overlap" : "Room capacity",
    message: `${algorithm} could not place ${exam.id}: of ${model.candidateSlots[e].length} permissible slot${model.candidateSlots[e].length === 1 ? "" : "s"}, ${parts.join(" and ")}.`,
    examIds: [exam.id, ...[...blockers].sort()], slotIds: [...studentBlocked, ...roomBlocked],
    remediation: "A heuristic failure does not prove infeasibility. Try the constraint-aware backtracking search.",
  };
}

export const firstFit: AlgorithmDescriptor = {
  id: "FIRST_FIT", name: "First-Fit baseline", version: "1.0.0", family: "Greedy baseline", complete: false,
  summary: "Places exams in id order into the earliest permissible slot without a student clash, using the first free room that fits.",
  solve(model) {
    const occupancy = new Occupancy(model);
    const diagnostics: Diagnostic[] = [];
    model.exams.forEach((_, e) => {
      for (const s of model.candidateSlots[e]) {
        if (!occupancy.studentsFree(e, s)) continue;
        const r = occupancy.firstFitRoom(e, s);
        if (r === -1) continue;
        occupancy.assign(e, s, r);
        return;
      }
      diagnostics.push(explainRejection(model, occupancy, e, "First-Fit"));
    });
    const { assignments, unscheduled } = collect(model, occupancy);
    return { assignments, unscheduledExamIds: unscheduled.map((e) => model.exams[e].id), diagnostics, searchNodes: null, stop: unscheduled.length ? "heuristic-gave-up" : "complete" };
  },
};

export const welshPowell: AlgorithmDescriptor = {
  id: "WELSH_POWELL", name: "Welsh-Powell graph colouring", version: "1.0.0", family: "Graph colouring", complete: false,
  summary: "Orders exams by conflict degree and fills one slot (colour) at a time, then allocates the best-fit room. Fixed-slot exams are placed first.",
  solve(model) {
    const occupancy = new Occupancy(model);
    const order = welshPowellOrder(model.graph, model.exams);
    const place = (e: number, s: number) => {
      if (!model.candidateSlots[e].includes(s) || !occupancy.studentsFree(e, s)) return false;
      const r = occupancy.bestFitRoom(e, s);
      if (r === -1) return false;
      occupancy.assign(e, s, r);
      return true;
    };
    for (const e of order) {
      const fixed = model.exams[e].fixedSlotId;
      if (fixed !== null) place(e, model.slotIndex.get(fixed)!);
    }
    for (let s = 0; s < model.slots.length; s++) {
      for (const e of order) if (occupancy.slotOf[e] === -1 && model.exams[e].fixedSlotId === null) place(e, s);
    }
    const { assignments, unscheduled } = collect(model, occupancy);
    return {
      assignments, unscheduledExamIds: unscheduled.map((e) => model.exams[e].id),
      diagnostics: unscheduled.map((e) => explainRejection(model, occupancy, e, "Welsh-Powell")),
      searchNodes: null, stop: unscheduled.length ? "heuristic-gave-up" : "complete",
      colorsUsed: new Set(occupancy.slotOf.filter((s) => s !== -1)).size,
    };
  },
};

class SearchLimit extends Error {}

export const backtracking: AlgorithmDescriptor = {
  id: "BACKTRACKING", name: "Constraint-aware backtracking", version: "1.0.0", family: "Constraint satisfaction", complete: true,
  summary: "Complete search over (slot, room) pairs with most-constrained-first ordering, forward checking and best-fit room ordering, bounded by node and time limits.",
  solve(model, config) {
    const n = model.exams.length;
    const { graph, slotOverlap, slotDay } = model;
    // Domain of each exam: every (slot, room) pair allowed by unary constraints.
    const domain = model.exams.map((_, e) => {
      const values: { s: number; r: number }[] = [];
      for (const s of model.candidateSlots[e]) for (const r of model.suitableRooms[e]) if (!model.roomUnavailable[r][s]) values.push({ s, r });
      return values;
    });
    const prunedAt = domain.map((values) => new Int32Array(values.length));
    const alive = domain.map((values) => values.length);
    const slotOf = new Array<number>(n).fill(-1), roomOf = new Array<number>(n).fill(-1);
    let assignedCount = 0, nodes = 0;
    let best = { count: -1, slotOf: [...slotOf], roomOf: [...roomOf] };
    const deadline = Date.now() + config.timeLimitMs;
    const trail: { e: number; i: number }[] = [];

    const choose = () => {
      let pick = -1;
      for (let e = 0; e < n; e++) {
        if (slotOf[e] !== -1) continue;
        if (pick === -1 || alive[e] < alive[pick] || (alive[e] === alive[pick] && (graph.degree[e] > graph.degree[pick] || (graph.degree[e] === graph.degree[pick] && graph.studentCount[e] > graph.studentCount[pick])))) pick = e;
      }
      return pick;
    };

    // Value ordering: spread a student's exams across days, then waste fewest seats.
    const valueScore = (e: number, s: number, r: number) => {
      let load = 0;
      for (const u of graph.adjacency[e]) {
        if (slotOf[u] === -1) continue;
        if (slotDay[slotOf[u]] === slotDay[s]) load += 3 * graph.shared[e][u];
        else if (Math.abs(slotOf[u] - s) === 1) load += graph.shared[e][u];
      }
      return load * 1000 + (model.rooms[r].capacity - graph.studentCount[e]);
    };

    const prune = (depth: number, e: number, s: number, r: number) => {
      for (let m = 0; m < n; m++) {
        if (slotOf[m] !== -1) continue;
        const conflicts = graph.shared[e][m] > 0;
        const values = domain[m];
        for (let i = 0; i < values.length; i++) {
          if (prunedAt[m][i]) continue;
          const v = values[i];
          if ((conflicts && slotOverlap[s][v.s]) || (v.r === r && slotOverlap[s][v.s])) {
            prunedAt[m][i] = depth; alive[m]--; trail.push({ e: m, i });
          }
        }
        if (alive[m] === 0) return false;
      }
      return true;
    };

    const restore = (depth: number) => {
      while (trail.length && prunedAt[trail[trail.length - 1].e][trail[trail.length - 1].i] === depth) {
        const { e, i } = trail.pop()!;
        prunedAt[e][i] = 0; alive[e]++;
      }
    };

    const search = (depth: number): boolean => {
      if (assignedCount > best.count) best = { count: assignedCount, slotOf: [...slotOf], roomOf: [...roomOf] };
      if (assignedCount === n) return true;
      const e = choose();
      const candidates = domain[e]
        .map((v, i) => ({ ...v, i }))
        .filter((v) => !prunedAt[e][v.i])
        .map((v) => ({ ...v, score: valueScore(e, v.s, v.r) }))
        .sort((a, b) => a.score - b.score || a.s - b.s || a.r - b.r);
      for (const { s, r } of candidates) {
        nodes++;
        if (nodes > config.maxNodes || ((nodes & 127) === 0 && Date.now() > deadline)) throw new SearchLimit();
        slotOf[e] = s; roomOf[e] = r; assignedCount++;
        if (prune(depth, e, s, r) && search(depth + 1)) return true;
        restore(depth);
        slotOf[e] = -1; roomOf[e] = -1; assignedCount--;
      }
      return false;
    };

    let stop: SolverResult["stop"];
    try {
      stop = n === 0 || (domain.every((values) => values.length > 0) && search(1)) ? "complete" : "exhausted";
    } catch (error) {
      if (!(error instanceof SearchLimit)) throw error;
      stop = "limit";
    }

    const finalSlot = stop === "complete" ? slotOf : best.slotOf;
    const finalRoom = stop === "complete" ? roomOf : best.roomOf;
    const assignments: Assignment[] = [];
    const unscheduled: string[] = [];
    model.exams.forEach((exam, e) => {
      if (finalSlot[e] === -1) unscheduled.push(exam.id);
      else assignments.push({ examId: exam.id, slotId: model.slots[finalSlot[e]].id, roomId: model.rooms[finalRoom[e]].id });
    });

    const diagnostics: Diagnostic[] = [];
    if (stop === "limit") {
      diagnostics.push({
        code: "SEARCH_LIMIT_REACHED", severity: "warning", kind: "search", constraint: "Search budget",
        message: `Search stopped after ${nodes.toLocaleString("en-US")} nodes (limit ${config.maxNodes.toLocaleString("en-US")} nodes / ${config.timeLimitMs} ms) without a complete schedule. The deepest partial schedule placed ${best.count} of ${n} exams. Feasibility is unknown.`,
        examIds: unscheduled, remediation: "Raise the node or time limit. Reaching the limit does not prove that no schedule exists.",
      });
    } else if (stop === "exhausted") {
      diagnostics.push({
        code: "SEARCH_EXHAUSTED", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "All hard constraints",
        message: `The complete search explored every consistent (slot, room) combination (${nodes.toLocaleString("en-US")} nodes) and found no schedule that satisfies all hard constraints.`,
        examIds: unscheduled, remediation: "Add slots or rooms, or relax fixed-slot and unavailability constraints.",
      });
    }
    return { assignments, unscheduledExamIds: unscheduled, diagnostics, searchNodes: nodes, stop };
  },
};

export const ALGORITHMS: Record<AlgorithmId, AlgorithmDescriptor> = {
  FIRST_FIT: firstFit,
  WELSH_POWELL: welshPowell,
  BACKTRACKING: backtracking,
};
