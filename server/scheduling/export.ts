import { stringify } from "csv-stringify/sync";

/**
 * CSV exports, ported from the reference `exporter.py`. Column names and sort
 * orders match the reference so existing spreadsheets keep working; the
 * invigilation sheet is new.
 */

export type ExportKind = "timetable" | "rooms" | "invigilation";

export interface ExportRow {
  examId: string;
  examName: string | null;
  program: string | null;
  semester: number | null;
  slotId: string;
  date: string | null;
  session: string | null;
  startMinutes: number | null;
  endMinutes: number | null;
  durationMinutes: number | null;
  roomId: string;
  roomName: string | null;
  roomCapacity: number | null;
  students: number | null;
  facultyId: string | null;
  facultyName: string | null;
  facultyDepartment: string | null;
}

/** Minutes after midnight to the reference's "09:30 AM" style. */
export function twelveHour(minutes: number | null) {
  if (minutes === null || !Number.isFinite(minutes)) return "";
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return `${String(((h + 11) % 12) + 1).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const timeRange = (row: ExportRow) => (row.startMinutes === null ? "" : `${twelveHour(row.startMinutes)} - ${twelveHour(row.endMinutes)}`);
const byKeys = <T,>(...keys: ((row: T) => string)[]) => (a: T, b: T) => {
  for (const key of keys) { const order = key(a).localeCompare(key(b)); if (order) return order; }
  return 0;
};

export function exportCsv(kind: ExportKind, rows: ExportRow[]): string {
  if (kind === "timetable") {
    return stringify([...rows].sort(byKeys((r) => r.date ?? "", (r) => r.slotId, (r) => r.roomId)).map((r) => ({
      exam_date: r.date ?? "", day_session: (r.session ?? "").toUpperCase(), slot_id: r.slotId, time_range: timeRange(r),
      subject_id: r.examId, subject_name: r.examName ?? "", program: r.program ?? "", semester: r.semester ?? "",
      room_id: r.roomId, room_name: r.roomName ?? "", room_capacity: r.roomCapacity ?? "",
      assigned_faculty_name: r.facultyName ?? "TBD", assigned_students: r.students ?? 0,
      duration_hours: r.durationMinutes === null ? "" : r.durationMinutes / 60,
    })), { header: true, columns: ["exam_date", "day_session", "slot_id", "time_range", "subject_id", "subject_name", "program", "semester", "room_id", "room_name", "room_capacity", "assigned_faculty_name", "assigned_students", "duration_hours"] });
  }
  if (kind === "rooms") {
    return stringify([...rows].sort(byKeys((r) => r.roomId, (r) => r.date ?? "", (r) => r.slotId)).map((r) => ({
      room_id: r.roomId, room_name: r.roomName ?? "", slot_id: r.slotId, exam_date: r.date ?? "", time_range: timeRange(r),
      subject_id: r.examId, enrolled_students: r.students ?? 0, room_capacity: r.roomCapacity ?? "",
      empty_seats: r.roomCapacity === null ? "" : Math.max(0, r.roomCapacity - (r.students ?? 0)),
    })), { header: true, columns: ["room_id", "room_name", "slot_id", "exam_date", "time_range", "subject_id", "enrolled_students", "room_capacity", "empty_seats"] });
  }
  return stringify([...rows].sort(byKeys((r) => r.facultyId ?? "~", (r) => r.date ?? "", (r) => r.slotId)).map((r) => ({
    faculty_id: r.facultyId ?? "TBD", faculty_name: r.facultyName ?? "TBD", department: r.facultyDepartment ?? "",
    exam_date: r.date ?? "", slot_id: r.slotId, time_range: timeRange(r), subject_id: r.examId, room_id: r.roomId,
  })), { header: true, columns: ["faculty_id", "faculty_name", "department", "exam_date", "slot_id", "time_range", "subject_id", "room_id"] });
}
