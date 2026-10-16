import { welshPowellOrder } from "./conflict-graph";
import type { AlgorithmId, Assignment, Diagnostic, EngineConfig } from "./domain";
import { Occupancy, type SchedulingModel } from "./model";
import type { TraceEvent, TraceRecorder } from "./trace";

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
  /** `trace` is optional; when omitted the solver does exactly the same work as an untraced run. */
  solve(model: SchedulingModel, config: EngineConfig, trace?: TraceRecorder): SolverResult;
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

// Trace helpers. They are only reached through `trace?.emit(...)`, so they never run on an untraced solve.

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Placed exams that share students with `e` and sit in a slot overlapping `s`. */
function clashBlockers(model: SchedulingModel, slotOf: ArrayLike<number>, e: number, s: number) {
  return model.graph.adjacency[e].filter((u) => slotOf[u] !== -1 && model.slotOverlap[s][slotOf[u]]);
}

function studentClashEvent(model: SchedulingModel, slotOf: ArrayLike<number>, e: number, s: number): Omit<TraceEvent, "seq"> {
  const blockers = clashBlockers(model, slotOf, e, s);
  const shared = blockers.reduce((sum, u) => sum + model.graph.shared[e][u], 0);
  const ids = blockers.map((u) => model.exams[u].id);
  return {
    type: "candidate_rejected", examId: model.exams[e].id, slotId: model.slots[s].id, reason: "STUDENT_CLASH", relatedExamIds: ids,
    message: `${model.exams[e].id} cannot use ${model.slots[s].id}: ${plural(shared, "shared student")} already sit ${ids.join(", ")} in an overlapping slot.`,
    data: { sharedStudents: shared },
  };
}

function noRoomEvent(model: SchedulingModel, e: number, s: number): Omit<TraceEvent, "seq"> {
  const exam = model.exams[e];
  return {
    type: "candidate_rejected", examId: exam.id, slotId: model.slots[s].id, reason: "NO_FREE_ROOM",
    message: `${exam.id} is student-free in ${model.slots[s].id}, but no ${exam.requiredRoomType === "LAB" ? "laboratory" : "theory room"} with ${model.graph.studentCount[e]}+ seats is free there.`,
    data: { students: model.graph.studentCount[e], suitableRooms: model.suitableRooms[e].length },
  };
}

function notPermittedEvent(model: SchedulingModel, e: number, s: number): Omit<TraceEvent, "seq"> {
  const exam = model.exams[e], slot = model.slots[s];
  const why = exam.fixedSlotId && exam.fixedSlotId !== slot.id ? `it is fixed to ${exam.fixedSlotId}`
    : exam.unavailableSlotIds.includes(slot.id) ? "the exam is marked unavailable in this slot"
      : `its ${exam.durationMinutes}-minute duration exceeds the ${slot.endMinutes - slot.startMinutes}-minute slot`;
  return { type: "candidate_rejected", examId: exam.id, slotId: slot.id, reason: "SLOT_NOT_PERMITTED", message: `${exam.id} is not permitted in ${slot.id}: ${why}.` };
}

/** Called right after `occupancy.assign(e, s, r)`; that assignment only affects room r, so the other rooms' state is as the algorithm saw it. */
function roomSelectedEvent(model: SchedulingModel, occupancy: Occupancy, e: number, s: number, r: number, policy: "first-fit" | "best-fit"): Omit<TraceEvent, "seq"> {
  const exam = model.exams[e], room = model.rooms[r], students = model.graph.studentCount[e];
  const kind = exam.requiredRoomType === "LAB" ? "laboratory" : "theory room";
  const taken = model.suitableRooms[e].filter((x) => x !== r && !occupancy.roomFree(x, s)).map((x) => model.rooms[x].id);
  const takenNote = taken.length ? ` ${taken.length} other suitable room${taken.length === 1 ? " was" : "s were"} already taken or blocked in this slot (${taken.slice(0, 4).join(", ")}${taken.length > 4 ? ", …" : ""}).` : "";
  return {
    type: "room_selected", examId: exam.id, slotId: model.slots[s].id, roomId: room.id,
    message: (policy === "best-fit"
      ? `Best fit: ${room.id} is the smallest free ${kind} that seats ${students} (${room.capacity} seats, ${room.capacity - students} empty).`
      : `First fit: ${room.id} is the first free ${kind} in id order that seats ${students} (${room.capacity} seats, ${room.capacity - students} empty).`) + takenNote,
    data: { capacity: room.capacity, students, emptySeats: room.capacity - students, policy, suitableRooms: model.suitableRooms[e].length, takenRooms: taken },
  };
}

