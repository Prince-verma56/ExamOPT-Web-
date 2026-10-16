import { greedyClique } from "./conflict-graph";
import type { Diagnostic, SchedulingInput } from "./domain";
import type { SchedulingModel } from "./model";

export interface PreflightResult {
  diagnostics: Diagnostic[];
  /** Data errors block the solver: results computed from invalid input would be meaningless. */
  hasDataErrors: boolean;
  /** At least one diagnostic proves that no feasible schedule exists. */
  provenInfeasible: boolean;
}

function duplicates(ids: string[]) {
  const seen = new Set<string>(), dupes = new Set<string>();
  for (const id of ids) (seen.has(id) ? dupes : seen).add(id);
  return [...dupes].sort();
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Largest set of pairwise non-overlapping slots: interval scheduling per date. */
export function maxDisjointSlots(model: SchedulingModel) {
  let count = 0;
  const byDate = new Map<string, { start: number; end: number }[]>();
  for (const slot of model.slots) {
    const list = byDate.get(slot.date) ?? [];
    list.push({ start: slot.startMinutes, end: slot.endMinutes });
    byDate.set(slot.date, list);
  }
  for (const list of byDate.values()) {
    let lastEnd = -Infinity;
    for (const interval of list.sort((a, b) => a.end - b.end)) {
      if (interval.start >= lastEnd) { count++; lastEnd = interval.end; }
    }
  }
  return count;
}

/**
 * Maximum matching of exams to distinct available (room, slot) pairs, ignoring
 * student conflicts. Every feasible schedule is such a matching, so an exam set
 * that cannot be matched proves infeasibility. Returns the Hall-violating set.
 */
function roomSlotDeficiency(model: SchedulingModel): number[] {
  const pairsFor = model.exams.map((_, e) => {
    const pairs: number[] = [];
    for (const s of model.candidateSlots[e]) {
      for (const r of model.suitableRooms[e]) if (!model.roomUnavailable[r][s]) pairs.push(r * model.slots.length + s);
    }
    return pairs;
  });
  const owner = new Map<number, number>();
  const tryAugment = (e: number, visited: Set<number>): boolean => {
    for (const pair of pairsFor[e]) {
      if (visited.has(pair)) continue;
      visited.add(pair);
      const current = owner.get(pair);
      if (current === undefined || tryAugment(current, visited)) { owner.set(pair, e); return true; }
    }
    return false;
  };
  const unmatched: number[] = [];
  for (let e = 0; e < model.exams.length; e++) if (pairsFor[e].length && !tryAugment(e, new Set())) unmatched.push(e);
  if (!unmatched.length) return [];

  // Exams reachable from an unmatched exam by alternating paths form a set
  // with more members than distinct pairs available to it (Hall's condition).
  const reached = new Set<number>(unmatched);
  const queue = [...unmatched];
  while (queue.length) {
    const e = queue.shift()!;
    for (const pair of pairsFor[e]) {
      const next = owner.get(pair);
      if (next !== undefined && !reached.has(next)) { reached.add(next); queue.push(next); }
    }
  }
  return [...reached].sort((a, b) => a - b);
}

export function runPreflight(input: SchedulingInput, model: SchedulingModel): PreflightResult {
  const diagnostics: Diagnostic[] = [];
  const slotIds = new Set(input.slots.map((slot) => slot.id));
  const examIds = new Set(input.exams.map((exam) => exam.id));
  const { graph } = model;

  // Data checks
  if (!input.exams.length) diagnostics.push({ code: "EMPTY_DATASET", severity: "error", kind: "data", message: "The dataset contains no examinations.", remediation: "Import subjects before running the scheduler." });
  if (!input.rooms.length) diagnostics.push({ code: "EMPTY_DATASET", severity: "error", kind: "data", message: "The dataset contains no rooms.", remediation: "Add examination rooms." });
  if (!input.slots.length) diagnostics.push({ code: "EMPTY_DATASET", severity: "error", kind: "data", message: "The dataset contains no time slots.", remediation: "Define examination time slots." });
  if (input.exams.length && !input.enrollments.length) diagnostics.push({ code: "EMPTY_DATASET", severity: "warning", kind: "data", message: "No student enrollments were found, so no student conflicts can be detected.", remediation: "Import student-subject enrollments." });

  for (const [label, ids, field] of [["examination", input.exams.map((e) => e.id), "examIds"], ["room", input.rooms.map((r) => r.id), "roomIds"], ["time slot", input.slots.map((s) => s.id), "slotIds"]] as const) {
    const dupes = duplicates(ids);
    if (dupes.length) diagnostics.push({ code: "DUPLICATE_IDENTIFIER", severity: "error", kind: "data", message: `${dupes.length} duplicate ${label} identifier${dupes.length > 1 ? "s" : ""}: ${dupes.join(", ")}.`, [field]: dupes, remediation: `Give every ${label} a unique identifier.` });
  }

  const pairKeys = input.enrollments.map((e) => `${e.studentId}|${e.examId}`);
  const duplicatePairs = pairKeys.length - new Set(pairKeys).size;
  if (duplicatePairs) diagnostics.push({ code: "DUPLICATE_IDENTIFIER", severity: "warning", kind: "data", message: `${duplicatePairs} duplicate student-exam enrollment record${duplicatePairs > 1 ? "s were" : " was"} ignored.`, remediation: "Remove duplicate enrollment rows." });

  const unknownEnrollmentExams = [...new Set(input.enrollments.filter((e) => !examIds.has(e.examId)).map((e) => e.examId))].sort();
  if (unknownEnrollmentExams.length) diagnostics.push({ code: "MISSING_REFERENCE", severity: "error", kind: "data", message: `Enrollments reference examinations that do not exist: ${unknownEnrollmentExams.join(", ")}.`, examIds: unknownEnrollmentExams, remediation: "Correct the subject codes on these enrollments or add the missing subjects." });

  for (const slot of input.slots) {
    if (!validIsoDate(slot.date) || !Number.isFinite(slot.startMinutes) || !Number.isFinite(slot.endMinutes) || slot.endMinutes <= slot.startMinutes) {
      diagnostics.push({ code: "INVALID_DATA", severity: "error", kind: "data", message: `Time slot ${slot.id} has an invalid date or time range.`, slotIds: [slot.id], remediation: "Use a valid date and an end time after the start time." });
    }
  }
  for (const room of input.rooms) {
    if (!(room.capacity > 0)) diagnostics.push({ code: "INVALID_DATA", severity: "error", kind: "data", message: `Room ${room.id} has a non-positive capacity.`, roomIds: [room.id], remediation: "Set the room's seating capacity." });
    const unknown = room.unavailableSlotIds.filter((id) => !slotIds.has(id));
    if (unknown.length) diagnostics.push({ code: "MISSING_REFERENCE", severity: "warning", kind: "data", message: `Room ${room.id} lists unknown unavailable slots (${unknown.join(", ")}); they were ignored.`, roomIds: [room.id], slotIds: unknown });
  }

  for (const exam of input.exams) {
    const e = model.examIndex.get(exam.id);
    if (!(exam.durationMinutes > 0)) diagnostics.push({ code: "INVALID_DATA", severity: "error", kind: "data", message: `${exam.id} has an invalid duration.`, examIds: [exam.id], remediation: "Set a positive examination duration." });
    if (exam.fixedSlotId && !slotIds.has(exam.fixedSlotId)) diagnostics.push({ code: "MISSING_REFERENCE", severity: "error", kind: "data", message: `${exam.id} is fixed to slot ${exam.fixedSlotId}, which does not exist.`, examIds: [exam.id], slotIds: [exam.fixedSlotId], remediation: "Point the fixed slot at an existing time slot or clear it." });
    const unknown = exam.unavailableSlotIds.filter((id) => !slotIds.has(id));
    if (unknown.length) diagnostics.push({ code: "MISSING_REFERENCE", severity: "warning", kind: "data", message: `${exam.id} lists unknown unavailable slots (${unknown.join(", ")}); they were ignored.`, examIds: [exam.id], slotIds: unknown });
    if (e !== undefined && input.enrollments.length) {
      const actual = graph.studentCount[e];
      if (actual === 0) diagnostics.push({ code: "ENROLLMENT_MISMATCH", severity: "warning", kind: "data", message: `${exam.id} has no enrolled students; it will still be scheduled.`, examIds: [exam.id] });
      else if (exam.declaredStudents && exam.declaredStudents !== actual) diagnostics.push({ code: "ENROLLMENT_MISMATCH", severity: "warning", kind: "data", message: `${exam.id} declares ${exam.declaredStudents} students but ${actual} are enrolled. The scheduler uses the actual enrollments.`, examIds: [exam.id], remediation: "Update the declared enrollment on the subject record." });
    }
  }

  const hasDataErrors = diagnostics.some((d) => d.kind === "data" && d.severity === "error");
  if (hasDataErrors) return { diagnostics, hasDataErrors, provenInfeasible: false };

  // Constraint checks: each finding below is a necessary condition, so it proves infeasibility.
  const blocked = new Set<number>();
  model.exams.forEach((exam, e) => {
    const students = graph.studentCount[e];
    const fixed = exam.fixedSlotId;
    if (fixed && exam.unavailableSlotIds.includes(fixed)) {
      diagnostics.push({ code: "FIXED_SLOT_CONFLICT", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Fixed slot", message: `${exam.id} is fixed to ${fixed} but is also marked unavailable in that slot.`, examIds: [exam.id], slotIds: [fixed], remediation: "Remove one of the two contradictory constraints." });
      blocked.add(e); return;
    }
    if (!model.candidateSlots[e].length) {
      const fixedSlot = fixed ? model.slots[model.slotIndex.get(fixed)!] : null;
      diagnostics.push(fixedSlot
        ? { code: "FIXED_SLOT_CONFLICT", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Duration fits slot", message: `${exam.id} lasts ${exam.durationMinutes} minutes but its fixed slot ${fixed} is only ${fixedSlot.endMinutes - fixedSlot.startMinutes} minutes long.`, examIds: [exam.id], slotIds: [fixed!], remediation: "Fix the exam to a longer slot or correct its duration." }
        : { code: "NO_AVAILABLE_TIME_SLOT", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Permissible slot", message: `${exam.id} has no permissible time slot: every slot is unavailable to it or too short for its ${exam.durationMinutes}-minute duration.`, examIds: [exam.id], remediation: "Relax the exam's unavailable slots or add a longer slot." });
      blocked.add(e); return;
    }
    if (!model.suitableRooms[e].length) {
      const ofType = model.rooms.filter((room) => room.roomType === exam.requiredRoomType);
      const lab = exam.requiredRoomType === "LAB";
      diagnostics.push({
        code: lab ? "LABORATORY_UNAVAILABLE" : "ROOM_CAPACITY_BOTTLENECK", severity: "error", kind: "constraint", provesInfeasible: true,
        constraint: lab ? "Laboratory requirement" : "Room capacity",
        message: !ofType.length
          ? `${exam.id} requires a ${lab ? "laboratory" : "theory room"}, but none exist.`
          : `${exam.id} has ${students} students, but the largest ${lab ? "laboratory" : "theory room"} seats ${Math.max(...ofType.map((room) => room.capacity))}.`,
        examIds: [exam.id], roomIds: ofType.map((room) => room.id),
        remediation: lab ? "Add or enlarge a laboratory for this practical exam." : "Add a larger venue. Splitting an exam across rooms is not supported by the current schema (one room per exam).",
      });
      blocked.add(e); return;
    }
    const anyPair = model.candidateSlots[e].some((s) => model.suitableRooms[e].some((r) => !model.roomUnavailable[r][s]));
    if (!anyPair) {
      const lab = exam.requiredRoomType === "LAB";
      diagnostics.push({ code: lab ? "LABORATORY_UNAVAILABLE" : "ROOM_CAPACITY_BOTTLENECK", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Room availability", message: `Every ${lab ? "laboratory" : "room"} large enough for ${exam.id} is unavailable in all of its permissible slots.`, examIds: [exam.id], roomIds: model.suitableRooms[e].map((r) => model.rooms[r].id), slotIds: model.candidateSlots[e].map((s) => model.slots[s].id), remediation: "Free a suitable room in one of the exam's permissible slots." });
      blocked.add(e);
    }
  });

  for (let a = 0; a < model.exams.length; a++) {
    for (const b of graph.adjacency[a]) {
      if (b <= a) continue;
      const fa = model.exams[a].fixedSlotId, fb = model.exams[b].fixedSlotId;
      if (!fa || !fb) continue;
      const sa = model.slotIndex.get(fa), sb = model.slotIndex.get(fb);
      if (sa !== undefined && sb !== undefined && model.slotOverlap[sa][sb]) {
        diagnostics.push({ code: "FIXED_SLOT_CONFLICT", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Fixed slot / student overlap", message: `${model.exams[a].id} and ${model.exams[b].id} are fixed to overlapping slots but share ${graph.shared[a][b]} student${graph.shared[a][b] > 1 ? "s" : ""}.`, examIds: [model.exams[a].id, model.exams[b].id], slotIds: [...new Set([fa, fb])], remediation: "Move one of the fixed slots, or confirm whether these students should sit both exams." });
      }
    }
  }

  if (!blocked.size) {
    const hallSet = roomSlotDeficiency(model);
    if (hallSet.length) {
      const lab = hallSet.every((e) => model.exams[e].requiredRoomType === "LAB");
      const pairs = new Set<number>();
      for (const e of hallSet) for (const s of model.candidateSlots[e]) for (const r of model.suitableRooms[e]) if (!model.roomUnavailable[r][s]) pairs.add(r * model.slots.length + s);
      diagnostics.push({
        code: lab ? "LABORATORY_UNAVAILABLE" : "ROOM_CAPACITY_BOTTLENECK", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Room-slot capacity",
        message: `${hallSet.length} examinations compete for only ${pairs.size} suitable room-slot combination${pairs.size === 1 ? "" : "s"}, before student conflicts are even considered.`,
        examIds: hallSet.map((e) => model.exams[e].id), remediation: lab ? "Add laboratory capacity or more slots." : "Add rooms or time slots, or relax unavailability.",
      });
    }

    const clique = greedyClique(graph, model.exams);
    const disjoint = maxDisjointSlots(model);
    if (clique.length > disjoint) {
      diagnostics.push({ code: "STUDENT_CONFLICT_BOTTLENECK", severity: "error", kind: "constraint", provesInfeasible: true, constraint: "Student overlap", message: `${clique.length} examinations all share students pairwise, so each needs its own slot, but only ${disjoint} non-overlapping slots exist.`, examIds: clique.map((e) => model.exams[e].id).sort(), remediation: "Add time slots or review the enrollments that link these exams." });
    }
  }

  return { diagnostics, hasDataErrors: false, provenInfeasible: diagnostics.some((d) => d.provesInfeasible) };
}
