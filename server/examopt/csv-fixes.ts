import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { parseSlotList, parseTimeRange } from "@/server/scheduling/normalize";
import { twelveHour } from "@/server/scheduling/export";
import { ENTITY_SPECS, IMPORT_ENTITIES, parseCsvWithLines, type ImportContext, type ImportEntity, type ImportMode, type ImportPlan } from "./csv-import";

/**
 * Suggested corrections for the problems a CSV dry run found, and a way to
 * apply chosen corrections to the file. Pure functions: nothing is written to
 * the database. Every suggestion is derived from the file and the current data
 * (existing slots, groups, room capacities, free laboratories); a corrected
 * file is always validated again before it can be imported.
 */

export type FixAction =
  | { type: "set"; line: number; field: string; value: string }
  | { type: "removeRow"; line: number }
  | { type: "switchMode"; mode: ImportMode }
  | { type: "switchEntity"; entity: ImportEntity };

export interface FixOption {
  label: string;
  /** Safe to apply without a human choice; used by "Apply all safe fixes". */
  auto: boolean;
  actions: FixAction[];
}

export interface PlanFixes {
  /** The table this file's columns match, when it is not the selected one. */
  detectedEntity: ImportEntity | null;
  /** Options per entry of `plan.errors` (same order). */
  rows: FixOption[][];
  /** Options per entry of `plan.quality.newErrors` (same order). */
  dataset: FixOption[][];
  /** How many problems have a safe automatic fix. */
  autoFixable: number;
}

type Row = Record<string, unknown>;
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value)).trim();

function distance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  }
  return dp[a.length][b.length];
}

const closest = (value: string, options: string[]) => [...options].sort((x, y) => distance(value.toUpperCase(), x) - distance(value.toUpperCase(), y) || x.localeCompare(y));

/** The table whose columns this header matches: every column known and every required column present. */
export function detectEntity(header: string[]): ImportEntity | null {
  for (const entity of IMPORT_ENTITIES) {
    const spec = ENTITY_SPECS[entity];
    const names = new Set(spec.fields.map((f) => f.name));
    if (header.length && header.every((h) => names.has(h)) && spec.fields.every((f) => !f.required || header.includes(f.name))) return entity;
  }
  return null;
}

const isLabRoom = (r: Row) => str(r.room_type).toUpperCase() === "LAB";
const isLabSubject = (v: unknown) => v === true || ["true", "1", "yes"].includes(str(v).toLowerCase());