function runStartedEvent(model: SchedulingModel, message: string, data: TraceEvent["data"] = {}): Omit<TraceEvent, "seq"> {
  return { type: "run_started", message, data: { exams: model.exams.length, slots: model.slots.length, rooms: model.rooms.length, conflictEdges: model.graph.edges.length, ...data } };
}

function completedEvent(model: SchedulingModel, assigned: number, stop: SolverResult["stop"], data: TraceEvent["data"] = {}): Omit<TraceEvent, "seq"> {
  const n = model.exams.length;
  const how = {
    complete: "every exam placed",
    "heuristic-gave-up": `${n - assigned} left unscheduled (a heuristic gave up; this proves nothing about feasibility)`,
    exhausted: "search exhausted: no schedule satisfies every hard constraint",
    limit: "search budget reached: feasibility unknown",
  }[stop];
  return { type: "run_completed", message: `Finished: ${assigned} of ${n} placed, ${how}. The independent validator checks the result next.`, data: { assigned, unscheduled: n - assigned, stop, ...data } };
}

export const firstFit: AlgorithmDescriptor = {
  id: "FIRST_FIT", name: "First-Fit baseline", version: "1.0.0", family: "Greedy baseline", complete: false,
  summary: "Places exams in id order into the earliest permissible slot without a student clash, using the first free room that fits.",
  solve(model, _config, trace) {
    const occupancy = new Occupancy(model);
    const diagnostics: Diagnostic[] = [];
    trace?.emit(runStartedEvent(model, "First-Fit baseline: one pass over the exams, earliest workable slot, first free room. No look-ahead and no undo."));
    trace?.emit({ type: "exam_ordered", message: "Exams are taken in identifier order; conflicts play no part in the order.", data: { order: model.exams.map((exam) => exam.id) } });
    model.exams.forEach((exam, e) => {
      trace?.emit({ type: "exam_selected", examId: exam.id, message: `Next in id order: ${exam.id}, with ${plural(model.candidateSlots[e].length, "permissible slot")} of ${model.slots.length}.`, data: { permissibleSlots: model.candidateSlots[e].length, degree: model.graph.degree[e], students: model.graph.studentCount[e] } });
      for (const s of model.candidateSlots[e]) {
        trace?.emit({ type: "candidate_considered", examId: exam.id, slotId: model.slots[s].id, message: `Try ${exam.id} in ${model.slots[s].id}, the earliest permissible slot not yet tried.` });
        if (!occupancy.studentsFree(e, s)) { trace?.emit(studentClashEvent(model, occupancy.slotOf, e, s)); continue; }
        const r = occupancy.firstFitRoom(e, s);
        if (r === -1) { trace?.emit(noRoomEvent(model, e, s)); continue; }
        occupancy.assign(e, s, r);
        trace?.emit(roomSelectedEvent(model, occupancy, e, s, r, "first-fit"));
        trace?.emit({ type: "slot_assigned", examId: exam.id, slotId: model.slots[s].id, roomId: model.rooms[r].id, message: `${exam.id} placed in ${model.slots[s].id}, ${model.rooms[r].id}.` });
        return;
      }
      const diagnostic = explainRejection(model, occupancy, e, "First-Fit");
      diagnostics.push(diagnostic);
      trace?.emit({ type: "exam_unscheduled", examId: exam.id, relatedExamIds: diagnostic.examIds?.slice(1), message: diagnostic.message });
    });
    const { assignments, unscheduled } = collect(model, occupancy);
    const stop = unscheduled.length ? "heuristic-gave-up" : "complete";
    trace?.emit(completedEvent(model, assignments.length, stop));
    return { assignments, unscheduledExamIds: unscheduled.map((e) => model.exams[e].id), diagnostics, searchNodes: null, stop };
  },
};

