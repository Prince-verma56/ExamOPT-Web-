import type { Assignment, Invigilator, SchedulingInput, Slot } from "./domain";

/**
 * Invigilator allocation, ported from the reference `faculty_allocator.py`.
 *
 * One invigilator per examination, chosen after the exam schedule is final:
 * the faculty member must be free in every overlapping slot, not declared
 * unavailable in the slot, and below their duty cap. Among eligible faculty,
 * prefer the program's department (MCA -> MCA, BCA -> BCA, otherwise CSED),
 * then the fewest duties so far, then the faculty id.
 *
 * The reference processes exams in whatever order the solver produced them;
 * here they are processed chronologically (slot order, then exam id) so the
 * result depends only on the schedule, not on the algorithm's internal order.
 * An exam with no eligible faculty is left uncovered ("TBD" in the reference):
 * invigilation never changes whether the exam schedule itself is feasible.
 */

export interface InvigilatorDuty extends Assignment {
  facultyId: string | null;
}

export type InvigilationViolationCode = "INVIGILATOR_DOUBLE_BOOKED" | "INVIGILATOR_UNAVAILABLE" | "INVIGILATOR_OVERLOADED" | "UNKNOWN_INVIGILATOR";

export interface InvigilationViolation {
  code: InvigilationViolationCode;
  message: string;
  facultyIds: string[];
  examIds: string[];
  slotIds: string[];
}

export interface FacultyLoad {
  facultyId: string;
  name: string;
  department: string;
  duties: number;
  maxDuties: number;
}

export interface InvigilationReport {
  /** No allocated duty breaks an invigilation rule. Uncovered exams are reported separately. */
  valid: boolean;
  covered: number;
  total: number;
  coveragePct: number;
  uncoveredExamIds: string[];
  /** Duties given to a member of the program's preferred department. */
  departmentMatches: number;
  violations: InvigilationViolation[];
  load: FacultyLoad[];
}

/** Department preference used by the reference allocator. */
export function preferredDepartment(program: string) {
  const p = program.toUpperCase();
  return p === "MCA" ? "MCA" : p === "BCA" ? "BCA" : "CSED";
}

function overlaps(a: Slot, b: Slot) {
  return a.id === b.id || (a.date === b.date && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes);
}

function chronological(slots: Slot[]) {
  return [...slots].sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes || a.id.localeCompare(b.id));
}

export function allocateInvigilators(input: SchedulingInput, assignments: Assignment[]): InvigilatorDuty[] {
  const faculty = [...(input.invigilators ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const slots = new Map(input.slots.map((slot) => [slot.id, slot]));
  const position = new Map(chronological(input.slots).map((slot, i) => [slot.id, i]));
  const program = new Map(input.exams.map((exam) => [exam.id, exam.program]));
  const duties = new Map<string, number>();
  const busy = new Map<string, Slot[]>();

  const ordered = [...assignments].sort((a, b) => (position.get(a.slotId) ?? Infinity) - (position.get(b.slotId) ?? Infinity) || a.examId.localeCompare(b.examId));
  const result = new Map<string, string | null>();
  for (const assignment of ordered) {
    const slot = slots.get(assignment.slotId);
    if (!slot) { result.set(assignment.examId, null); continue; }
    const target = preferredDepartment(program.get(assignment.examId) ?? "");
    let best: { mismatch: number; load: number; f: Invigilator } | null = null;
    for (const f of faculty) {
      const load = duties.get(f.id) ?? 0;
      if (load >= f.maxDuties) continue;
      if (f.unavailableSlotIds.includes(slot.id)) continue;
      if ((busy.get(f.id) ?? []).some((other) => overlaps(other, slot))) continue;
      const mismatch = f.department.toUpperCase() === target ? 0 : 1;
      if (!best || mismatch < best.mismatch || (mismatch === best.mismatch && load < best.load)) best = { mismatch, load, f };
    }
    if (!best) { result.set(assignment.examId, null); continue; }
    duties.set(best.f.id, (duties.get(best.f.id) ?? 0) + 1);
    busy.set(best.f.id, [...(busy.get(best.f.id) ?? []), slot]);
    result.set(assignment.examId, best.f.id);
  }
  return assignments.map((a) => ({ ...a, facultyId: result.get(a.examId) ?? null }));
}

/**
 * Independent invigilation check. It recomputes everything from the raw input
 * and the duty list, so it also catches stored or hand-edited duties.
 */
export function validateInvigilation(input: SchedulingInput, duties: InvigilatorDuty[]): InvigilationReport {
  const faculty = new Map((input.invigilators ?? []).map((f) => [f.id, f]));
  const slots = new Map(input.slots.map((slot) => [slot.id, slot]));
  const program = new Map(input.exams.map((exam) => [exam.id, exam.program]));
  const violations: InvigilationViolation[] = [];
  const byFaculty = new Map<string, InvigilatorDuty[]>();
  let departmentMatches = 0;

  for (const duty of duties) {
    if (!duty.facultyId) continue;
    const f = faculty.get(duty.facultyId);
    if (!f) {
      violations.push({ code: "UNKNOWN_INVIGILATOR", message: `${duty.examId} is assigned to ${duty.facultyId}, who is not in the faculty roster.`, facultyIds: [duty.facultyId], examIds: [duty.examId], slotIds: [duty.slotId] });
      continue;
    }
    byFaculty.set(f.id, [...(byFaculty.get(f.id) ?? []), duty]);
    if (f.unavailableSlotIds.includes(duty.slotId)) {
      violations.push({ code: "INVIGILATOR_UNAVAILABLE", message: `${f.id} invigilates ${duty.examId} in ${duty.slotId} but is unavailable in that slot.`, facultyIds: [f.id], examIds: [duty.examId], slotIds: [duty.slotId] });
    }
    if (f.department.toUpperCase() === preferredDepartment(program.get(duty.examId) ?? "")) departmentMatches++;
  }

  for (const [facultyId, list] of byFaculty) {
    const f = faculty.get(facultyId)!;
    if (list.length > f.maxDuties) {
      violations.push({ code: "INVIGILATOR_OVERLOADED", message: `${facultyId} has ${list.length} duties but a cap of ${f.maxDuties}.`, facultyIds: [facultyId], examIds: list.map((d) => d.examId), slotIds: [...new Set(list.map((d) => d.slotId))] });
    }
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = slots.get(list[i].slotId), b = slots.get(list[j].slotId);
        if (a && b && overlaps(a, b)) {
          violations.push({ code: "INVIGILATOR_DOUBLE_BOOKED", message: `${facultyId} invigilates ${list[i].examId} (${a.id}) and ${list[j].examId} (${b.id}) at overlapping times.`, facultyIds: [facultyId], examIds: [list[i].examId, list[j].examId], slotIds: [...new Set([a.id, b.id])] });
        }
      }
    }
  }

  const covered = duties.filter((d) => d.facultyId).length;
  return {
    valid: violations.length === 0,
    covered, total: duties.length,
    coveragePct: duties.length ? Math.round((covered / duties.length) * 10_000) / 100 : 100,
    uncoveredExamIds: duties.filter((d) => !d.facultyId).map((d) => d.examId).sort(),
    departmentMatches,
    violations,
    load: [...faculty.values()].sort((a, b) => a.id.localeCompare(b.id)).map((f) => ({ facultyId: f.id, name: f.name, department: f.department, duties: byFaculty.get(f.id)?.length ?? 0, maxDuties: f.maxDuties })),
  };
}