export function suggestFixes(entity: ImportEntity, plan: ImportPlan, csv: string, ctx: ImportContext): PlanFixes {
  const spec = ENTITY_SPECS[entity];
  const parsed = parseCsvWithLines(csv);
  const byLine = new Map(parsed.records.map((r) => [r.line, r.row]));
  const lineOfKey = new Map<string, number>();
  for (const r of parsed.records) { const k = str(r.row[spec.key]).toUpperCase(); if (k && !lineOfKey.has(k)) lineOfKey.set(k, r.line); }
  const usedKeys = new Set([...ctx.existing.map((r) => str(r[spec.key]).toUpperCase()), ...lineOfKey.keys()]);
  const unique = (base: string) => { let i = 2, candidate = `${base}-${i}`; while (usedKeys.has(candidate)) candidate = `${base}-${++i}`; usedKeys.add(candidate); return candidate; };
  const detected = detectEntity(parsed.header);
  const detectedEntity = detected && detected !== entity ? detected : null;

  const rows = plan.errors.map((issue): FixOption[] => {
    const record = byLine.get(issue.line) ?? {};
    const raw = str(record[issue.field]);
    const field = spec.fields.find((f) => f.name === issue.field);
    const set = (value: string | number, label: string, auto = true): FixOption => ({ label, auto, actions: [{ type: "set", line: issue.line, field: issue.field, value: String(value) }] });
    const remove = (label = "Remove this row", auto = false): FixOption => ({ label, auto, actions: [{ type: "removeRow", line: issue.line }] });

    switch (issue.code) {
      case "UNKNOWN_COLUMN":
      case "MISSING_COLUMN":
        return detectedEntity ? [{ label: `This is a ${ENTITY_SPECS[detectedEntity].label.toLowerCase()} file: switch table`, auto: true, actions: [{ type: "switchEntity", entity: detectedEntity }] }] : [];
      case "ALREADY_EXISTS":
        return [remove(`Skip this row (${issue.key} already exists)`, true), { label: "Update existing records instead (\"Add or update\")", auto: false, actions: [{ type: "switchMode", mode: "upsert" }] }];
      case "DUPLICATE_KEY": {
        const lines = parsed.records.filter((r) => str(r.row[spec.key]).toUpperCase() === issue.key).map((r) => r.line);
        if (lines[0] === issue.line) return [remove("Remove this row (keep the later one)")];
        const renamed = unique(issue.key!);
        return [set(renamed, `Rename to ${renamed}`), remove()];
      }
      case "INVALID_ID": {
        const cleaned = raw.toUpperCase().replace(/[^A-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 50);
        if (!cleaned) return [remove()];
        const value = usedKeys.has(cleaned) ? unique(cleaned) : (usedKeys.add(cleaned), cleaned);
        return [set(value, `Use ${value}`), remove()];
      }
      case "TOO_LONG":
        return [set(raw.slice(0, 255), "Shorten to 255 characters")];
      case "REQUIRED":
        return field?.fallback !== undefined && field.fallback !== null ? [set(String(field.fallback), `Use the default (${field.fallback})`)] : [remove()];
      case "INVALID_INTEGER": {
        const digits = raw.match(/-?\d+/)?.[0];
        if (digits !== undefined) return [set(Number.parseInt(digits, 10), `Use ${Number.parseInt(digits, 10)}`), remove()];
        return field?.fallback !== undefined && field.fallback !== null ? [set(String(field.fallback), `Use ${field.fallback} (default)`), remove()] : [remove()];
      }
      case "OUT_OF_RANGE": {
        const n = Number.parseInt(raw, 10);
        if (issue.field === "duration_hours") {
          const lab = isLabSubject(record.requires_lab) || /P$/.test(str(record.subject_id).toUpperCase());
          return [set(lab ? 2 : 3, `Use ${lab ? 2 : 3} hours (standard for a ${lab ? "practical" : "theory"} exam)`), set(lab ? 3 : 2, `Use ${lab ? 3 : 2} hours`, false)];
        }
        const value = Math.min(field?.max ?? n, Math.max(field?.min ?? n, n));
        return [set(value, `Use ${value} (allowed ${field?.min}–${field?.max})`), remove()];
      }
      case "INVALID_BOOLEAN": {
        const guess = issue.field === "requires_lab" ? /P$/.test(str(record.subject_id).toUpperCase()) || /\b(lab|practical)\b/i.test(str(record.name)) : false;
        return [set(String(guess), `Set to ${guess}${issue.field === "requires_lab" ? (guess ? " (name or code says practical)" : " (theory exam)") : ""}`), set(String(!guess), `Set to ${!guess}`, false)];
      }
      case "INVALID_VALUE": {
        const ranked = closest(raw, field?.options ?? []);
        return ranked.slice(0, 3).map((option, i) => set(option, `Use ${option}${i === 0 ? " (closest match)" : ""}`, i === 0));
      }
      case "INVALID_TIME_RANGE": {
        const { start, end } = parseTimeRange(raw);
        return Number.isFinite(start) && Number.isFinite(end) && end < start ? [set(`${twelveHour(end)} - ${twelveHour(start)}`, "Swap start and end")] : [];
      }
      case "UNKNOWN_SLOT": {
        if (field?.kind === "slotList") {
          const known = parseSlotList(raw).map((s) => s.toUpperCase()).filter((s) => ctx.slotIds.has(s));
          return [set(known.join("|"), known.length ? `Keep only existing slots (${known.join(", ")})` : "Clear the unknown slots")];
        }
        const near = closest(raw, [...ctx.slotIds]).slice(0, 2);
        return [set("", "Clear the fixed slot"), ...near.map((s) => set(s, `Fix to ${s} instead`, false))];
      }
      case "UNKNOWN_GROUP": {
        const near = closest(raw, [...ctx.groupIds]).slice(0, 2);
        return [...near.map((g, i) => set(g, `Use group ${g}`, i === 0 && distance(raw.toUpperCase(), g) <= 2)), remove()];
      }
      case "UNKNOWN_SUBJECT": {
        const known = raw.split(/[|,;]+/).map((s) => s.trim().toUpperCase()).filter((s) => ctx.subjectIds.has(s));
        return known.length ? [set(known.join("|"), `Keep only existing subjects (${known.join(", ")})`), remove()] : [remove()];
      }
      case "CONTRADICTORY_CONSTRAINTS": {
        const fixed = str(record.fixed_slot).toUpperCase();
        const rest = parseSlotList(str(record.unavailable_slots)).map((s) => s.toUpperCase()).filter((s) => s !== fixed);
        return [
          { label: `Remove ${fixed} from the unavailable slots`, auto: true, actions: [{ type: "set", line: issue.line, field: "unavailable_slots", value: rest.join("|") }] },
          { label: "Clear the fixed slot instead", auto: false, actions: [{ type: "set", line: issue.line, field: "fixed_slot", value: "" }] },
        ];
      }
      case "DUPLICATE_DATE_SESSION": {
        const other = str(record.session).toUpperCase() === "MORNING" ? "EVENING" : "MORNING";
        const date = str(record.exam_date);
        const taken = ctx.slots.some((s) => str(s.exam_date).slice(0, 10) === date && str(s.session).toUpperCase() === other) || parsed.records.some((r) => r.line !== issue.line && str(r.row.exam_date) === date && str(r.row.session).toUpperCase() === other);
        return [...(taken ? [] : [set(other, `Make it the ${other.toLowerCase()} session`)]), remove()];
      }
      default:
        return [];
    }
  });

  // Dataset-level conflicts: only rows from this file can be corrected here.
  const quality = ctx.quality;
  const rooms = (quality?.rooms ?? []) as Row[];
  const maxTheory = Math.max(0, ...rooms.filter((r) => !isLabRoom(r)).map((r) => Number(r.capacity) || 0));
  const maxLab = Math.max(0, ...rooms.filter(isLabRoom).map((r) => Number(r.capacity) || 0));
  const labUnavailable = rooms.filter(isLabRoom).map((r) => parseSlotList(str(r.unavailable_slots)).map((s) => s.toUpperCase()));
  const labsFree = (slot: string) => labUnavailable.filter((u) => !u.includes(slot)).length;
  const fixedLabs = new Map<string, number>();
  if (entity === "subjects") {
    const merged = new Map(((quality?.subjects ?? []) as Row[]).map((s) => [str(s.subject_id).toUpperCase(), s]));
    for (const p of plan.rows) merged.set(p.key, { ...(merged.get(p.key) ?? {}), ...p.values });
    for (const s of merged.values()) if (isLabSubject(s.requires_lab) && str(s.fixed_slot)) fixedLabs.set(str(s.fixed_slot).toUpperCase(), (fixedLabs.get(str(s.fixed_slot).toUpperCase()) ?? 0) + 1);
  }
  const slotOrder = [...ctx.slots].sort((a, b) => str(a.exam_date).localeCompare(str(b.exam_date)) || (str(a.session).toUpperCase() === "MORNING" ? -1 : 1)).map((s) => str(s.slot_id).toUpperCase());

  const dataset = (plan.quality?.newErrors ?? []).map((issue): FixOption[] => {
    if (entity !== "subjects") return [];
    const line = lineOfKey.get(str(issue.rowId).toUpperCase());
    const setOn = (l: number, f: string, value: string | number, label: string, auto = true): FixOption => ({ label, auto, actions: [{ type: "set", line: l, field: f, value: String(value) }] });
    switch (issue.code) {
      case "CAPACITY_OVERFLOW":
        return line ? [setOn(line, "enrolled_students", maxTheory, `Cap the declared enrollment at ${maxTheory} (largest theory room)`), setOn(line, "enrolled_students", 0, "Declare 0 (no students enrolled yet)", false)] : [];
      case "LAB_CAPACITY_OVERFLOW":
        return line ? [setOn(line, "enrolled_students", maxLab, `Cap the declared enrollment at ${maxLab} (largest laboratory)`), setOn(line, "enrolled_students", 0, "Declare 0 (no students enrolled yet)", false)] : [];
      case "LAB_BOTTLENECK": {
        const slot = str(issue.rowId).toUpperCase();
        const excess = (fixedLabs.get(slot) ?? 0) - labsFree(slot);
        // Practicals from this file fixed to the crowded slot, last ones first.
        const movable = plan.rows.filter((p) => str(p.values.fixed_slot).toUpperCase() === slot && isLabSubject(p.values.requires_lab)).reverse().slice(0, Math.max(0, excess));
        if (!movable.length) return [];
        const load = new Map(fixedLabs);
        const moves: { line: number; key: string; to: string }[] = [];
        for (const p of movable) {
          const blocked = parseSlotList(str(p.values.unavailable_slots)).map((s) => s.toUpperCase());
          const to = slotOrder.find((s) => s !== slot && !blocked.includes(s) && (load.get(s) ?? 0) < labsFree(s));
          if (!to) continue;
          load.set(to, (load.get(to) ?? 0) + 1);
          moves.push({ line: p.line, key: p.key, to });
        }
        const options: FixOption[] = [];
        if (moves.length === movable.length) {
          options.push({ label: `Move ${moves.map((m) => `${m.key} to ${m.to}`).join(", ")} (slots with a free laboratory)`, auto: true, actions: moves.map((m) => ({ type: "set", line: m.line, field: "fixed_slot", value: m.to })) });
        }
        options.push({ label: `Unfix ${movable.map((p) => p.key).join(", ")} and let the scheduler choose`, auto: moves.length !== movable.length, actions: movable.map((p) => ({ type: "set", line: p.line, field: "fixed_slot", value: "" })) });
        return options;
      }
      default:
        return [];
    }
  });

  const autoFixable = [...rows, ...dataset].filter((options) => options.some((o) => o.auto)).length;
  return { detectedEntity, rows, dataset, autoFixable };
}

/**
 * Applies cell edits and row removals to a CSV file (line numbers as reported
 * by the dry run; the header is line 1). Returns the corrected file.
 */
export function applyFixes(csv: string, actions: FixAction[]): { csv: string; applied: number } {
  const records = parse(csv, { info: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true }) as unknown as { record: string[]; info: { lines: number } }[];
  if (!records.length) return { csv, applied: 0 };
  const header = records[0].record.map((h) => h.trim().toLowerCase());
  const removed = new Set(actions.filter((a): a is Extract<FixAction, { type: "removeRow" }> => a.type === "removeRow").map((a) => a.line));
  let applied = 0;
  const out: string[][] = [records[0].record.map((h) => h.trim())];
  for (const { record, info } of records.slice(1)) {
    if (removed.has(info.lines)) { applied++; continue; }
    const row = [...record];
    for (const a of actions) {
      if (a.type !== "set" || a.line !== info.lines) continue;
      const index = header.indexOf(a.field.toLowerCase());
      if (index === -1) continue;
      while (row.length <= index) row.push("");
      row[index] = a.value;
      applied++;
    }
    out.push(row);
  }
  return { csv: stringify(out), applied };
}
