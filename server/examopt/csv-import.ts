import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { validateDataQuality, type QualityIssue, type QualityTables } from "@/server/scheduling/data-quality";
import { twelveHour } from "@/server/scheduling/export";
import { parseSlotList, parseTimeRange } from "@/server/scheduling/normalize";

/**
 * CSV import and export for the canonical tables, as pure functions.
 *
 * `planImport` turns a CSV file into a validated write plan against the
 * current rows (passed in by the caller): every row gets a line-numbered list
 * of problems, and valid rows get an action (create, update or unchanged).
 * Nothing here touches the database; `server/examopt/csv-service.ts` loads the
 * context, and commits a plan only when it has no errors.
 *
 * Policy, documented in docs/examopt/CSV_IMPORT_EXPORT_AUDIT.md:
 * - The primary key is the conflict key. A key repeated within one file is an error on every occurrence.
 * - `insert` mode refuses keys that already exist; `upsert` updates them. There is no replace or delete mode.
 * - Columns absent from the header are left untouched on update (and take database defaults on create).
 * - References must resolve: slots, subjects and groups must already exist.
 * - Student enrollments are additive: listed subjects are added, existing ones are kept.
 * - Any error blocks the whole import; partial imports are not offered.
 */

export const IMPORT_ENTITIES = ["subjects", "rooms", "timeslots", "student_groups", "students", "faculty"] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];
export type ImportMode = "insert" | "upsert";

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 2_000_000;

type Row = Record<string, unknown>;
type FieldKind = "id" | "text" | "int" | "bool" | "enum" | "date" | "timeRange" | "slotList" | "idList" | "ref";

interface Field {
  name: string;
  kind: FieldKind;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  /** Table the value must exist in (for `ref` and `slotList`/`idList`). */
  ref?: "slots" | "subjects" | "groups";
  /** Value for a blank optional cell on create (on update a blank cell keeps the current value). Mirrors the database default. */
  fallback?: string | number | boolean | null;
  description: string;
  example: string;
}

export interface EntitySpec {
  entity: ImportEntity;
  /** Canonical table written by the import. */
  table: string;
  key: string;
  label: string;
  fields: Field[];
}

const PROGRAMS = ["BCA", "BCA-DS", "MCA"];