export const welshPowell: AlgorithmDescriptor = {
  id: "WELSH_POWELL", name: "Welsh-Powell graph colouring", version: "1.0.0", family: "Graph colouring", complete: false,
  summary: "Orders exams by conflict degree and fills one slot (colour) at a time, then allocates the best-fit room. Fixed-slot exams are placed first.",
  solve(model, _config, trace) {
    const occupancy = new Occupancy(model);
    const order = welshPowellOrder(model.graph, model.exams);
    trace?.emit(runStartedEvent(model, "Welsh-Powell: sort exams by conflict degree, place fixed-slot exams, then fill one slot (colour) at a time with every exam that fits, allocating the best-fit room."));
    trace?.emit({
      type: "exam_ordered", message: "Vertex order: conflict degree descending, then student count descending, then id. High-degree exams are coloured first because they are hardest to fit later.",
      data: { order: order.map((e) => model.exams[e].id), degrees: order.map((e) => model.graph.degree[e]) },
    });
    const place = (e: number, s: number) => {
      const examId = model.exams[e].id, slotId = model.slots[s].id;
      trace?.emit({ type: "candidate_considered", examId, slotId, message: `Can ${examId} (degree ${model.graph.degree[e]}) join slot ${slotId}?`, data: { degree: model.graph.degree[e] } });
      if (!model.candidateSlots[e].includes(s)) { trace?.emit(notPermittedEvent(model, e, s)); return false; }
      if (!occupancy.studentsFree(e, s)) { trace?.emit(studentClashEvent(model, occupancy.slotOf, e, s)); return false; }
      const r = occupancy.bestFitRoom(e, s);
      if (r === -1) { trace?.emit(noRoomEvent(model, e, s)); return false; }
      occupancy.assign(e, s, r);
      trace?.emit(roomSelectedEvent(model, occupancy, e, s, r, "best-fit"));
      trace?.emit({ type: "slot_assigned", examId, slotId, roomId: model.rooms[r].id, message: `${examId} coloured ${slotId}, in ${model.rooms[r].id}.` });
      return true;
    };
    for (const e of order) {
      const fixed = model.exams[e].fixedSlotId;
      if (fixed === null) continue;
      trace?.emit({ type: "exam_selected", examId: model.exams[e].id, slotId: fixed, message: `${model.exams[e].id} is fixed to ${fixed}, so it is placed before any colouring.` });
      place(e, model.slotIndex.get(fixed)!);
    }
    for (let s = 0; s < model.slots.length; s++) {
      trace?.emit({ type: "slot_opened", slotId: model.slots[s].id, message: `Colour ${s + 1}: slot ${model.slots[s].id}. Walk the degree order and add each unplaced exam that has no conflict here.`, data: { colour: s + 1, unplaced: occupancy.slotOf.filter((x) => x === -1).length } });
      for (const e of order) if (occupancy.slotOf[e] === -1 && model.exams[e].fixedSlotId === null) place(e, s);
    }
    const { assignments, unscheduled } = collect(model, occupancy);
    const diagnostics = unscheduled.map((e) => explainRejection(model, occupancy, e, "Welsh-Powell"));
    diagnostics.forEach((d, i) => trace?.emit({ type: "exam_unscheduled", examId: model.exams[unscheduled[i]].id, relatedExamIds: d.examIds?.slice(1), message: d.message }));
    const stop = unscheduled.length ? "heuristic-gave-up" : "complete";
    const colorsUsed = new Set(occupancy.slotOf.filter((s) => s !== -1)).size;
    trace?.emit(completedEvent(model, assignments.length, stop, { colorsUsed }));
    return { assignments, unscheduledExamIds: unscheduled.map((e) => model.exams[e].id), diagnostics, searchNodes: null, stop, colorsUsed };
  },
};

class SearchLimit extends Error {}

