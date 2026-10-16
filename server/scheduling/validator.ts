import type { Assignment, SchedulingInput, Slot } from "./domain";

/**
 * Independent hard-constraint validator.
 *
 * Deliberately shares no code with the solvers (no model, no conflict graph,
 * no occupancy tracking): it recomputes everything from the raw input and the
 * final assignments, so a solver bug cannot hide behind shared structures.
 */

export type ViolationCode =
  | "MISSING_ASSIGNMENT"
  | "STUDENT_OVERLAP"
  | "ROOM_DOUBLE_BOOKED"
  | "ROOM_CAPACITY_EXCEEDED"
  | "ROOM_TYPE_MISMATCH"
  | "FIXED_SLOT_VIOLATED"
  | "EXAM_SLOT_UNAVAILABLE"
  | "ROOM_SLOT_UNAVAILABLE"
  | "DURATION_EXCEEDS_SLOT"
  | "UNKNOWN_REFERENCE"
  | "DUPLICATE_ASSIGNMENT";

export interface Violation {
  code: ViolationCode;
  rule: number;
  message: string;
  examIds: string[];
  roomIds: string[];
  slotIds: string[];
  /** Students affected (student overlap only). Identities are not exposed. */
  studentCount?: number;
  remediation: string;
}

export interface ValidationCheck {
  rule: number;
  label: string;
  passed: boolean;
  violations: number;
}

export interface ValidationReport {
  valid: boolean;
  violationCount: number;
  /** Violations other than missing assignments: constraint breaches in the assignments that exist. */
  placementViolationCount: number;
  violations: Violation[];
  checks: ValidationCheck[];
  checkedAssignments: number;
  checkedStudents: number;
}

export const VALIDATION_RULES: { rule: number; label: string; codes: ViolationCode[] }[] = [
  { rule: 1, label: "Every examination is assigned", codes: ["MISSING_ASSIGNMENT"] },
  { rule: 2, label: "No student sits overlapping examinations", codes: ["STUDENT_OVERLAP"] },
  { rule: 3, label: "No room hosts overlapping examinations", codes: ["ROOM_DOUBLE_BOOKED"] },
  { rule: 4, label: "Room capacity is not exceeded", codes: ["ROOM_CAPACITY_EXCEEDED"] },
  { rule: 5, label: "Laboratory / room-type requirements are met", codes: ["ROOM_TYPE_MISMATCH"] },
  { rule: 6, label: "Fixed time slots are respected", codes: ["FIXED_SLOT_VIOLATED"] },
  { rule: 7, label: "Unavailable slots are respected", codes: ["EXAM_SLOT_UNAVAILABLE", "ROOM_SLOT_UNAVAILABLE"] },
  { rule: 8, label: "Examination duration fits the slot", codes: ["DURATION_EXCEEDS_SLOT"] },
  { rule: 9, label: "All referenced records exist", codes: ["UNKNOWN_REFERENCE"] },
  { rule: 10, label: "Assignments are unique (one room per exam)", codes: ["DUPLICATE_ASSIGNMENT"] },
];

function overlaps(a: Slot, b: Slot) {
  return a.id === b.id || (a.date === b.date && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes);
}