export const ENTITY_SPECS: Record<ImportEntity, EntitySpec> = {
  rooms: {
    entity: "rooms", table: "rooms", key: "room_id", label: "Rooms and laboratories",
    fields: [
      { name: "room_id", kind: "id", required: true, description: "Unique room code.", example: "AB11-104" },
      { name: "name", kind: "text", required: true, description: "Display name.", example: "CSED Block AB-XI Room 104" },
      { name: "building", fallback: "AB-XI CSED Block", kind: "text", description: "Building name (database default when blank on create).", example: "AB-XI CSED Block" },
      { name: "capacity", kind: "int", required: true, min: 1, max: 5000, description: "Seats available for an examination.", example: "80" },
      { name: "room_type", kind: "enum", required: true, options: ["THEORY", "LAB"], description: "THEORY or LAB.", example: "THEORY" },
      { name: "unavailable_slots", kind: "slotList", ref: "slots", fallback: "", description: "Slots the room cannot be used, separated by |.", example: "D2-M|D4-E" },
    ],
  },
  timeslots: {
    entity: "timeslots", table: "timeslots", key: "slot_id", label: "Time slots",
    fields: [
      { name: "slot_id", kind: "id", required: true, description: "Unique slot code.", example: "D6-M" },
      { name: "day_number", kind: "int", required: true, min: 1, max: 14, description: "Day of the examination window, 1-14.", example: "6" },
      { name: "exam_date", kind: "date", required: true, description: "Date, YYYY-MM-DD.", example: "2026-10-26" },
      { name: "session", kind: "enum", required: true, options: ["MORNING", "EVENING"], description: "MORNING or EVENING; one of each per date.", example: "MORNING" },
      { name: "time_range", kind: "timeRange", required: true, description: "Start and end, e.g. 09:30 AM - 12:30 PM.", example: "09:30 AM - 12:30 PM" },
    ],
  },
  subjects: {
    entity: "subjects", table: "subjects", key: "subject_id", label: "Subjects and examinations",
    fields: [
      { name: "subject_id", kind: "id", required: true, description: "Unique subject code; one examination per subject.", example: "BCA-105" },
      { name: "name", kind: "text", required: true, description: "Subject name.", example: "Discrete Mathematics" },
      { name: "program", kind: "enum", required: true, options: PROGRAMS, description: "BCA, BCA-DS or MCA.", example: "BCA" },
      { name: "semester", kind: "int", required: true, min: 1, max: 8, description: "Semester 1-8.", example: "1" },
      { name: "duration_hours", kind: "int", required: true, min: 2, max: 3, description: "Examination length: 2 or 3 hours.", example: "3" },
      { name: "requires_lab", fallback: false, kind: "bool", description: "true for practical exams that need a laboratory.", example: "false" },
      { name: "fixed_slot", fallback: null, kind: "ref", ref: "slots", description: "Slot the exam must use, or blank.", example: "" },
      { name: "unavailable_slots", kind: "slotList", ref: "slots", fallback: "", description: "Slots the exam may not use, separated by |.", example: "D3-M" },
      { name: "enrolled_students", fallback: 0, kind: "int", min: 0, max: 100000, description: "Declared enrollment (informational; the scheduler counts actual enrollments).", example: "80" },
    ],
  },
  student_groups: {
    entity: "student_groups", table: "student_groups", key: "group_id", label: "Student groups",
    fields: [
      { name: "group_id", kind: "id", required: true, description: "Unique group code.", example: "GRP-BCA-S2" },
      { name: "name", kind: "text", required: true, description: "Group name.", example: "BCA Semester 2" },
      { name: "program", kind: "enum", required: true, options: PROGRAMS, description: "BCA, BCA-DS or MCA.", example: "BCA" },
      { name: "semester", kind: "int", required: true, min: 1, max: 8, description: "Semester 1-8.", example: "2" },
      { name: "is_backlog_group", fallback: false, kind: "bool", description: "true for a group of students repeating exams.", example: "false" },
      { name: "student_count", fallback: 0, kind: "int", min: 0, max: 100000, description: "Expected strength.", example: "60" },
    ],
  },
  students: {
    entity: "students", table: "student_enrollments", key: "roll_no", label: "Students and enrollments",
    fields: [
      { name: "roll_no", kind: "id", required: true, description: "Unique roll number.", example: "GLA26-BCA-0999" },
      { name: "student_name", kind: "text", required: true, description: "Student name.", example: "Test Student" },
      { name: "student_email", kind: "text", description: "Verified institutional email used to securely link a student's account.", example: "student@university.edu" },
      { name: "group_id", kind: "ref", ref: "groups", required: true, description: "Existing student group.", example: "GRP-BCA-S1" },
      { name: "has_backlog", fallback: false, kind: "bool", description: "true when the student sits exams outside their cohort.", example: "false" },
      { name: "subject_ids", kind: "idList", ref: "subjects", required: true, description: "Existing subjects the student sits, separated by |. Added to existing enrollments, never removed.", example: "BCA-101|BCA-102" },
    ],
  },
  faculty: {
    entity: "faculty", table: "faculty", key: "faculty_id", label: "Faculty (invigilators)",
    fields: [
      { name: "faculty_id", kind: "id", required: true, description: "Unique faculty code.", example: "FAC-121" },
      { name: "name", kind: "text", required: true, description: "Name.", example: "Dr. Test Faculty" },
      { name: "department", kind: "enum", required: true, options: ["CSED", "BCA", "MCA"], description: "CSED, BCA or MCA.", example: "CSED" },
      { name: "unavailable_slots", kind: "slotList", ref: "slots", fallback: "", description: "Slots the faculty member cannot invigilate, separated by |.", example: "D1-M" },
      { name: "max_duties", fallback: 4, kind: "int", min: 0, max: 50, description: "Most invigilation duties per examination window.", example: "4" },
    ],
  },
};