export const backtracking: AlgorithmDescriptor = {
  id: "BACKTRACKING", name: "Constraint-aware backtracking", version: "1.0.0", family: "Constraint satisfaction", complete: true,
  summary: "Complete search over (slot, room) pairs with most-constrained-first ordering, forward checking and best-fit room ordering, bounded by node and time limits.",
  solve(model, config, trace) {
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
    trace?.emit(runStartedEvent(model, "Backtracking: depth-first search over (slot, room) values. Pick the most constrained exam (MRV), try its values best-first, prune neighbours' domains (forward checking), and undo on dead ends.", { totalValues: domain.reduce((sum, v) => sum + v.length, 0), maxNodes: config.maxNodes, timeLimitMs: config.timeLimitMs }));

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

    /** Removes values that clash with (e, s, r). Returns the first exam left with an empty domain, or -1. */
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
        if (alive[m] === 0) return m;
      }
      return -1;
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
      const examId = model.exams[e].id;
      trace?.emit({ type: "exam_selected", examId, depth, message: `MRV picks ${examId}: ${plural(alive[e], "(slot, room) value")} left, the fewest of any unplaced exam (ties: higher degree, then more students).`, data: { remainingValues: alive[e], degree: graph.degree[e], students: graph.studentCount[e] } });
      const candidates = domain[e]
        .map((v, i) => ({ ...v, i }))
        .filter((v) => !prunedAt[e][v.i])
        .map((v) => ({ ...v, score: valueScore(e, v.s, v.r) }))
        .sort((a, b) => a.score - b.score || a.s - b.s || a.r - b.r);
      for (const { s, r, score } of candidates) {
        nodes++;
        if (nodes > config.maxNodes || ((nodes & 127) === 0 && Date.now() > deadline)) throw new SearchLimit();
        trace?.emit({ type: "candidate_considered", examId, slotId: model.slots[s].id, roomId: model.rooms[r].id, depth, node: nodes, message: `Try ${examId} in ${model.slots[s].id} / ${model.rooms[r].id} (value score ${score}; lower keeps shared students off the same day and wastes fewer seats).`, data: { score } });
        slotOf[e] = s; roomOf[e] = r; assignedCount++;
        const wiped = prune(depth, e, s, r);
        if (wiped !== -1) {
          trace?.emit({ type: "forward_check_failed", examId, slotId: model.slots[s].id, roomId: model.rooms[r].id, depth, node: nodes, relatedExamIds: [model.exams[wiped].id], message: `Forward check: ${examId} in ${model.slots[s].id} / ${model.rooms[r].id} would leave ${model.exams[wiped].id} with no (slot, room) value, so this value is discarded without searching deeper.` });
        } else {
          trace?.emit({ type: "slot_assigned", examId, slotId: model.slots[s].id, roomId: model.rooms[r].id, depth, node: nodes, message: `${examId} placed in ${model.slots[s].id}, ${model.rooms[r].id} at depth ${depth}; every remaining exam still has a value.`, data: { capacity: model.rooms[r].capacity, students: graph.studentCount[e] } });
          if (search(depth + 1)) return true;
          trace?.emit({ type: "backtrack", examId, slotId: model.slots[s].id, roomId: model.rooms[r].id, depth, node: nodes, message: `No complete schedule below ${examId} in ${model.slots[s].id} / ${model.rooms[r].id}: undo it and try its next value.` });
        }
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
      trace?.emit({ type: "search_limit_reached", node: nodes, message: `Search budget reached after ${nodes.toLocaleString("en-US")} nodes (limit ${config.maxNodes.toLocaleString("en-US")} nodes / ${config.timeLimitMs} ms). The deepest partial schedule is kept; feasibility is unknown.`, data: { nodes, deepest: best.count } });
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
    for (const examId of unscheduled) {
      trace?.emit({ type: "exam_unscheduled", examId, message: stop === "exhausted" ? `${examId} is unplaced: the complete search found no schedule for all exams.` : `${examId} is not in the deepest partial schedule found before the search budget ran out.` });
    }
    trace?.emit(completedEvent(model, assignments.length, stop, { nodes }));
    return { assignments, unscheduledExamIds: unscheduled, diagnostics, searchNodes: nodes, stop };
  },
};

export const ALGORITHMS: Record<AlgorithmId, AlgorithmDescriptor> = {
  FIRST_FIT: firstFit,
  WELSH_POWELL: welshPowell,
  BACKTRACKING: backtracking,
};
