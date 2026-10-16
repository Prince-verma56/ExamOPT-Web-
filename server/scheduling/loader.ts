import "server-only";

import { querySupabase } from "@/lib/supabase";
import type { RawDataset } from "./normalize";

export class SchedulingServiceError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500) {
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

/** Loads the canonical C10 tables. See docs/examopt/PHASE_2_DATA_AUDIT.md for the mapping. */
export async function loadRawDataset(): Promise<RawDataset> {
  const [rooms, timeslots, subjects, studentGroups, students, enrollments] = await Promise.all([
    fetchAllRows<RawDataset["rooms"][number]>("rooms", "room_id,name,capacity,room_type,unavailable_slots", "room_id.asc"),
    fetchAllRows<RawDataset["timeslots"][number]>("timeslots", "slot_id,day_number,exam_date,session,time_range", "slot_id.asc"),
    fetchAllRows<RawDataset["subjects"][number]>("subjects", "subject_id,name,program,semester,duration_hours,requires_lab,fixed_slot,unavailable_slots,enrolled_students", "subject_id.asc"),
    fetchAllRows<RawDataset["studentGroups"][number]>("student_groups", "group_id,program,semester,is_backlog_group", "group_id.asc"),
    fetchAllRows<RawDataset["students"][number]>("student_enrollments", "roll_no,group_id,has_backlog", "roll_no.asc"),
    fetchAllRows<RawDataset["enrollments"][number]>("student_subject_enrollments", "roll_no,subject_id", "id.asc"),
  ]);
  return { rooms, timeslots, subjects, studentGroups, students, enrollments };
}
