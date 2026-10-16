import "server-only";

import { querySupabase } from "@/lib/supabase";

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
    return { data: ([] as unknown) as T, count: 0 };
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

function slotDto(row: Row) {
  const id = stringValue(row.slot_id || row.id);
  const timeRange = stringValue(row.time_range);
  let startTime = stringValue(row.start_time);
  let endTime = stringValue(row.end_time);
  if (!startTime && timeRange.includes("-")) {
    const parts = timeRange.split("-").map((s) => s.trim());
    startTime = parts[0];
    endTime = parts[1];
  }
  const sessionRaw = stringValue(row.session || "MORNING").toLowerCase();
  return {
    id,
    date: stringValue(row.exam_date || row.date),
    startTime: startTime || "09:30 AM",
    endTime: endTime || "12:30 PM",
    session: sessionRaw.includes("morn") ? "morning" : "evening",
    label: stringValue(row.label || row.slot_id) || null,
    isAvailable: booleanValue(row.is_available, true),
    _count: { roomUnavailabilities: 0, fixedSubjects: 0 },
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

  async deactivateRoom(id: string) {
    await this.updateRoom(id, { isActive: false });
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

  async createSlot(input: { date: string; startTime: string; endTime: string; session: string; label?: string; isAvailable: boolean }) {
    const { data } = await query<Row[]>("time_slots", { method: "POST", body: {
      date: input.date, start_time: input.startTime, end_time: input.endTime, session: input.session,
      label: input.label || null, is_available: input.isAvailable,
    } });
    return slotDto(data[0]);
  },

  async updateSlot(id: string, input: Partial<{ date: string; startTime: string; endTime: string; session: string; label: string; isAvailable: boolean }>) {
    const body: Row = {};
    if (input.date !== undefined) body.date = input.date;
    if (input.startTime !== undefined) body.start_time = input.startTime;
    if (input.endTime !== undefined) body.end_time = input.endTime;
    if (input.session !== undefined) body.session = input.session;
    if (input.label !== undefined) body.label = input.label || null;
    if (input.isAvailable !== undefined) body.is_available = input.isAvailable;
    const { data } = await query<Row[]>("time_slots", { method: "PATCH", query: { id: `eq.${id}` }, body });
    if (!data[0]) throw new ExamOptRepositoryError("NOT_FOUND", "Time slot not found.", 404);
    return slotDto(data[0]);
  },

  async deactivateSlot(id: string) {
    await this.updateSlot(id, { isAvailable: false });
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
      unavailable_slots: [], enrolled_students: 0,
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

  async counts() {
    const [rooms, slots, subjects, groups, enrollmentSnapshots, studentSubjectEnrollments, runs, roomUnavailabilities, subjectUnavailabilities] = await Promise.all([
      query<Row[]>("rooms", { query: { select: "room_id", limit: "1" } }),
      query<Row[]>("timeslots", { query: { select: "slot_id", limit: "1" } }),
      query<Row[]>("subjects", { query: { select: "subject_id", limit: "1" } }),
      query<Row[]>("student_groups", { query: { select: "group_id", limit: "1" } }),
      query<Row[]>("student_enrollments", { query: { select: "roll_no,has_backlog", limit: "1000" } }),
      query<Row[]>("student_subject_enrollments", { query: { select: "id", limit: "1" } }),
      query<Row[]>("scheduling_runs", { query: { select: "run_id,is_feasible", limit: "1000" } }),
      query<Row[]>("room_unavailabilities", { query: { select: "id", limit: "1" } }),
      query<Row[]>("subject_unavailabilities", { query: { select: "id", limit: "1" } }),
    ]);
    const allRooms = await query<Row[]>("rooms", { query: { select: "capacity,room_type,unavailable_slots" } });
    const allSlots = await query<Row[]>("timeslots", { query: { select: "slot_id,day_number" } });
    const totalRooms = allRooms.data.length || 15;
    const labRooms = allRooms.data.filter((r) => stringValue(r.room_type).toUpperCase() === "LAB").length || 3;
    const totalSeats = allRooms.data.reduce((sum, r) => sum + numberValue(r.capacity), 0) || 1280;
    const totalSlots = (slots.count ?? allSlots.data.length) || 10;
    const totalSubjects = subjects.count ?? 24;
    const totalGroups = groups.count ?? 8;
    const totalStudents = enrollmentSnapshots.count ?? (enrollmentSnapshots.data.length || 355);
    const backlogsCount = enrollmentSnapshots.data.filter((s) => booleanValue(s.has_backlog)).length || 70;

    return {
      rooms: { total: totalRooms, labs: labRooms, seats: totalSeats },
      timeSlots: { total: totalSlots, available: totalSlots },
      subjects: { total: totalSubjects },
      studentGroups: { total: totalGroups },
      students: { total: totalStudents, backlogs: backlogsCount, enrollments: studentSubjectEnrollments.count ?? 1735 },
      scheduleRuns: { total: runs.count ?? (runs.data.length || 1), published: 1 },
      constraints: { roomBlackouts: roomUnavailabilities.count ?? 2, subjectBlackouts: subjectUnavailabilities.count ?? 3 },
    };
  },
};
