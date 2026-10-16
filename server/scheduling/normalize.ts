import type { Enrollment, Exam, Invigilator, Room, SchedulingInput, Slot } from "./domain";

/**
 * Raw rows from the canonical C10 tables (see docs/examopt/PHASE_2_DATA_AUDIT.md).
 * Only the columns the scheduler reads are listed.
 */
export interface RawDataset {
  rooms: { room_id: string; name: string; capacity: number; room_type: string; unavailable_slots: string | null }[];
  timeslots: { slot_id: string; exam_date: string; session: string; time_range: string; day_number?: number }[];
  subjects: { subject_id: string; name: string; program: string; semester: number; duration_hours: number; requires_lab: boolean; fixed_slot: string | null; unavailable_slots: string | null; enrolled_students: number }[];
  studentGroups: { group_id: string; program: string; semester: number; is_backlog_group?: boolean }[];
  students: { roll_no: string; group_id: string; has_backlog?: boolean }[];
  enrollments: { roll_no: string; subject_id: string }[];
  /** Optional: invigilation is skipped when absent. */
  faculty?: { faculty_id: string; name: string; department: string; unavailable_slots: string | null; max_duties: number }[];
}

/** Splits a delimited slot list such as "D2-M", "D1-M|D4-E" or "D1-M, D3-E". */
export function parseSlotList(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(/[|,;\s]+/).map((part) => part.trim()).filter(Boolean))];
}

/** "09:30 AM", "2:00 pm" or "14:00" to minutes after midnight; NaN when unparseable. */
export function parseClock(value: string): number {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!match) return Number.NaN;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toUpperCase();
  if (minutes > 59 || hours > 23 || (meridiem && (hours < 1 || hours > 12))) return Number.NaN;
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function parseTimeRange(range: string): { start: number; end: number } {
  const [start = "", end = ""] = range.split(/\s+[-–]\s+|\s*[-–]\s*(?=\d)/);
  return { start: parseClock(start), end: parseClock(end) };
}

export function normalizeDataset(raw: RawDataset): SchedulingInput {
  const rooms: Room[] = raw.rooms.map((row) => ({
    id: row.room_id,
    name: row.name,
    capacity: Number(row.capacity),
    roomType: String(row.room_type).toUpperCase() === "LAB" ? "LAB" : "THEORY",
    unavailableSlotIds: parseSlotList(row.unavailable_slots),
  }));

  const slots: Slot[] = raw.timeslots.map((row) => {
    const { start, end } = parseTimeRange(row.time_range);
    const session = String(row.session).toLowerCase();
    return {
      id: row.slot_id,
      date: String(row.exam_date).slice(0, 10),
      startMinutes: start,
      endMinutes: end,
      session,
      label: `Day ${row.day_number ?? "?"} · ${session.charAt(0).toUpperCase()}${session.slice(1)}`,
    };
  });

  const exams: Exam[] = raw.subjects.map((row) => ({
    id: row.subject_id,
    subjectId: row.subject_id,
    name: row.name,
    program: row.program,
    semester: Number(row.semester),
    durationMinutes: Math.round(Number(row.duration_hours) * 60),
    declaredStudents: Number(row.enrolled_students) || 0,
    requiredRoomType: row.requires_lab ? "LAB" : "THEORY",
    fixedSlotId: row.fixed_slot || null,
    unavailableSlotIds: parseSlotList(row.unavailable_slots),
  }));

  const subjectById = new Map(raw.subjects.map((row) => [row.subject_id, row]));
  const groupById = new Map(raw.studentGroups.map((row) => [row.group_id, row]));
  const groupOfStudent = new Map(raw.students.map((row) => [row.roll_no, row.group_id]));
  const enrollments: Enrollment[] = raw.enrollments.map((row) => {
    const groupId = groupOfStudent.get(row.roll_no) ?? null;
    const group = groupId ? groupById.get(groupId) : undefined;
    const subject = subjectById.get(row.subject_id);
    // A backlog/bridge enrollment is an exam outside the student's own program or semester.
    const isBacklog = Boolean(group && subject && (subject.program !== group.program || Number(subject.semester) < Number(group.semester)));
    return { studentId: row.roll_no, examId: row.subject_id, groupId, isBacklog };
  });

  const invigilators: Invigilator[] | undefined = raw.faculty?.map((row) => ({
    id: row.faculty_id,
    name: row.name,
    department: String(row.department ?? "").toUpperCase(),
    unavailableSlotIds: parseSlotList(row.unavailable_slots),
    maxDuties: Math.max(0, Number(row.max_duties) || 0),
  }));

  return { exams, rooms, slots, enrollments, ...(invigilators ? { invigilators } : {}) };
}