export interface ImportContext {
  /** Current rows of the entity's own table (all columns). */
  existing: Row[];
  slotIds: Set<string>;
  subjectIds: Set<string>;
  groupIds: Set<string>;
  /** Current timeslots, for the one-session-per-date rule. */
  slots: { slot_id: string; exam_date: string; session: string }[];
  /** Current enrollment pairs per roll number (students only). */
  enrollments: Map<string, Set<string>>;
  /** Current dataset in the quality report's shape, to compare before and after. */
  quality: QualityTables | null;
}

export interface RowIssue {
  /** Line in the file (the header is line 1). */
  line: number;
  key: string | null;
  field: string;
  code: string;
  message: string;
}

export interface PlannedRow {
  line: number;
  key: string;
  action: "create" | "update" | "unchanged";
  /** Columns written, already in database form. */
  values: Row;
  changedFields: string[];
  /** Current values of the changed fields, as previewed. Part of the plan hash, so a concurrent edit is detected. */
  previous: Row | null;
  /** Students only: subjects to add, and existing subjects kept that the file omits. */
  addSubjects?: string[];
  keptSubjects?: string[];
}

export interface ImportPlan {
  entity: ImportEntity;
  table: string;
  mode: ImportMode;
  columns: string[];
  parsedRows: number;
  validRows: number;
  invalidRows: number;
  duplicateKeys: string[];
  errors: RowIssue[];
  warnings: RowIssue[];
  rows: PlannedRow[];
  summary: { create: number; update: number; unchanged: number; enrollmentsToAdd: number };
  quality: { before: number; after: number; newErrors: QualityIssue[] } | null;
  canCommit: boolean;
  /** Fingerprint of the writes; commit refuses when the server's fresh plan differs from the one previewed. */
  planHash: string;
}

const str = (value: unknown) => (value === null || value === undefined ? "" : String(value)).trim();
const ID = /^[A-Z0-9][A-Z0-9_-]{0,49}$/;

function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

/** Parses with line numbers. A malformed file yields one error and no rows. */
export function parseCsvWithLines(csv: string): { header: string[]; records: { line: number; row: Record<string, string> }[]; error: string | null } {
  try {
    const out = parse(csv, { columns: (h: string[]) => h.map((c) => c.trim().toLowerCase()), info: true, skip_empty_lines: true, trim: true, bom: true }) as { record: Record<string, string>; info: { lines: number } }[];
    const firstLine = csv.replace(/^﻿/, "").split(/\r?\n/).find((l) => l.trim()) ?? "";
    const header = (parse(firstLine, { bom: true, trim: true }) as string[][])[0]?.map((c) => c.trim().toLowerCase()) ?? [];
    return { header, records: out.map((o) => ({ line: o.info.lines, row: o.record })), error: null };
  } catch (error) {
    return { header: [], records: [], error: error instanceof Error ? error.message : "The file is not valid CSV." };
  }
}

function parseBool(value: string): boolean | null {
  const v = value.toLowerCase();
  if (["true", "1", "yes", "y"].includes(v)) return true;
  if (["false", "0", "no", "n"].includes(v)) return false;
  return null;
}

function validIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

/** Normalises one existing database value to the form the import writes, for change detection. */
function canonicalExisting(field: Field, value: unknown): unknown {
  if (value === null || value === undefined) return field.kind === "ref" ? null : field.kind === "slotList" ? "" : value;
  switch (field.kind) {
    case "int": return Number(value);
    case "bool": return value === true || value === "true";
    case "slotList": return parseSlotList(String(value)).join("|");
    case "date": return String(value).slice(0, 10);
    case "ref": return str(value) || null;
    default: return str(value);
  }
}

