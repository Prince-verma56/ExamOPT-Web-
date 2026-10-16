/**
 * Dataset quality report, ported from the reference `validator.py`
 * (`DataQualityValidator`). It checks raw rows table by table, so it accepts
 * database rows and CSV rows (strings) alike, and it keeps the reference
 * codes and readiness score: 100 - 20 x errors - 5 x warnings, floored at 0.
 *
 * It complements preflight (preflight.ts), which works on the normalised
 * model and decides whether the solver may run. This report does not block
 * the solver; it is the data-entry checklist.
 *
 * Deviations from the reference, all stricter or fixing a defect:
 * - enrollment counts are compared numerically (the reference compared a CSV
 *   string with an integer, so every CSV row mismatched);
 * - lab bottlenecks count laboratories available in the slot, not all labs;
 * - a non-positive duration is an error (the reference only warned);
 * - the normalised enrollment table, which the scheduler uses, is checked
 *   against the per-student subject list when both are present.
 */

type Row = Record<string, unknown>;

export interface QualityTables {
  rooms: Row[];
  timeslots: Row[];
  faculty: Row[];
  subjects: Row[];
  studentGroups: Row[];
  /** One row per student: roll_no, group_id, enrolled_subject_ids (comma-separated). */
  students: Row[];
  /** Optional normalised (roll_no, subject_id) rows; when present they are the enrollment source of truth. */
  enrollments?: Row[];
}

export interface QualityIssue {
  code: string;
  table: string;
  rowId: string;
  field: string;
  message: string;
  severity: "ERROR" | "WARNING";
}

export interface DataQualityReport {
  isValid: boolean;
  readinessScore: number;
  status: "READY_FOR_OPTIMIZATION" | "VALIDATION_FAILED";
  summary: { totalErrors: number; totalWarnings: number; tableCounts: Record<string, number> };
  errors: QualityIssue[];
  warnings: QualityIssue[];
  diagnostics: string[];
}

export const PROGRAMS = ["BCA", "BCA-DS", "MCA"];
export const DEPARTMENTS = ["CSED", "BCA", "MCA"];

const str = (value: unknown) => (value === null || value === undefined ? "" : String(value)).trim();

/** Python-style int(): integers and integer strings only; NaN otherwise. Missing values default to `fallback`. */
function int(value: unknown, fallback = 0): number {
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : Number.NaN;
  if (typeof value === "string" && /^\s*[-+]?\d+\s*$/.test(value)) return Number.parseInt(value, 10);
  return Number.NaN;
}

const slotList = (value: unknown) => str(value).split("|").map((s) => s.trim()).filter(Boolean);
const isLab = (value: unknown) => value === 1 || value === "1" || value === true || value === "True" || value === "true" || value === "TRUE";

