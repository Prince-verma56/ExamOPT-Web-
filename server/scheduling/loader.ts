import "server-only";

import { querySupabase } from "@/lib/supabase";
import type { RawDataset } from "./normalize";

export class SchedulingServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500, public readonly details?: unknown) {
    super(message);
  }
}

const PAGE_SIZE = 1000;

/** Reads every row of a table, paging past PostgREST's default 1,000-row cap. */
export async function fetchAllRows<T>(table: string, select: string, order: string, filters: Record<string, string> = {}): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const result = await querySupabase<T[]>(table, { useServiceRole: true, query: { ...filters, select, order, limit: String(PAGE_SIZE), offset: String(offset) } });
    if (result.error || !result.data) {
      throw new SchedulingServiceError("DATA_SOURCE_UNAVAILABLE", `Could not read ${table} from the database.`, 503);
    }
    rows.push(...result.data);
    if (result.data.length < PAGE_SIZE) return rows;
  }
}

/** The canonical tables plus the extra columns the data quality report reads. */
export type LoadedDataset = RawDataset & {
  faculty: NonNullable<RawDataset["faculty"]>;
  studentGroups: (RawDataset["studentGroups"][number] & { name: string; student_count: number })[];
  students: (RawDataset["students"][number] & { enrolled_subject_ids: string })[];
};

/** Loads the canonical C10 tables. See docs/examopt/PHASE_2_DATA_AUDIT.md for the mapping. */
export async function loadRawDataset(): Promise<LoadedDataset> {
  const [rooms, timeslots, subjects, studentGroups, students, enrollments, faculty] = await Promise.all([
    fetchAllRows<RawDataset["rooms"][number]>("rooms", "room_id,name,capacity,room_type,unavailable_slots", "room_id.asc"),
    fetchAllRows<RawDataset["timeslots"][number]>("timeslots", "slot_id,day_number,exam_date,session,time_range", "slot_id.asc"),
    fetchAllRows<RawDataset["subjects"][number]>("subjects", "subject_id,name,program,semester,duration_hours,requires_lab,fixed_slot,unavailable_slots,enrolled_students", "subject_id.asc"),
    fetchAllRows<LoadedDataset["studentGroups"][number]>("student_groups", "group_id,name,program,semester,is_backlog_group,student_count", "group_id.asc"),
    fetchAllRows<LoadedDataset["students"][number]>("student_enrollments", "roll_no,group_id,has_backlog,enrolled_subject_ids", "roll_no.asc"),
    fetchAllRows<RawDataset["enrollments"][number]>("student_subject_enrollments", "roll_no,subject_id", "id.asc"),
    fetchAllRows<LoadedDataset["faculty"][number]>("faculty", "faculty_id,name,department,unavailable_slots,max_duties", "faculty_id.asc"),
  ]);
  return { rooms, timeslots, subjects, studentGroups, students, enrollments, faculty };
}

export interface StudentRecord {
  rollNo: string;
  name: string;
  groupId: string;
  groupName: string | null;
  program: string | null;
  semester: number | null;
  hasBacklog: boolean;
  subjectIds: string[];
}

/** One student's record and enrollments, or null when the roll number does not exist. */
export async function loadStudent(rollNo: string): Promise<StudentRecord | null> {
  const student = await querySupabase<{ roll_no: string; student_name: string; group_id: string; has_backlog: boolean }[]>("student_enrollments", {
    useServiceRole: true, query: { select: "roll_no,student_name,group_id,has_backlog", roll_no: `eq.${rollNo}`, limit: "1" },
  });
  if (student.error) throw new SchedulingServiceError("DATA_SOURCE_UNAVAILABLE", "Could not read the student record.", 503);
  const row = student.data?.[0];
  if (!row) return null;
  const [subjects, group] = await Promise.all([
    fetchAllRows<{ subject_id: string }>("student_subject_enrollments", "subject_id", "subject_id.asc", { roll_no: `eq.${rollNo}` }),
    querySupabase<{ name: string; program: string; semester: number }[]>("student_groups", { useServiceRole: true, query: { select: "name,program,semester", group_id: `eq.${row.group_id}`, limit: "1" } }),
  ]);
  const g = group.data?.[0];
  return {
    rollNo: row.roll_no, name: row.student_name, groupId: row.group_id, groupName: g?.name ?? null, program: g?.program ?? null, semester: g?.semester ?? null,
    hasBacklog: Boolean(row.has_backlog), subjectIds: subjects.map((s) => s.subject_id),
  };
}