export function planImport(entity: ImportEntity, mode: ImportMode, csv: string, ctx: ImportContext): ImportPlan {
  const spec = ENTITY_SPECS[entity];
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const empty = (columns: string[]): ImportPlan => ({
    entity, table: spec.table, mode, columns, parsedRows: 0, validRows: 0, invalidRows: 0, duplicateKeys: [], errors, warnings, rows: [],
    summary: { create: 0, update: 0, unchanged: 0, enrollmentsToAdd: 0 }, quality: null, canCommit: false, planHash: "",
  });

  if (csv.length > MAX_IMPORT_BYTES) { errors.push({ line: 0, key: null, field: "", code: "FILE_TOO_LARGE", message: `Files larger than ${MAX_IMPORT_BYTES / 1_000_000} MB are not accepted.` }); return empty([]); }
  const parsed = parseCsvWithLines(csv);
  if (parsed.error) { errors.push({ line: 0, key: null, field: "", code: "INVALID_CSV", message: `The file is not valid CSV: ${parsed.error}` }); return empty([]); }
  const header = parsed.header;
  const known = new Set(spec.fields.map((f) => f.name));
  for (const column of header) if (!known.has(column)) errors.push({ line: 1, key: null, field: column, code: "UNKNOWN_COLUMN", message: `Column "${column}" is not part of the ${spec.label.toLowerCase()} format. Expected: ${spec.fields.map((f) => f.name).join(", ")}.` });
  for (const f of spec.fields) if (f.required && !header.includes(f.name)) errors.push({ line: 1, key: null, field: f.name, code: "MISSING_COLUMN", message: `Required column "${f.name}" is missing.` });
  if (new Set(header).size !== header.length) errors.push({ line: 1, key: null, field: "", code: "DUPLICATE_COLUMN", message: "A column name appears more than once." });
  if (!parsed.records.length) errors.push({ line: 0, key: null, field: "", code: "EMPTY_FILE", message: "The file has a header but no data rows." });
  if (parsed.records.length > MAX_IMPORT_ROWS) errors.push({ line: 0, key: null, field: "", code: "TOO_MANY_ROWS", message: `At most ${MAX_IMPORT_ROWS} rows per import.` });
  if (errors.length) return { ...empty(header), parsedRows: parsed.records.length, invalidRows: parsed.records.length };

  const fields = spec.fields.filter((f) => header.includes(f.name));
  const existingByKey = new Map(ctx.existing.map((r) => [str(r[spec.key]).toUpperCase(), r]));
  const keyCount = new Map<string, number>();
  for (const { row } of parsed.records) { const k = str(row[spec.key]).toUpperCase(); if (k) keyCount.set(k, (keyCount.get(k) ?? 0) + 1); }
  const duplicateKeys = [...keyCount].filter(([, n]) => n > 1).map(([k]) => k).sort();

  const planned: PlannedRow[] = [];
  const badLines = new Set<number>();
  const sessionTaken = new Map(ctx.slots.map((s) => [`${str(s.exam_date).slice(0, 10)}|${str(s.session).toUpperCase()}`, str(s.slot_id).toUpperCase()]));
  const fileSessions = new Map<string, string>();

  for (const { line, row } of parsed.records) {
    const rowErrors: RowIssue[] = [];
    const key = str(row[spec.key]).toUpperCase();
    const fail = (field: string, code: string, message: string) => rowErrors.push({ line, key: key || null, field, code, message });
    const values: Row = {};
    const current = key ? existingByKey.get(key) : undefined;

    for (const f of fields) {
      const raw = str(row[f.name]);
      if (!raw) {
        if (f.required) { fail(f.name, "REQUIRED", `${f.name} is required.`); continue; }
        // Every row must carry the same columns for one bulk statement, so a blank cell is filled, never dropped.
        values[f.name] = current ? canonicalExisting(f, current[f.name]) : (f.fallback ?? null);
        continue;
      }
      switch (f.kind) {
        case "id": {
          const v = raw.toUpperCase();
          if (!ID.test(v)) fail(f.name, "INVALID_ID", `"${raw}" must be 1-50 letters, digits, dashes or underscores.`);
          values[f.name] = v; break;
        }
        case "text":
          if (raw.length > 255) fail(f.name, "TOO_LONG", `${f.name} is longer than 255 characters.`);
          values[f.name] = raw; break;
        case "int": {
          if (!/^[-+]?\d+$/.test(raw)) { fail(f.name, "INVALID_INTEGER", `${f.name} "${raw}" is not a whole number.`); break; }
          const n = Number.parseInt(raw, 10);
          if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) fail(f.name, "OUT_OF_RANGE", `${f.name} ${n} must be between ${f.min} and ${f.max}.`);
          values[f.name] = n; break;
        }
        case "bool": {
          const b = parseBool(raw);
          if (b === null) fail(f.name, "INVALID_BOOLEAN", `${f.name} "${raw}" must be true or false.`);
          values[f.name] = b ?? false; break;
        }
        case "enum": {
          const v = raw.toUpperCase();
          if (!f.options!.includes(v)) fail(f.name, "INVALID_VALUE", `${f.name} "${raw}" must be one of ${f.options!.join(", ")}.`);
          values[f.name] = v; break;
        }
        case "date":
          if (!validIsoDate(raw)) fail(f.name, "INVALID_DATE", `${f.name} "${raw}" must be a real date in YYYY-MM-DD form.`);
          values[f.name] = raw; break;
        case "timeRange": {
          const { start, end } = parseTimeRange(raw);
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { fail(f.name, "INVALID_TIME_RANGE", `${f.name} "${raw}" must look like "09:30 AM - 12:30 PM" with the end after the start.`); break; }
          values[f.name] = `${twelveHour(start)} - ${twelveHour(end)}`; break;
        }
        case "slotList": {
          const ids = parseSlotList(raw).map((s) => s.toUpperCase());
          const unknown = ids.filter((s) => !ctx.slotIds.has(s));
          if (unknown.length) fail(f.name, "UNKNOWN_SLOT", `Unknown time slot${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.`);
          values[f.name] = ids.join("|"); break;
        }
        case "idList": {
          const ids = [...new Set(raw.split(/[|,;]+/).map((s) => s.trim().toUpperCase()).filter(Boolean))];
          const unknown = ids.filter((s) => !ctx.subjectIds.has(s));
          if (!ids.length) fail(f.name, "REQUIRED", `${f.name} must list at least one subject.`);
          if (unknown.length) fail(f.name, "UNKNOWN_SUBJECT", `Unknown subject${unknown.length > 1 ? "s" : ""}: ${unknown.join(", ")}.`);
          values[f.name] = ids; break;
        }
        case "ref": {
          const v = raw.toUpperCase();
          const pool = f.ref === "slots" ? ctx.slotIds : f.ref === "groups" ? ctx.groupIds : ctx.subjectIds;
          if (!pool.has(v)) fail(f.name, f.ref === "groups" ? "UNKNOWN_GROUP" : "UNKNOWN_SLOT", `${f.name} "${raw}" does not exist.`);
          values[f.name] = v; break;
        }
      }

      if (entity === "students" && values.student_email) {
        const email = String(values.student_email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          fail("student_email", "INVALID_EMAIL", "student_email must be a valid email address.");
        }
        values.student_email = email;
        const duplicate = ctx.existing.find((r) =>
          str(r.student_email).toLowerCase() === email && str(r.roll_no).toUpperCase() !== key
        );
        if (duplicate) fail("student_email", "DUPLICATE_STUDENT_EMAIL", "This email is already assigned to another student record.");
        const earlier = parsed.records.find((r) =>
          r.line < line && str(r.row.student_email).toLowerCase() === email
        );
        if (earlier) fail("student_email", "DUPLICATE_STUDENT_EMAIL", "This email appears on another student row in this file.");
      }
    }

    if (key && (keyCount.get(key) ?? 0) > 1) fail(spec.key, "DUPLICATE_KEY", `${spec.key} ${key} appears ${keyCount.get(key)} times in this file.`);
    if (current && mode === "insert") fail(spec.key, "ALREADY_EXISTS", `${spec.key} ${key} already exists. Use update mode to change it.`);

    // Entity rules beyond single fields.
    if (entity === "subjects" && values.fixed_slot && String(values.unavailable_slots ?? "").split("|").includes(String(values.fixed_slot))) {
      fail("fixed_slot", "CONTRADICTORY_CONSTRAINTS", `The subject is fixed to ${values.fixed_slot} but also lists it as unavailable.`);
    }
    if (entity === "timeslots" && values.exam_date && values.session) {
      const sk = `${values.exam_date}|${values.session}`;
      const holder = sessionTaken.get(sk);
      if (holder && holder !== key) fail("session", "DUPLICATE_DATE_SESSION", `${values.exam_date} already has a ${String(values.session).toLowerCase()} slot (${holder}).`);
      const inFile = fileSessions.get(sk);
      if (inFile && inFile !== key) fail("session", "DUPLICATE_DATE_SESSION", `${values.exam_date} ${String(values.session).toLowerCase()} is used by ${inFile} earlier in this file.`);
      fileSessions.set(sk, key);
    }

    if (rowErrors.length) { errors.push(...rowErrors); badLines.add(line); continue; }

    // Database form, change detection and enrollment additions.
    let addSubjects: string[] | undefined, keptSubjects: string[] | undefined;
    if (entity === "students") {
      const listed = values.subject_ids as string[];
      const existingSubjects = ctx.enrollments.get(key) ?? new Set<string>();
      addSubjects = listed.filter((s) => !existingSubjects.has(s));
      keptSubjects = [...existingSubjects].filter((s) => !listed.includes(s)).sort();
      if (keptSubjects.length) warnings.push({ line, key, field: "subject_ids", code: "ENROLLMENTS_KEPT", message: `Existing enrollment${keptSubjects.length > 1 ? "s" : ""} ${keptSubjects.join(", ")} not listed in the file ${keptSubjects.length > 1 ? "are" : "is"} kept (imports never remove enrollments).` });
      delete values.subject_ids;
      values.enrolled_subject_ids = [...new Set([...existingSubjects, ...listed])].sort().join(",");
    }
    const changedFields = current
      ? fields.filter((f) => f.name in values && JSON.stringify(canonicalExisting(f, current[f.name])) !== JSON.stringify(values[f.name])).map((f) => f.name)
      : fields.filter((f) => f.name in values).map((f) => f.name);
    const sameSet = (a: string, b: string) => a.split(",").filter(Boolean).sort().join(",") === b.split(",").filter(Boolean).sort().join(",");
    if (entity === "students" && current && !sameSet(str(current.enrolled_subject_ids), String(values.enrolled_subject_ids)) && !changedFields.includes("subject_ids")) changedFields.push("subject_ids");
    const action: PlannedRow["action"] = !current ? "create" : changedFields.length ? "update" : "unchanged";
    if (entity === "rooms" && current && "room_type" in values && str(current.room_type).toUpperCase() !== values.room_type) {
      warnings.push({ line, key, field: "room_type", code: "ROOM_TYPE_CHANGE", message: `${key} changes from ${str(current.room_type)} to ${values.room_type}. Schedules that use this room will be revalidated against the new type.` });
    }
    const previous = current ? Object.fromEntries(changedFields.map((name) => [name, name === "subject_ids" ? str(current.enrolled_subject_ids) : current[name] ?? null])) : null;
    planned.push({ line, key, action, values: { [spec.key]: key, ...values }, changedFields, previous, ...(addSubjects ? { addSubjects, keptSubjects } : {}) });
  }

  // Dataset-level check: the existing quality report on the data as it would be after the import.
  let quality: ImportPlan["quality"] = null;
  if (ctx.quality) {
    const before = validateDataQuality(ctx.quality);
    const after = validateDataQuality(mergeQuality(entity, ctx.quality, planned));
    const seen = new Set(before.errors.map((e) => `${e.code}|${e.table}|${e.rowId}|${e.field}`));
    const newErrors = after.errors.filter((e) => !seen.has(`${e.code}|${e.table}|${e.rowId}|${e.field}`));
    quality = { before: before.readinessScore, after: after.readinessScore, newErrors };
  }

  const writes = planned.filter((p) => p.action !== "unchanged");
  const summary = {
    create: planned.filter((p) => p.action === "create").length,
    update: planned.filter((p) => p.action === "update").length,
    unchanged: planned.filter((p) => p.action === "unchanged").length,
    enrollmentsToAdd: planned.reduce((n, p) => n + (p.addSubjects?.length ?? 0), 0),
  };
  const canCommit = errors.length === 0 && (quality?.newErrors.length ?? 0) === 0 && writes.length > 0;
  return {
    entity, table: spec.table, mode, columns: header, parsedRows: parsed.records.length,
    validRows: planned.length, invalidRows: badLines.size, duplicateKeys, errors, warnings, rows: planned, summary, quality, canCommit,
    planHash: hash(JSON.stringify([entity, mode, writes.map((p) => [p.key, p.action, p.values, p.previous, p.addSubjects ?? null])])),
  };
}