export function validateDataQuality(tables: QualityTables): DataQualityReport {
  const errors: QualityIssue[] = [];
  const warnings: QualityIssue[] = [];
  const diagnostics: string[] = [];
  const error = (code: string, table: string, rowId: unknown, field: string, message: string) => errors.push({ code, table, rowId: String(rowId), field, message, severity: "ERROR" });
  const warn = (code: string, table: string, rowId: unknown, field: string, message: string) => warnings.push({ code, table, rowId: String(rowId), field, message, severity: "WARNING" });

  // 1. Time slots
  const slotIds = new Set<string>();
  const seenDateSession = new Set<string>();
  tables.timeslots.forEach((row, i) => {
    const id = str(row.slot_id);
    if (!id) { error("MISSING_SLOT_ID", "timeslots", `row_${i + 1}`, "slot_id", "Slot ID cannot be empty."); return; }
    if (slotIds.has(id)) error("DUPLICATE_SLOT_ID", "timeslots", id, "slot_id", `Duplicate slot_id '${id}' found.`);
    slotIds.add(id);
    const session = str(row.session).toUpperCase();
    if (session !== "MORNING" && session !== "EVENING") error("INVALID_SESSION", "timeslots", id, "session", `Session '${session}' must be MORNING or EVENING.`);
    const day = int(row.day_number);
    if (Number.isNaN(day)) error("INVALID_DAY_NUMBER", "timeslots", id, "day_number", "Day number must be a valid integer.");
    else if (day < 1 || day > 14) error("INVALID_DAY_NUMBER", "timeslots", id, "day_number", `Day number ${day} must be between 1 and 14.`);
    const key = `${str(row.exam_date).slice(0, 10)}_${session}`;
    if (seenDateSession.has(key)) error("DUPLICATE_DATE_SESSION", "timeslots", id, "exam_date", `Slot conflict: date '${str(row.exam_date).slice(0, 10)}' already has a ${session} session.`);
    seenDateSession.add(key);
  });

  // 2. Rooms
  const roomIds = new Set<string>();
  let maxTheory = 0, maxLab = 0;
  const labs: { id: string; unavailable: string[] }[] = [];
  tables.rooms.forEach((row, i) => {
    const id = str(row.room_id);
    if (!id) { error("MISSING_ROOM_ID", "rooms", `row_${i + 1}`, "room_id", "Room ID cannot be empty."); return; }
    if (roomIds.has(id)) error("DUPLICATE_ROOM_ID", "rooms", id, "room_id", `Duplicate room_id '${id}' found.`);
    roomIds.add(id);
    let capacity = int(row.capacity);
    if (Number.isNaN(capacity)) { error("INVALID_CAPACITY", "rooms", id, "capacity", "Capacity must be an integer."); capacity = 0; }
    else if (capacity <= 0) error("INVALID_CAPACITY", "rooms", id, "capacity", `Room capacity (${capacity}) must be > 0.`);
    const type = str(row.room_type).toUpperCase();
    if (type === "THEORY") maxTheory = Math.max(maxTheory, capacity);
    else if (type === "LAB") { maxLab = Math.max(maxLab, capacity); labs.push({ id, unavailable: slotList(row.unavailable_slots) }); }
    else error("INVALID_ROOM_TYPE", "rooms", id, "room_type", `Room type '${type}' must be THEORY or LAB.`);
    for (const slot of slotList(row.unavailable_slots)) {
      if (slotIds.size && !slotIds.has(slot)) warn("UNKNOWN_SLOT_REF", "rooms", id, "unavailable_slots", `Referenced slot '${slot}' is not in defined timeslots.`);
    }
  });

  // 3. Faculty
  const facultyIds = new Set<string>();
  tables.faculty.forEach((row, i) => {
    const id = str(row.faculty_id);
    if (!id) { error("MISSING_FACULTY_ID", "faculty", `row_${i + 1}`, "faculty_id", "Faculty ID cannot be empty."); return; }
    if (facultyIds.has(id)) error("DUPLICATE_FACULTY_ID", "faculty", id, "faculty_id", `Duplicate faculty_id '${id}' found.`);
    facultyIds.add(id);
    if (!str(row.name)) error("MISSING_NAME", "faculty", id, "name", "Faculty name cannot be blank.");
    const department = str(row.department).toUpperCase();
    if (!DEPARTMENTS.includes(department)) error("INVALID_DEPARTMENT", "faculty", id, "department", `Invalid department '${department}'. Expected ${DEPARTMENTS.join(", ")}.`);
    const duties = int(row.max_duties);
    if (Number.isNaN(duties)) error("INVALID_DUTIES", "faculty", id, "max_duties", "Max duties must be an integer.");
    else if (duties < 0) error("NEGATIVE_DUTIES", "faculty", id, "max_duties", `Max duties (${duties}) cannot be negative.`);
    for (const slot of slotList(row.unavailable_slots)) {
      if (slotIds.size && !slotIds.has(slot)) warn("UNKNOWN_SLOT_REF", "faculty", id, "unavailable_slots", `Referenced slot '${slot}' does not exist.`);
    }
  });

  // 4. Subjects
  const subjectIds = new Set<string>();
  const declared = new Map<string, number>();
  const labsFixedTo = new Map<string, string[]>();
  tables.subjects.forEach((row, i) => {
    const id = str(row.subject_id);
    if (!id) { error("MISSING_SUBJECT_ID", "subjects", `row_${i + 1}`, "subject_id", "Subject ID cannot be empty."); return; }
    if (subjectIds.has(id)) error("DUPLICATE_SUBJECT_ID", "subjects", id, "subject_id", `Duplicate subject_id '${id}' detected.`);
    subjectIds.add(id);
    if (!str(row.name)) error("MISSING_NAME", "subjects", id, "name", `Subject '${id}' has missing or blank name.`);
    const program = str(row.program).toUpperCase();
    if (!PROGRAMS.includes(program)) error("INVALID_PROGRAM", "subjects", id, "program", `Subject '${id}' has invalid program '${program}'.`);

    const enrolled = int(row.enrolled_students);
    if (Number.isNaN(enrolled)) error("INVALID_ENROLLMENT", "subjects", id, "enrolled_students", `Invalid enrolled_students value '${str(row.enrolled_students)}' in subject '${id}'.`);
    else {
      if (!declared.has(id)) declared.set(id, enrolled);
      if (enrolled < 0) error("NEGATIVE_ENROLLMENT", "subjects", id, "enrolled_students", `Negative enrollment (${enrolled}) detected in subject '${id}'.`);
    }

    const duration = Number(str(row.duration_hours));
    if (str(row.duration_hours) === "" || !Number.isFinite(duration)) error("INVALID_DURATION", "subjects", id, "duration_hours", "Duration hours must be a number.");
    else if (duration <= 0) error("INVALID_DURATION", "subjects", id, "duration_hours", `Subject '${id}' has a non-positive duration (${duration} h).`);
    else if (duration !== 2 && duration !== 3) warn("UNUSUAL_DURATION", "subjects", id, "duration_hours", `Subject '${id}' duration is ${duration} hours (standard is 2 h for lab, 3 h for theory).`);

    const lab = isLab(row.requires_lab);
    const fixed = str(row.fixed_slot);
    const unavailable = new Set(slotList(row.unavailable_slots));
    if (fixed) {
      if (slotIds.size && !slotIds.has(fixed)) error("FOREIGN_KEY_NOT_FOUND", "subjects", id, "fixed_slot", `Fixed slot '${fixed}' does not exist in timeslots table.`);
      if (unavailable.has(fixed)) error("CONTRADICTORY_CONSTRAINTS", "subjects", id, "fixed_slot", `Subject '${id}' has contradictory constraint: fixed_slot '${fixed}' is also declared in unavailable_slots.`);
      if (lab) labsFixedTo.set(fixed, [...(labsFixedTo.get(fixed) ?? []), id]);
    }
    if (!Number.isNaN(enrolled)) {
      if (maxTheory > 0 && !lab && enrolled > maxTheory) error("CAPACITY_OVERFLOW", "subjects", id, "enrolled_students", `Subject '${id}' enrollment (${enrolled}) exceeds the capacity of the largest theory room (${maxTheory}). Requires a larger venue.`);
      if (maxLab > 0 && lab && enrolled > maxLab) error("LAB_CAPACITY_OVERFLOW", "subjects", id, "enrolled_students", `Lab subject '${id}' enrollment (${enrolled}) exceeds largest lab capacity (${maxLab}).`);
    }
  });
  for (const [slot, ids] of [...labsFixedTo].sort(([a], [b]) => a.localeCompare(b))) {
    const available = labs.filter((l) => !l.unavailable.includes(slot)).length;
    if (ids.length > available) error("LAB_BOTTLENECK", "subjects", slot, "fixed_slot", `Lab bottleneck in slot '${slot}': ${ids.length} laboratory examinations (${ids.join(", ")}) are fixed to '${slot}', but only ${available} laboratories are available then.`);
  }

  // 5. Student groups
  const groupIds = new Set<string>();
  tables.studentGroups.forEach((row, i) => {
    const id = str(row.group_id);
    if (!id) { error("MISSING_GROUP_ID", "student_groups", `row_${i + 1}`, "group_id", "Group ID cannot be empty."); return; }
    if (groupIds.has(id)) error("DUPLICATE_GROUP_ID", "student_groups", id, "group_id", `Duplicate group_id '${id}' found.`);
    groupIds.add(id);
    const count = int(row.student_count);
    if (Number.isNaN(count)) error("INVALID_STUDENT_COUNT", "student_groups", id, "student_count", "Student count must be an integer.");
    else if (count < 0) error("NEGATIVE_STUDENT_COUNT", "student_groups", id, "student_count", `Group '${id}' student count (${count}) cannot be negative.`);
  });

  // 6. Students and enrollments
  const rolls = new Set<string>();
  const listed = new Map<string, Set<string>>();
  tables.students.forEach((row, i) => {
    const roll = str(row.roll_no);
    if (!roll) { error("MISSING_ROLL_NO", "student_enrollments", `row_${i + 1}`, "roll_no", "Roll number cannot be empty."); return; }
    if (rolls.has(roll)) error("DUPLICATE_ROLL_NO", "student_enrollments", roll, "roll_no", `Duplicate roll_no '${roll}' found.`);
    rolls.add(roll);
    const group = str(row.group_id);
    if (groupIds.size && !groupIds.has(group)) error("FOREIGN_KEY_NOT_FOUND", "student_enrollments", roll, "group_id", `Student '${roll}' references non-existent group '${group}'.`);
    if (row.enrolled_subject_ids !== undefined) listed.set(roll, new Set(str(row.enrolled_subject_ids).split(",").map((s) => s.trim()).filter(Boolean)));
  });

  const subjectsOf = new Map<string, Set<string>>();
  if (tables.enrollments) {
    for (const row of tables.enrollments) {
      const roll = str(row.roll_no), subject = str(row.subject_id);
      if (!subjectsOf.has(roll)) subjectsOf.set(roll, new Set());
      subjectsOf.get(roll)!.add(subject);
      if (rolls.size && !rolls.has(roll)) error("FOREIGN_KEY_NOT_FOUND", "student_subject_enrollments", roll, "roll_no", `An enrollment references unknown student '${roll}'.`);
    }
    for (const [roll, set] of listed) {
      const normalised = subjectsOf.get(roll) ?? new Set<string>();
      if (set.size !== normalised.size || [...set].some((s) => !normalised.has(s))) warn("ENROLLMENT_SOURCE_MISMATCH", "student_enrollments", roll, "enrolled_subject_ids", `Student '${roll}' lists ${[...set].sort().join(", ") || "no subjects"} but the normalised enrollment table has ${[...normalised].sort().join(", ") || "none"}. The scheduler uses the normalised table.`);
    }
  } else {
    for (const [roll, set] of listed) subjectsOf.set(roll, set);
  }

  const actual = new Map<string, number>();
  for (const roll of [...rolls, ...[...subjectsOf.keys()].filter((r) => !rolls.has(r))]) {
    const set = subjectsOf.get(roll);
    if (!set?.size) { if (rolls.has(roll)) warn("EMPTY_ENROLLMENT", "student_enrollments", roll, "enrolled_subject_ids", `Student '${roll}' has no enrolled subjects.`); continue; }
    for (const subject of set) {
      if (subjectIds.size && !subjectIds.has(subject)) error("FOREIGN_KEY_NOT_FOUND", "student_enrollments", roll, "enrolled_subject_ids", `Student '${roll}' enrolled in unknown subject '${subject}'.`);
      actual.set(subject, (actual.get(subject) ?? 0) + 1);
    }
  }
  if (rolls.size || subjectsOf.size) {
    for (const [id, count] of declared) {
      const expected = actual.get(id) ?? 0;
      if (count !== expected) warn("ENROLLMENT_COUNT_MISMATCH", "subjects", id, "enrolled_students", `Subject '${id}' declares ${count} enrolled students, but enrollment records sum to ${expected}.`);
    }
  }

  // 7. Readiness diagnostics (reference wording)
  const slots = tables.timeslots.length, rooms = tables.rooms.length, subjects = tables.subjects.length;
  diagnostics.push(`Scope: ${subjects} examinations across ${slots} time slots and ${rooms} rooms.`);
  if (slots === 0) diagnostics.push("CRITICAL: No examination time slots configured. Timetable generation cannot proceed.");
  else if (subjects > slots * rooms) diagnostics.push(`WARNING: Subject count (${subjects}) exceeds the room-slot matrix capacity (${slots * rooms}).`);
  else diagnostics.push("The room-slot matrix is large enough to host every examination.");
  if (errors.some((e) => e.code === "CAPACITY_OVERFLOW")) diagnostics.push("REMEDY: Move high-enrollment courses to the largest venues (auditoriums) or add a larger room. Splitting an exam across rooms is not supported.");
  if (errors.some((e) => e.code === "LAB_BOTTLENECK")) diagnostics.push("REMEDY: Stagger laboratory examinations across sessions or unlock conflicting fixed slots.");

  const readinessScore = Math.max(0, 100 - errors.length * 20 - warnings.length * 5);
  return {
    isValid: errors.length === 0,
    readinessScore,
    status: errors.length === 0 ? "READY_FOR_OPTIMIZATION" : "VALIDATION_FAILED",
    summary: {
      totalErrors: errors.length, totalWarnings: warnings.length,
      tableCounts: { rooms, timeslots: slots, faculty: tables.faculty.length, subjects, student_groups: tables.studentGroups.length, student_enrollments: tables.students.length, ...(tables.enrollments ? { student_subject_enrollments: tables.enrollments.length } : {}) },
    },
    errors, warnings, diagnostics,
  };
}