export function validateSchedule(input: SchedulingInput, assignments: (Assignment & { id?: string })[]): ValidationReport {
  const violations: Violation[] = [];
  const add = (v: Omit<Violation, "rule">) => violations.push({ ...v, rule: VALIDATION_RULES.find((r) => r.codes.includes(v.code))!.rule });
  const exams = new Map(input.exams.map((exam) => [exam.id, exam]));
  const rooms = new Map(input.rooms.map((room) => [room.id, room]));
  const slots = new Map(input.slots.map((slot) => [slot.id, slot]));

  const students = new Map<string, Set<string>>();
  const examStudents = new Map<string, Set<string>>();
  for (const { studentId, examId } of input.enrollments) {
    if (!students.has(studentId)) students.set(studentId, new Set());
    students.get(studentId)!.add(examId);
    if (!examStudents.has(examId)) examStudents.set(examId, new Set());
    examStudents.get(examId)!.add(studentId);
  }

  // Rules 9 and 10: references and uniqueness.
  const valid: Assignment[] = [];
  const seenExam = new Map<string, number>();
  const seenId = new Set<string>();
  for (const assignment of assignments) {
    if (assignment.id !== undefined) {
      if (seenId.has(assignment.id)) add({ code: "DUPLICATE_ASSIGNMENT", message: `Assignment id ${assignment.id} is used more than once.`, examIds: [assignment.examId], roomIds: [], slotIds: [], remediation: "Regenerate assignment identifiers." });
      seenId.add(assignment.id);
    }
    const missing = [!exams.has(assignment.examId) && `exam ${assignment.examId}`, !slots.has(assignment.slotId) && `slot ${assignment.slotId}`, !rooms.has(assignment.roomId) && `room ${assignment.roomId}`].filter(Boolean);
    if (missing.length) {
      add({ code: "UNKNOWN_REFERENCE", message: `An assignment references ${missing.join(", ")}, which ${missing.length > 1 ? "do" : "does"} not exist in the current data.`, examIds: [assignment.examId], roomIds: [assignment.roomId], slotIds: [assignment.slotId], remediation: "Re-run the scheduler against the current dataset." });
      continue;
    }
    seenExam.set(assignment.examId, (seenExam.get(assignment.examId) ?? 0) + 1);
    valid.push(assignment);
  }
  for (const [examId, count] of seenExam) {
    if (count > 1) add({ code: "DUPLICATE_ASSIGNMENT", message: `${examId} is assigned ${count} times. The schema allows one room per examination.`, examIds: [examId], roomIds: valid.filter((a) => a.examId === examId).map((a) => a.roomId), slotIds: [], remediation: "Keep a single assignment per examination." });
  }

  // Rule 1: completeness.
  for (const exam of input.exams) {
    if (!seenExam.has(exam.id)) add({ code: "MISSING_ASSIGNMENT", message: `${exam.id} has no slot or room assignment.`, examIds: [exam.id], roomIds: [], slotIds: [], remediation: "Schedule this examination." });
  }

  // Rules 4-8: per-assignment checks.
  for (const { examId, slotId, roomId } of valid) {
    const exam = exams.get(examId)!, room = rooms.get(roomId)!, slot = slots.get(slotId)!;
    const enrolled = examStudents.get(examId)?.size ?? 0;
    if (enrolled > room.capacity) add({ code: "ROOM_CAPACITY_EXCEEDED", message: `${examId} has ${enrolled} students but ${roomId} seats ${room.capacity}.`, examIds: [examId], roomIds: [roomId], slotIds: [slotId], remediation: "Move the exam to a larger room." });
    if (room.roomType !== exam.requiredRoomType) add({ code: "ROOM_TYPE_MISMATCH", message: exam.requiredRoomType === "LAB" ? `${examId} requires a laboratory but was placed in theory room ${roomId}.` : `${examId} is a theory exam placed in laboratory ${roomId}; laboratories are reserved for practical exams.`, examIds: [examId], roomIds: [roomId], slotIds: [slotId], remediation: `Use a ${exam.requiredRoomType === "LAB" ? "laboratory" : "theory room"}.` });
    if (exam.fixedSlotId && exam.fixedSlotId !== slotId) add({ code: "FIXED_SLOT_VIOLATED", message: `${examId} must be held in ${exam.fixedSlotId} but was placed in ${slotId}.`, examIds: [examId], roomIds: [roomId], slotIds: [slotId, exam.fixedSlotId], remediation: "Move the exam to its fixed slot." });
    if (exam.unavailableSlotIds.includes(slotId)) add({ code: "EXAM_SLOT_UNAVAILABLE", message: `${examId} is not allowed in ${slotId}.`, examIds: [examId], roomIds: [roomId], slotIds: [slotId], remediation: "Move the exam to a permitted slot." });
    if (room.unavailableSlotIds.includes(slotId)) add({ code: "ROOM_SLOT_UNAVAILABLE", message: `${roomId} is unavailable in ${slotId} but hosts ${examId}.`, examIds: [examId], roomIds: [roomId], slotIds: [slotId], remediation: "Use a room that is available in this slot." });
    if (exam.durationMinutes > slot.endMinutes - slot.startMinutes) add({ code: "DURATION_EXCEEDS_SLOT", message: `${examId} lasts ${exam.durationMinutes} minutes but ${slotId} is ${slot.endMinutes - slot.startMinutes} minutes long.`, examIds: [examId], roomIds: [roomId], slotIds: [slotId], remediation: "Use a longer slot." });
  }

  // Rule 3: room double-booking.
  for (let i = 0; i < valid.length; i++) {
    for (let j = i + 1; j < valid.length; j++) {
      const a = valid[i], b = valid[j];
      if (a.roomId === b.roomId && overlaps(slots.get(a.slotId)!, slots.get(b.slotId)!)) {
        add({ code: "ROOM_DOUBLE_BOOKED", message: `${a.roomId} hosts both ${a.examId} (${a.slotId}) and ${b.examId} (${b.slotId}) at overlapping times.`, examIds: [a.examId, b.examId], roomIds: [a.roomId], slotIds: [...new Set([a.slotId, b.slotId])], remediation: "Move one exam to another room or slot." });
      }
    }
  }

  // Rule 2: student overlap, aggregated per exam pair.
  const placed = new Map<string, Slot[]>();
  for (const a of valid) placed.set(a.examId, [...(placed.get(a.examId) ?? []), slots.get(a.slotId)!]);
  const pairCounts = new Map<string, number>();
  for (const examIds of students.values()) {
    const list = [...examIds].filter((id) => placed.has(id)).sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (placed.get(list[i])!.some((x) => placed.get(list[j])!.some((y) => overlaps(x, y)))) {
          const key = `${list[i]}|${list[j]}`;
          pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }
  for (const [key, count] of [...pairCounts].sort(([a], [b]) => a.localeCompare(b))) {
    const [a, b] = key.split("|");
    add({ code: "STUDENT_OVERLAP", message: `${count} student${count > 1 ? "s are" : " is"} enrolled in both ${a} and ${b}, which are scheduled at overlapping times.`, examIds: [a, b], roomIds: [], slotIds: [...new Set([...placed.get(a)!, ...placed.get(b)!].map((s) => s.id))], studentCount: count, remediation: "Move one of the exams to a non-overlapping slot." });
  }

  const checks = VALIDATION_RULES.map(({ rule, label, codes }) => {
    const count = violations.filter((v) => codes.includes(v.code)).length;
    return { rule, label, passed: count === 0, violations: count };
  });
  violations.sort((a, b) => a.rule - b.rule);
  return {
    valid: violations.length === 0,
    violationCount: violations.length,
    placementViolationCount: violations.filter((v) => v.code !== "MISSING_ASSIGNMENT").length,
    violations, checks, checkedAssignments: assignments.length, checkedStudents: students.size,
  };
}