/** The quality tables with the planned rows applied, keyed by primary key. */
function mergeQuality(entity: ImportEntity, tables: QualityTables, rows: PlannedRow[]): QualityTables {
  const spec = ENTITY_SPECS[entity];
  const field: keyof QualityTables = entity === "student_groups" ? "studentGroups" : entity === "students" ? "students" : entity;
  const current = (tables[field] ?? []) as Row[];
  const byKey = new Map(current.map((r) => [str(r[spec.key]).toUpperCase(), { ...r }]));
  for (const p of rows) byKey.set(p.key, { ...(byKey.get(p.key) ?? {}), ...p.values });
  const next: QualityTables = { ...tables, [field]: [...byKey.values()] };
  if (entity === "students" && tables.enrollments) {
    next.enrollments = [...tables.enrollments, ...rows.flatMap((p) => (p.addSubjects ?? []).map((subject_id) => ({ roll_no: p.key, subject_id })))];
  }
  return next;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/** Header-only template in the canonical column order. */
export function templateCsv(entity: ImportEntity) {
  return stringify([ENTITY_SPECS[entity].fields.map((f) => f.name)]);
}

/**
 * Canonical export: the same columns as the template, so an exported file
 * re-imports without changing anything (every row is "unchanged").
 */
export function exportEntityCsv(entity: ImportEntity, rows: Row[], enrollments?: Map<string, Set<string>>) {
  const spec = ENTITY_SPECS[entity];
  const out = [...rows].sort((a, b) => str(a[spec.key]).localeCompare(str(b[spec.key]))).map((row) => spec.fields.map((f) => {
    if (f.name === "subject_ids") return [...(enrollments?.get(str(row.roll_no)) ?? [])].sort().join("|");
    const value = row[f.name];
    if (value === null || value === undefined) return "";
    if (f.kind === "bool") return value === true || value === "true" ? "true" : "false";
    if (f.kind === "date") return String(value).slice(0, 10);
    if (f.kind === "slotList") return parseSlotList(String(value)).join("|");
    return String(value);
  }));
  return stringify([spec.fields.map((f) => f.name), ...out]);
}