export type QualityTableName = "rooms" | "timeslots" | "faculty" | "subjects";

/**
 * Validates one uploaded table in the context of the rest of the dataset
 * (reference `validate_csv_file`). Nothing is written anywhere.
 *
 * When an uploaded subjects file omits subjects that existing enrollments
 * reference, the enrollment cross-check would only restate that, so it is
 * skipped and the report says so. (The reference skipped it for files with
 * fewer than 20 subjects.)
 */
export function validateTableInContext(tables: QualityTables, table: QualityTableName, rows: Row[]): DataQualityReport {
  const next: QualityTables = { ...tables, [table === "timeslots" ? "timeslots" : table]: rows };
  let skippedEnrollments = false;
  if (table === "subjects") {
    const uploaded = new Set(rows.map((r) => str(r.subject_id)));
    const referenced = new Set([
      ...(tables.enrollments ?? []).map((r) => str(r.subject_id)),
      ...tables.students.flatMap((r) => str(r.enrolled_subject_ids).split(",").map((s) => s.trim()).filter(Boolean)),
    ]);
    if ([...referenced].some((id) => !uploaded.has(id))) {
      next.students = [];
      next.enrollments = undefined;
      skippedEnrollments = true;
    }
  }
  const report = validateDataQuality(next);
  if (skippedEnrollments) report.diagnostics.push("The uploaded subjects file does not cover every subject that students are enrolled in, so the enrollment cross-check was skipped.");
  return report;
}
