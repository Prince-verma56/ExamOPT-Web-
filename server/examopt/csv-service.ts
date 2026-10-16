import "server-only";

import { querySupabase } from "@/lib/supabase";
import { auditService } from "@/server/audit";
import { fetchAllRows, loadRawDataset } from "@/server/scheduling/loader";
import { ENTITY_SPECS, exportEntityCsv, planImport, templateCsv, type ImportContext, type ImportEntity, type ImportMode, type ImportPlan } from "./csv-import";
import { applyFixes, suggestFixes, type FixAction } from "./csv-fixes";
import { ExamOptRepositoryError } from "./repository";

type Row = Record<string, unknown>;
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value)).trim();
const inList = (ids: string[]) => `in.(${ids.map((id) => `"${id.replace(/"/g, "")}"`).join(",")})`;

/** Current rows and references, read through the same PostgREST path the scheduler uses. */
async function loadContext(entity: ImportEntity): Promise<ImportContext> {
  const spec = ENTITY_SPECS[entity];
  const [raw, existing] = await Promise.all([loadRawDataset(), fetchAllRows<Row>(spec.table, "*", `${spec.key}.asc`)]);
  const enrollments = new Map<string, Set<string>>();
  for (const e of raw.enrollments) {
    const roll = str(e.roll_no).toUpperCase();
    if (!enrollments.has(roll)) enrollments.set(roll, new Set());
    enrollments.get(roll)!.add(str(e.subject_id).toUpperCase());
  }
  return {
    existing,
    slotIds: new Set(raw.timeslots.map((s) => str(s.slot_id).toUpperCase())),
    subjectIds: new Set(raw.subjects.map((s) => str(s.subject_id).toUpperCase())),
    groupIds: new Set(raw.studentGroups.map((g) => str(g.group_id).toUpperCase())),
    slots: raw.timeslots.map((s) => ({ slot_id: str(s.slot_id), exam_date: str(s.exam_date), session: str(s.session) })),
    enrollments,
    quality: { rooms: raw.rooms, timeslots: raw.timeslots, faculty: raw.faculty, subjects: raw.subjects, studentGroups: raw.studentGroups, students: raw.students, enrollments: raw.enrollments },
  };
}

function writeError(table: string, message: string): never {
  if (/\(409\)|duplicate key|23505/.test(message)) throw new ExamOptRepositoryError("IMPORT_CONFLICT", `The database refused the import into ${table}: a record with one of these keys already exists (it may have been added since your preview). Nothing was written.`, 409);
  if (/23503|foreign key/.test(message)) throw new ExamOptRepositoryError("IMPORT_REFERENCE", `The database refused the import into ${table}: a referenced record does not exist. Nothing was written.`, 409);
  if (/23514|check constraint/.test(message)) throw new ExamOptRepositoryError("IMPORT_CONSTRAINT", `The database refused the import into ${table}: a value is outside its allowed range. Nothing was written.`, 400);
  throw new ExamOptRepositoryError("PERSISTENCE_FAILED", `Could not write to ${table}. Nothing was committed.`, 502);
}

/** One PostgREST request, one SQL statement: the rows are written together or not at all. */
async function writeRows(table: string, rows: Row[], mode: ImportMode, key: string) {
  const result = await querySupabase<Row[]>(table, {
    method: "POST", useServiceRole: true, body: rows,
    ...(mode === "upsert" ? { query: { on_conflict: key }, prefer: ["resolution=merge-duplicates"] } : {}),
  });
  if (result.error) writeError(table, result.error.message);
  return result.data ?? [];
}

