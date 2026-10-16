import type { Assignment, Enrollment, Exam, Room, RoomType, SchedulingInput, Slot } from "./domain";
import { parseClock } from "./normalize";

/**
 * Deterministic synthetic datasets for the Test Lab and Vitest. They are
 * built in memory and never touch the working database.
 */

export function slot(id: string, date: string, start = "09:30", end = "12:30"): Slot {
  const startMinutes = parseClock(start);
  return { id, date, startMinutes, endMinutes: parseClock(end), session: startMinutes < 12 * 60 ? "morning" : "evening", label: id };
}

export function exam(id: string, options: Partial<Exam> = {}): Exam {
  return { id, subjectId: id, name: id, program: "BCA", semester: 1, durationMinutes: 180, declaredStudents: 0, requiredRoomType: "THEORY", fixedSlotId: null, unavailableSlotIds: [], ...options };
}

export function room(id: string, capacity: number, roomType: RoomType = "THEORY", unavailableSlotIds: string[] = []): Room {
  return { id, name: id, capacity, roomType, unavailableSlotIds };
}

/** `count` students with ids `${prefix}-001…`, each enrolled in every exam listed. */
export function cohort(prefix: string, count: number, examIds: string[], backlogExamIds: string[] = []): Enrollment[] {
  const rows: Enrollment[] = [];
  for (let i = 1; i <= count; i++) {
    const studentId = `${prefix}-${String(i).padStart(3, "0")}`;
    for (const examId of examIds) rows.push({ studentId, examId, groupId: prefix, isBacklog: backlogExamIds.includes(examId) });
  }
  return rows;
}

/** Two days × two sessions, three theory rooms, two laboratories, three cohorts. */
export function campusMini(): SchedulingInput {
  return {
    slots: [slot("D1-M", "2026-11-02"), slot("D1-E", "2026-11-02", "14:00", "17:00"), slot("D2-M", "2026-11-03"), slot("D2-E", "2026-11-03", "14:00", "17:00"), slot("D3-M", "2026-11-04"), slot("D3-E", "2026-11-04", "14:00", "17:00")],
    rooms: [room("R-060", 60), room("R-080", 80), room("R-120", 120), room("LAB-80", 80, "LAB"), room("LAB-50", 50, "LAB", ["D1-M"])],
    exams: [
      exam("BCA-101"), exam("BCA-102", { unavailableSlotIds: ["D2-M"] }), exam("BCA-103P", { requiredRoomType: "LAB", durationMinutes: 120 }),
      exam("BCA-301", { semester: 3 }), exam("BCA-302", { semester: 3, fixedSlotId: "D2-E" }),
      exam("MCA-101", { program: "MCA" }), exam("MCA-102P", { program: "MCA", requiredRoomType: "LAB", durationMinutes: 120 }),
    ],
    enrollments: [
      ...cohort("BCA1", 40, ["BCA-101", "BCA-102", "BCA-103P"]),
      ...cohort("BCA3", 50, ["BCA-301", "BCA-302"]),
      ...cohort("BCA3-BL", 6, ["BCA-301", "BCA-302", "BCA-101"], ["BCA-101"]),
      ...cohort("MCA1", 60, ["MCA-101", "MCA-102P"]),
    ],
  };
}

/**
 * The Test Lab's tampered copy of a valid `campusMini()` schedule, used by the
 * `independent-validation` case and the Demo Studio's combined scenario.
 * Returns a new array; the input is not modified.
 */
export function tamperCampusMiniSchedule(assignments: Assignment[]): Assignment[] {
  const tampered = assignments.map((a) => ({ examId: a.examId, slotId: a.slotId, roomId: a.roomId }));
  const at = (id: string) => {
    const found = tampered.find((a) => a.examId === id);
    if (!found) throw new Error(`The campusMini schedule has no assignment for ${id}.`);
    return found;
  };
  // Same slot and room as BCA-101, with which it shares 40 students.
  at("BCA-102").slotId = at("BCA-101").slotId;
  at("BCA-102").roomId = at("BCA-101").roomId;
  // 60 students in a 50-seat laboratory.
  at("MCA-102P").roomId = "LAB-50";
  // A second assignment for an exam that is already placed.
  tampered.push({ examId: "BCA-301", slotId: "D3-E", roomId: "R-120" });
  return tampered;
}

/** Five exams whose conflicts form an odd cycle, with only two slots: not 2-colourable, yet no simple bound detects it. */
export function oddCycle(): SchedulingInput {
  const ids = ["C-1", "C-2", "C-3", "C-4", "C-5"];
  return {
    slots: [slot("S1", "2026-11-02"), slot("S2", "2026-11-03")],
    rooms: [room("R1", 60), room("R2", 60), room("R3", 60)],
    exams: ids.map((id) => exam(id)),
    enrollments: ids.flatMap((id, i) => cohort(`P${i + 1}`, 5, [id, ids[(i + 1) % ids.length]])),
  };
}

/** Twelve exams in six conflicting pairs across six slots: easy, but larger than a five-node budget. */
export function pairedTwelve(): SchedulingInput {
  const ids = Array.from({ length: 12 }, (_, i) => `E-${String(i + 1).padStart(2, "0")}`);
  return {
    slots: Array.from({ length: 6 }, (_, i) => slot(`S${i + 1}`, `2026-11-0${i + 1}`)),
    rooms: [room("R1", 80), room("R2", 80)],
    exams: ids.map((id) => exam(id)),
    enrollments: Array.from({ length: 6 }, (_, i) => cohort(`G${i + 1}`, 30, [ids[2 * i], ids[2 * i + 1]])).flat(),
  };
}
