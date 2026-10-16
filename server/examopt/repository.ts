import "server-only";

import { querySupabase } from "@/lib/supabase";
import { twelveHour } from "@/server/scheduling/export";
import { fetchAllRows } from "@/server/scheduling/loader";
import { parseClock } from "@/server/scheduling/normalize";

type Row = Record<string, unknown>;
type Pagination = { page: number; limit: number; total: number; pages: number };
type ListInput = { page: number; limit: number; search?: string };

export class ExamOptRepositoryError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500) {
    super(message);
  }
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function numberValue(value: unknown) {
  const valueAsNumber = Number(value);
  return Number.isFinite(valueAsNumber) ? valueAsNumber : 0;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function page<T>(rows: T[], input: ListInput): { items: T[]; pagination: Pagination } {
  const total = rows.length;
  return {
    items: rows.slice((input.page - 1) * input.limit, input.page * input.limit),
    pagination: { page: input.page, limit: input.limit, total, pages: Math.max(1, Math.ceil(total / input.limit)) },
  };
}

async function query<T>(
  table: string,
  options: Parameters<typeof querySupabase<T>>[1] = {},
): Promise<{ data: T; count?: number }> {
  const result = await querySupabase<T>(table, { ...options, useServiceRole: true });
  if (result.error) {
    const tableFallbacks: Record<string, string> = {
      rooms: "exam_rooms",
      exam_rooms: "rooms",
      timeslots: "time_slots",
      time_slots: "timeslots",
      scheduling_runs: "schedule_runs",
      schedule_runs: "scheduling_runs",
      students: "student_enrollments",
      enrollments: "student_subject_enrollments",
    };
    if (tableFallbacks[table]) {
      const fallbackResult = await querySupabase<T>(tableFallbacks[table], { ...options, useServiceRole: true });
      if (!fallbackResult.error) {
        return { data: fallbackResult.data as T, count: fallbackResult.count };
      }
    }
    const method = options.method ?? "GET";
    const writing = method !== "GET";
    const detail = result.error.message;
    if (/\(409\)|duplicate key|23505/.test(detail)) {
      throw new ExamOptRepositoryError("CONFLICT", "A record with this identifier already exists.", 409);
    }
    if (/23514|check constraint/.test(detail)) {
      throw new ExamOptRepositoryError("VALIDATION_ERROR", "The database rejected a value outside its allowed range.", 400);
    }
    if (/23503|foreign key/.test(detail)) {
      throw new ExamOptRepositoryError("REFERENCED_RESOURCE", "This record is referenced by another scheduling record.", 409);
    }
    // Never turn a failed database request into an empty workspace table. The
    // frontend can surface a retryable error instead of implying there is no data.
    throw new ExamOptRepositoryError(
      writing ? "PERSISTENCE_FAILED" : "DATA_SOURCE_UNAVAILABLE",
      writing ? `Could not save ${table}.` : `Could not read ${table} from the scheduling data source.`,
      writing ? 502 : 503,
    );
  }
  return { data: result.data as T, count: result.count };
}

function roomDto(row: Row) {
  const code = stringValue(row.room_id || row.code || row.id);
  const roomTypeRaw = stringValue(row.room_type || "THEORY").toLowerCase();
  return {
    id: stringValue(row.id || row.room_id || code),
    code,
    name: stringValue(row.name),
    building: stringValue(row.building) || "AB-XI CSED Block",
    capacity: numberValue(row.capacity),
    roomType: roomTypeRaw.includes("lab") ? "lab" : "standard",
    facilities: (row.facilities ?? {}) as Row,
    isActive: booleanValue(row.is_active, true),
    _count: { unavailabilities: 0 },
  };
}

/** Reads that must not silently fall back to an empty result. */
async function mustRead<T>(table: string, queryParams: Record<string, string>): Promise<T> {
  const result = await querySupabase<T>(table, { useServiceRole: true, query: queryParams });
  if (result.error || result.data === null) throw new ExamOptRepositoryError("DATA_SOURCE_UNAVAILABLE", `Could not read ${table}.`, 503);
  return result.data;
}

/** Writes surface database errors instead of reporting success. */
async function mustWrite<T>(table: string, method: "POST" | "PATCH" | "DELETE", options: { body?: unknown; query?: Record<string, string> }): Promise<T | null> {
  const result = await querySupabase<T>(table, { method, useServiceRole: true, ...options });
  if (result.error) {
    const text = result.error.message;
    if (/\(409\)|duplicate key|23505/.test(text)) throw new ExamOptRepositoryError("CONFLICT", "A record with this identifier (or date and session) already exists.", 409);
    if (/23514|check constraint/.test(text)) throw new ExamOptRepositoryError("VALIDATION_ERROR", "The database rejected a value outside its allowed range.", 400);
    if (/23503|foreign key/.test(text)) throw new ExamOptRepositoryError("REFERENCED_RESOURCE", "This record is referenced by other records.", 409);
    throw new ExamOptRepositoryError("PERSISTENCE_FAILED", `Could not write to ${table}.`, 502);
  }
  return result.data;
}

async function assertUnreferenced(checks: [table: string, column: string, id: string, reason: string][]) {
  for (const [table, column, id, reason] of checks) {
    const rows = await mustRead<Row[]>(table, { select: column, [column]: `eq.${id}`, limit: "1" });
    if (rows.length) throw new ExamOptRepositoryError("REFERENCED_RESOURCE", `Cannot remove ${id}: ${reason}. Removing it would also delete their saved assignments.`, 409);
  }
}

const clockMinutes = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

const hhmm = (minutes: number) => (Number.isFinite(minutes) ? `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}` : "");

/** Canonical `timeslots` row to the workspace shape. Times are 24-hour "HH:MM" so they round-trip through time inputs. */
function slotDto(row: Row) {
  const [start = "", end = ""] = stringValue(row.time_range).split(/\s+-\s+/);
  return {
    id: stringValue(row.slot_id),
    date: stringValue(row.exam_date).slice(0, 10),
    startTime: hhmm(parseClock(start)),
    endTime: hhmm(parseClock(end)),
    session: stringValue(row.session).toLowerCase() === "morning" ? "morning" : "evening",
    label: stringValue(row.slot_id),
    dayNumber: numberValue(row.day_number),
  };
}

function subjectDto(row: Row) {
  return {
    id: stringValue(row.subject_id), code: stringValue(row.subject_id), name: stringValue(row.name),
    program: stringValue(row.program), semester: numberValue(row.semester),
    durationMinutes: Math.round(numberValue(row.duration_hours) * 60),
    examType: booleanValue(row.requires_lab) ? "practical" : "theory",
    requiresLab: booleanValue(row.requires_lab), isActive: true, fixedSlotId: stringValue(row.fixed_slot) || null,
    _count: { enrollments: numberValue(row.enrolled_students), constraints: 0 },
  };
}

function groupDto(row: Row) {
  return {
    id: stringValue(row.group_id), code: stringValue(row.group_id), name: stringValue(row.name),
    program: stringValue(row.program), semester: numberValue(row.semester), strength: numberValue(row.student_count),
    _count: { students: numberValue(row.student_count) },
  };
}

function matchSearch(row: Row, search: string | undefined, keys: string[]) {
  if (!search) return true;
  const needle = search.toLowerCase();
  return keys.some((key) => stringValue(row[key]).toLowerCase().includes(needle));
}

export const examOptRepository = {
  /**
   * Connectivity probe for the same Supabase REST path used by the scheduling
   * workspace. It intentionally reads one harmless row and never leaks
   * provider credentials or upstream error bodies.
   */
  async health() {
    try {
      await query<Row[]>("rooms", { query: { select: "room_id", limit: "1" } });
      return { connected: true, source: "supabase-rest" as const };
    } catch (error) {
      return {
        connected: false,
        source: "supabase-rest" as const,
        code: error instanceof ExamOptRepositoryError ? error.code : "DATA_SOURCE_UNAVAILABLE",
      };
    }
  },

  async listRooms(input: ListInput & { roomType?: string; isActive?: string }) {
    const { data } = await query<Row[]>("rooms", { query: { select: "*" } });
    const filtered = data.filter((row) =>
      matchSearch(row, input.search, ["room_id", "code", "name", "building"]) &&
      (!input.roomType || stringValue(row.room_type).toLowerCase() === input.roomType.toLowerCase()) &&
      (!input.isActive || booleanValue(row.is_active, true) === (input.isActive === "true")),
    ).map(roomDto);
    const result = page(filtered, input);
    return { rooms: result.items, pagination: result.pagination };
  },

  async createRoom(input: { code: string; name: string; building?: string; capacity: number; roomType: string; facilities?: Row }) {
    const { data } = await query<Row[]>("rooms", { method: "POST", body: {
      room_id: input.code.toUpperCase(), name: input.name, building: input.building || "AB-XI CSED Block", capacity: input.capacity,
      room_type: input.roomType.toUpperCase() === "LAB" ? "LAB" : "THEORY", unavailable_slots: "",
    } });
    return roomDto(data[0]);
  },

  async updateRoom(id: string, input: Partial<{ name: string; building: string; capacity: number; roomType: string; facilities: Row; isActive: boolean }>) {
    const body: Row = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.building !== undefined) body.building = input.building || null;
    if (input.capacity !== undefined) body.capacity = input.capacity;
    if (input.roomType !== undefined) body.room_type = input.roomType.toUpperCase() === "LAB" ? "LAB" : "THEORY";
    const { data } = await query<Row[]>("rooms", { method: "PATCH", query: { room_id: `eq.${id}` }, body });
    if (!data[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Room not found.", 404);
    return roomDto(data[0]);
  },

  /**
   * `rooms` has no active flag, and deleting a room cascades to the saved
   * assignments of every run that used it. So removal is refused while any
   * run references the room.
   */
  async deactivateRoom(id: string) {
    await assertUnreferenced([["scheduled_exams", "room_id", id, "saved scheduling runs use this room"]]);
    const result = await mustWrite<Row[]>("rooms", "DELETE", { query: { room_id: `eq.${id}` } });
    if (!result?.[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Room not found.", 404);
  },

  async listSlots(input: ListInput & { session?: string; isAvailable?: string; dateFrom?: string; dateTo?: string }) {
    const { data } = await query<Row[]>("timeslots", { query: { select: "*" } });
    const filtered = data.filter((row) =>
      (!input.session || stringValue(row.session).toLowerCase() === input.session.toLowerCase()) &&
      (!input.isAvailable || booleanValue(row.is_available, true) === (input.isAvailable === "true")) &&
      (!input.dateFrom || stringValue(row.exam_date || row.date) >= input.dateFrom) &&
      (!input.dateTo || stringValue(row.exam_date || row.date) <= input.dateTo),
    ).map(slotDto);
    const result = page(filtered, input);
    return { slots: result.items, pagination: result.pagination };
  },

  /**
   * Writes the canonical `timeslots` table, which the scheduler reads. (It
   * previously wrote the unused Prisma-family `time_slots` table, so new slots
   * never reached the engine.) The table stores MORNING/EVENING sessions, a
   * 1-14 day number and a "09:30 AM - 12:30 PM" range.
   */
  async createSlot(input: { date: string; startTime: string; endTime: string; session: string; label?: string }) {
    const existing = await mustRead<Row[]>("timeslots", { select: "slot_id,exam_date,day_number,session" });
    const session = input.session.toUpperCase();
    const sameDate = existing.find((row) => stringValue(row.exam_date).slice(0, 10) === input.date);
    const dayNumber = sameDate ? numberValue(sameDate.day_number) : new Set(existing.map((row) => stringValue(row.exam_date).slice(0, 10)).filter((d) => d < input.date)).size + 1;
    if (dayNumber > 14) throw new ExamOptRepositoryError("VALIDATION_ERROR", "The examination window allows at most 14 days.", 400);
    const slotId = (input.label?.trim() || `D${dayNumber}-${session === "MORNING" ? "M" : "E"}`).toUpperCase();
    if (!/^[A-Z0-9-]{1,20}$/.test(slotId)) throw new ExamOptRepositoryError("VALIDATION_ERROR", "Slot ids use letters, digits and dashes (at most 20).", 400);
    const data = await mustWrite<Row[]>("timeslots", "POST", { body: {
      slot_id: slotId, day_number: dayNumber, exam_date: input.date, session, time_range: `${twelveHour(clockMinutes(input.startTime))} - ${twelveHour(clockMinutes(input.endTime))}`,
    } });
    return slotDto(data![0]);
  },

  async updateSlot(id: string, input: Partial<{ date: string; startTime: string; endTime: string; session: string }>) {
    const current = (await mustRead<Row[]>("timeslots", { select: "*", slot_id: `eq.${id}`, limit: "1" }))[0];
    if (!current) throw new ExamOptRepositoryError("NOT_FOUND", "Time slot not found.", 404);
    const before = slotDto(current);
    const body: Row = {};
    if (input.date !== undefined) body.exam_date = input.date;
    if (input.session !== undefined) body.session = input.session.toUpperCase();
    if (input.startTime !== undefined || input.endTime !== undefined) {
      const start = input.startTime ? clockMinutes(input.startTime) : parseClock(before.startTime);
      const end = input.endTime ? clockMinutes(input.endTime) : parseClock(before.endTime);
      if (!(end > start)) throw new ExamOptRepositoryError("VALIDATION_ERROR", "End time must be after start time.", 400);
      body.time_range = `${twelveHour(start)} - ${twelveHour(end)}`;
    }
    const data = await mustWrite<Row[]>("timeslots", "PATCH", { query: { slot_id: `eq.${id}` }, body });
    if (!data?.[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Time slot not found.", 404);
    return slotDto(data[0]);
  },

  /** Deleting a slot cascades to saved assignments, so it is refused while runs or fixed-slot subjects reference it. */
  async deactivateSlot(id: string) {
    await assertUnreferenced([
      ["scheduled_exams", "slot_id", id, "saved scheduling runs use this slot"],
      ["subjects", "fixed_slot", id, "a subject is fixed to this slot"],
    ]);
    const data = await mustWrite<Row[]>("timeslots", "DELETE", { query: { slot_id: `eq.${id}` } });
    if (!data?.[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Time slot not found.", 404);
  },

  async listSubjects(input: ListInput & { program?: string; semester?: number; requiresLab?: string }) {
    const { data } = await query<Row[]>("subjects", { query: { select: "*", order: "program.asc,semester.asc,subject_id.asc" } });
    const filtered = data.filter((row) =>
      matchSearch(row, input.search, ["subject_id", "name"]) &&
      (!input.program || row.program === input.program) &&
      (!input.semester || numberValue(row.semester) === input.semester) &&
      (!input.requiresLab || booleanValue(row.requires_lab) === (input.requiresLab === "true")),
    ).map(subjectDto);
    const result = page(filtered, input);
    return { subjects: result.items, pagination: result.pagination };
  },

  async createSubject(input: { code: string; name: string; program: string; semester: number; durationMinutes: number; examType: string; requiresLab: boolean }) {
    const { data } = await query<Row[]>("subjects", { method: "POST", body: {
      subject_id: input.code.toUpperCase(), name: input.name, program: input.program, semester: input.semester,
      duration_hours: input.durationMinutes / 60, requires_lab: input.requiresLab || input.examType === "practical",
      unavailable_slots: "", enrolled_students: 0,
    } });
    return subjectDto(data[0]);
  },

  async updateSubject(id: string, input: Partial<{ name: string; program: string; semester: number; durationMinutes: number; examType: string; requiresLab: boolean }>) {
    const body: Row = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.program !== undefined) body.program = input.program;
    if (input.semester !== undefined) body.semester = input.semester;
    if (input.durationMinutes !== undefined) body.duration_hours = input.durationMinutes / 60;
    if (input.requiresLab !== undefined || input.examType !== undefined) body.requires_lab = input.requiresLab ?? input.examType === "practical";
    const { data } = await query<Row[]>("subjects", { method: "PATCH", query: { subject_id: `eq.${id}` }, body });
    if (!data[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Subject not found.", 404);
    return subjectDto(data[0]);
  },

  async deleteSubject(id: string) {
    const [legacyLinks, normalizedLinks] = await Promise.all([
      query<Row[]>("student_subject_enrollments", { query: { select: "id", subject_id: `eq.${id}`, limit: "1" } }),
      query<Row[]>("enrollments", { query: { select: "id", subject_id: `eq.${id}`, limit: "1" } }),
    ]);
    if (legacyLinks.data.length || normalizedLinks.data.length) {
      throw new ExamOptRepositoryError("REFERENCED_RESOURCE", "This subject has enrollment records and cannot be deleted.", 409);
    }
    const { data } = await query<Row[]>("subjects", { method: "DELETE", query: { subject_id: `eq.${id}` } });
    if (!data[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Subject not found.", 404);
  },

  async listGroups(input: ListInput & { program?: string; semester?: number }) {
    const { data } = await query<Row[]>("student_groups", { query: { select: "*", order: "program.asc,semester.asc,group_id.asc" } });
    const filtered = data.filter((row) =>
      matchSearch(row, input.search, ["group_id", "name"]) &&
      (!input.program || row.program === input.program) &&
      (!input.semester || numberValue(row.semester) === input.semester),
    ).map(groupDto);
    const result = page(filtered, input);
    return { groups: result.items, pagination: result.pagination };
  },

  async createGroup(input: { code: string; name: string; program: string; semester: number; strength: number }) {
    const { data } = await query<Row[]>("student_groups", { method: "POST", body: {
      group_id: input.code.toUpperCase(), name: input.name, program: input.program, semester: input.semester,
      student_count: input.strength, is_backlog_group: false,
    } });
    return groupDto(data[0]);
  },

  async updateGroup(id: string, input: Partial<{ name: string; program: string; semester: number; strength: number }>) {
    const body: Row = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.program !== undefined) body.program = input.program;
    if (input.semester !== undefined) body.semester = input.semester;
    if (input.strength !== undefined) body.student_count = input.strength;
    const { data } = await query<Row[]>("student_groups", { method: "PATCH", query: { group_id: `eq.${id}` }, body });
    if (!data[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Student group not found.", 404);
    return groupDto(data[0]);
  },

  async deleteGroup(id: string) {
    const [snapshotLinks, normalizedLinks] = await Promise.all([
      query<Row[]>("student_enrollments", { query: { select: "roll_no", group_id: `eq.${id}`, limit: "1" } }),
      query<Row[]>("students", { query: { select: "id", group_id: `eq.${id}`, limit: "1" } }),
    ]);
    if (snapshotLinks.data.length || normalizedLinks.data.length) {
      throw new ExamOptRepositoryError("REFERENCED_RESOURCE", "This group has student records and cannot be deleted.", 409);
    }
    const { data } = await query<Row[]>("student_groups", { method: "DELETE", query: { group_id: `eq.${id}` } });
    if (!data[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Student group not found.", 404);
  },

  /**
   * Live counts from the canonical tables. A failed read is an error, never a
   * made-up number (this previously fell back to constants such as 15 rooms).
   */
  async counts() {
    const [rooms, slots, subjects, groups, students, backlogStudents, enrollments, runs, published, faculty] = await Promise.all([
      mustRead<Row[]>("rooms", { select: "capacity,room_type,unavailable_slots" }),
      mustRead<Row[]>("timeslots", { select: "slot_id,exam_date" }),
      mustRead<Row[]>("subjects", { select: "fixed_slot,unavailable_slots" }),
      countRows("student_groups"),
      countRows("student_enrollments"),
      countRows("student_enrollments", { has_backlog: "eq.true" }),
      countRows("student_subject_enrollments"),
      countRows("scheduling_runs"),
      mustRead<Row[]>("published_schedules", { select: "version,is_active" }),
      countRows("faculty"),
    ]);
    const blackouts = (rows: Row[]) => rows.reduce((sum, r) => sum + stringValue(r.unavailable_slots).split(/[|,;\s]+/).filter(Boolean).length, 0);
    return {
      rooms: { total: rooms.length, labs: rooms.filter((r) => stringValue(r.room_type).toUpperCase() === "LAB").length, seats: rooms.reduce((sum, r) => sum + numberValue(r.capacity), 0) },
      timeSlots: { total: slots.length, available: slots.length, days: new Set(slots.map((s) => stringValue(s.exam_date).slice(0, 10))).size },
      subjects: { total: subjects.length, fixedSlots: subjects.filter((s) => stringValue(s.fixed_slot)).length },
      studentGroups: { total: groups },
      students: { total: students, backlogs: backlogStudents, enrollments },
      faculty: { total: faculty },
      scheduleRuns: { total: runs, published: published.length, activeVersion: published.find((p) => p.is_active === true)?.version ?? null },
      constraints: { roomBlackouts: blackouts(rooms), subjectBlackouts: blackouts(subjects) },
    };
  },

  /** Student directory from the canonical tables, with backlog subjects derived the same way as the scheduler. */
  async listStudents(input: ListInput & { program?: string; semester?: number; hasBacklog?: string }) {
    const [students, groups, subjects, links] = await Promise.all([
      fetchAllRows<Row>("student_enrollments", "roll_no,student_name,group_id,has_backlog", "roll_no.asc"),
      mustRead<Row[]>("student_groups", { select: "group_id,name,program,semester" }),
      mustRead<Row[]>("subjects", { select: "subject_id,program,semester" }),
      fetchAllRows<Row>("student_subject_enrollments", "roll_no,subject_id", "id.asc"),
    ]);
    const groupById = new Map(groups.map((g) => [stringValue(g.group_id), g]));
    const subjectById = new Map(subjects.map((s) => [stringValue(s.subject_id), s]));
    const subjectsOf = new Map<string, string[]>();
    for (const link of links) subjectsOf.set(stringValue(link.roll_no), [...(subjectsOf.get(stringValue(link.roll_no)) ?? []), stringValue(link.subject_id)]);
    const rows = students.map((s) => {
      const group = groupById.get(stringValue(s.group_id));
      const subjectIds = (subjectsOf.get(stringValue(s.roll_no)) ?? []).sort();
      const backlogSubjectIds = subjectIds.filter((id) => {
        const subject = subjectById.get(id);
        return Boolean(group && subject && (subject.program !== group.program || numberValue(subject.semester) < numberValue(group.semester)));
      });
      return {
        rollNo: stringValue(s.roll_no), name: stringValue(s.student_name), groupId: stringValue(s.group_id), groupName: group ? stringValue(group.name) : null,
        program: group ? stringValue(group.program) : null, semester: group ? numberValue(group.semester) : null,
        hasBacklog: booleanValue(s.has_backlog), subjectIds, backlogSubjectIds,
      };
    });
    const filtered = rows.filter((r) =>
      (!input.search || r.rollNo.toLowerCase().includes(input.search.toLowerCase()) || r.name.toLowerCase().includes(input.search.toLowerCase())) &&
      (!input.program || r.program === input.program) && (!input.semester || r.semester === input.semester) &&
      (!input.hasBacklog || (r.backlogSubjectIds.length > 0) === (input.hasBacklog === "true")));
    const result = page(filtered, input);
    return {
      students: result.items, pagination: result.pagination,
      metrics: { totalStudents: rows.length, backlogStudents: rows.filter((r) => r.backlogSubjectIds.length).length, backlogEnrollments: rows.reduce((sum, r) => sum + r.backlogSubjectIds.length, 0), subjectEnrollments: links.length },
      programs: [...new Set(groups.map((g) => stringValue(g.program)))].sort(),
    };
  },
};

async function countRows(table: string, filters: Record<string, string> = {}) {
  const result = await querySupabase<Row[]>(table, { useServiceRole: true, query: { select: "*", limit: "1", ...filters } });
  if (result.error || result.count === undefined) throw new ExamOptRepositoryError("DATA_SOURCE_UNAVAILABLE", `Could not count ${table}.`, 503);
  return result.count;
}