export const csvService = {
  template(entity: ImportEntity) {
    return { entity, filename: `ExamOpt_${entity}_template.csv`, csv: templateCsv(entity), fields: ENTITY_SPECS[entity].fields };
  },

  /** Canonical export of persisted rows, in the template's columns, re-importable unchanged. */
  async exportEntity(entity: ImportEntity) {
    const spec = ENTITY_SPECS[entity];
    const rows = await fetchAllRows<Row>(spec.table, "*", `${spec.key}.asc`);
    let enrollments: Map<string, Set<string>> | undefined;
    if (entity === "students") {
      enrollments = new Map();
      for (const e of await fetchAllRows<Row>("student_subject_enrollments", "roll_no,subject_id", "id.asc")) {
        const roll = str(e.roll_no);
        if (!enrollments.has(roll)) enrollments.set(roll, new Set());
        enrollments.get(roll)!.add(str(e.subject_id));
      }
    }
    return { entity, filename: `ExamOpt_${entity}_${new Date().toISOString().slice(0, 10)}.csv`, rows: rows.length, csv: exportEntityCsv(entity, rows, enrollments) };
  },

  /** Dry run: parse, validate and plan against the current data, with suggested fixes. Nothing is written. */
  async preview(entity: ImportEntity, mode: ImportMode, csv: string) {
    const ctx = await loadContext(entity);
    const plan: ImportPlan = planImport(entity, mode, csv, ctx);
    return { ...plan, fixes: suggestFixes(entity, plan, csv, ctx) };
  },

  /** Applies chosen fixes to the file and validates the corrected file again. Nothing is written to the database. */
  async fix(entity: ImportEntity, mode: ImportMode, csv: string, actions: FixAction[]) {
    const corrected = applyFixes(csv, actions.filter((a) => a.type === "set" || a.type === "removeRow"));
    return { csv: corrected.csv, applied: corrected.applied, preview: await this.preview(entity, mode, corrected.csv) };
  },

  /**
   * Commits a previewed import. The plan is rebuilt from fresh data and must
   * match the previewed one (`planHash`), so nothing the reviewer did not see
   * can be written. Each table is written in one statement. A students import
   * spans two tables without a database transaction (PostgREST offers none and
   * no RPC is installed), so a failure in the second write is compensated by
   * restoring the first. Written rows are read back and compared.
   */
  async commit(entity: ImportEntity, mode: ImportMode, csv: string, planHash: string, actor: { userId: string | null }) {
    const spec = ENTITY_SPECS[entity];
    const ctx = await loadContext(entity);
    const plan = planImport(entity, mode, csv, ctx);
    if (!plan.canCommit) throw new ExamOptRepositoryError("IMPORT_HAS_ERRORS", plan.errors.length || plan.quality?.newErrors.length ? "The file has errors; fix them and preview again. Nothing was written." : "Nothing to write: every row matches the current data.", 422);
    if (plan.planHash !== planHash) throw new ExamOptRepositoryError("PLAN_CHANGED", "The data changed since your preview, so the import would no longer do exactly what you reviewed. Preview again. Nothing was written.", 409);

    const writes = plan.rows.filter((r) => r.action !== "unchanged");
    const keys = writes.map((r) => r.key);
    let enrollmentsAdded = 0;
    let compensation: string | null = null;

    await writeRows(spec.table, writes.map((r) => r.values), mode, spec.key);

    if (entity === "students") {
      const pairs = writes.flatMap((r) => (r.addSubjects ?? []).map((subject_id) => ({ roll_no: r.key, subject_id })));
      if (pairs.length) {
        const result = await querySupabase<Row[]>("student_subject_enrollments", {
          method: "POST", useServiceRole: true, body: pairs, query: { on_conflict: "roll_no,subject_id" }, prefer: ["resolution=ignore-duplicates"],
        });
        if (result.error) {
          // Undo the first write: remove students this import created, restore the previous rows of those it updated.
          const created = writes.filter((r) => r.action === "create").map((r) => r.key);
          const previous = ctx.existing.filter((row) => writes.some((r) => r.action === "update" && r.key === str(row.roll_no).toUpperCase()))
            .map((row) => Object.fromEntries(Object.keys(writes[0].values).map((k) => [k, row[k]])));
          const undo = await Promise.all([
            created.length ? querySupabase("student_enrollments", { method: "DELETE", useServiceRole: true, query: { roll_no: inList(created) } }) : Promise.resolve({ error: null }),
            previous.length ? querySupabase("student_enrollments", { method: "POST", useServiceRole: true, body: previous, query: { on_conflict: "roll_no" }, prefer: ["resolution=merge-duplicates"] }) : Promise.resolve({ error: null }),
          ]);
          compensation = undo.every((u) => !u.error) ? "Student records were restored to their state before the import." : "Restoring the student records also failed; check the listed roll numbers manually.";
          throw new ExamOptRepositoryError("PERSISTENCE_FAILED", `Enrollments could not be written. ${compensation}`, 502);
        }
        enrollmentsAdded = (result.data ?? []).length;
      }
    }

    // Read back and compare every written column.
    const stored = await fetchAllRows<Row>(spec.table, "*", `${spec.key}.asc`, { [spec.key]: inList(keys) });
    const byKey = new Map(stored.map((row) => [str(row[spec.key]).toUpperCase(), row]));
    const mismatches: string[] = [];
    for (const w of writes) {
      const row = byKey.get(w.key);
      if (!row) { mismatches.push(`${w.key}: not found after write`); continue; }
      for (const [column, value] of Object.entries(w.values)) {
        const actual = row[column];
        const same = column === "exam_date" ? str(actual).slice(0, 10) === str(value)
          : typeof value === "number" ? Number(actual) === value
            : typeof value === "boolean" ? actual === value
              : value === null ? actual === null || actual === ""
                : str(actual) === str(value);
        if (!same) mismatches.push(`${w.key}.${column}`);
      }
    }
    if (entity === "students") {
      const pairs = await fetchAllRows<Row>("student_subject_enrollments", "roll_no,subject_id", "id.asc", { roll_no: inList(keys) });
      const have = new Set(pairs.map((p) => `${str(p.roll_no).toUpperCase()}|${str(p.subject_id).toUpperCase()}`));
      for (const w of writes) for (const s of w.addSubjects ?? []) if (!have.has(`${w.key}|${s}`)) mismatches.push(`${w.key} enrollment ${s}`);
    }

    const committed = { created: writes.filter((r) => r.action === "create").length, updated: writes.filter((r) => r.action === "update").length, unchanged: plan.summary.unchanged, enrollmentsAdded };
    // Counts and keys only: no names or other record contents in logs.
    console.info(`[import] ${entity} ${mode} by ${actor.userId ?? "unknown"}: ${JSON.stringify(committed)}, verified=${mismatches.length === 0}`);
    await auditService.audit({ actorId: actor.userId ?? "unknown", action: "data.import", resource: entity, resourceId: plan.planHash, metadata: { mode, ...committed, verified: mismatches.length === 0 } });
    return { entity, mode, table: spec.table, committed, verified: mismatches.length === 0, mismatches, keys };
  },
};
