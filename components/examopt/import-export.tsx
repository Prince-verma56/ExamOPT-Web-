"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert, Database, Download, FileDown, FileSpreadsheet, Info, Loader2, ShieldCheck, TriangleAlert, Upload } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/components/scheduling/api";
import { PageIntro } from "@/components/scheduling/page-intro";
import { ExportMenu } from "@/components/scheduling/publish-panel";
import { QualityIssues, QualityScore } from "@/components/scheduling/quality-report";
import { Segmented } from "@/components/scheduling/segmented";
import { REFERENCE_VARIANTS, type ReferenceVariant } from "@/server/scheduling/reference-samples";
import type { DataQualityReport } from "@/server/scheduling/data-quality";
import type { ImportEntity, ImportMode } from "@/server/examopt/csv-import";
import type { FixAction } from "@/server/examopt/csv-fixes";
import type { csvService } from "@/server/examopt/csv-service";
import { ResolvePanel, type ImportPreview } from "./import-resolve";

type CommitResult = Awaited<ReturnType<typeof csvService.commit>>;
type Template = ReturnType<typeof csvService.template>;
type FixResult = Awaited<ReturnType<typeof csvService.fix>>;
type ResultFilter = "all" | "create" | "update" | "unchanged" | "issues";

export const ENTITY_META: Record<ImportEntity, { label: string; page: string }> = {
  subjects: { label: "Subjects", page: "/admin/data/subjects" },
  rooms: { label: "Rooms & labs", page: "/admin/data/rooms" },
  timeslots: { label: "Time slots", page: "/admin/data/time-slots" },
  student_groups: { label: "Student groups", page: "/admin/data/student-groups" },
  students: { label: "Students", page: "/admin/data/students" },
  faculty: { label: "Faculty", page: "/admin/data/faculty" },
};
const ENTITIES = Object.keys(ENTITY_META) as ImportEntity[];

function saveText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ImportExport({ initialEntity }: { initialEntity?: ImportEntity }) {
  const [entity, setEntity] = useState<ImportEntity>(initialEntity ?? "subjects");
  const [mode, setMode] = useState<ImportMode>("insert");
  const [csv, setCsv] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [plan, setPlan] = useState<ImportPreview | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"preview" | "commit" | "fix" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [corrected, setCorrected] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [guide, setGuide] = useState<Template | null>(null);
  const [rowFilter, setRowFilter] = useState<ResultFilter>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  // Any change to the input invalidates the preview: a commit must match what was reviewed.
  const resetPlan = () => { setPlan(null); setReviewed(false); setResult(null); setError(null); setNotice(null); setRowFilter("all"); };
  const selectEntity = (next: ImportEntity) => {
    setEntity(next); setGuide(null);
    if (csv.trim()) void preview(csv, next, mode);
    else resetPlan();
  };
  const selectMode = (next: ImportMode) => {
    setMode(next);
    if (csv.trim()) void preview(csv, entity, next);
    else resetPlan();
  };

  /**
   * Dry run. When the file's columns belong to another table than the one
   * selected, the table is switched and the file validated again.
   */
  async function preview(text = csv, forEntity = entity, forMode = mode, detectTable = true) {
    if (!text.trim()) return;
    setBusy("preview"); setPlan(null); setReviewed(false); setResult(null); setError(null); setNotice(null); setRowFilter("all");
    try {
      let next = await api<ImportPreview>("/data/import/preview", { json: { entity: forEntity, mode: forMode, csv: text } });
      const detected = next.fixes.detectedEntity;
      if (detectTable && detected && next.errors.length && next.errors.every((e) => e.line <= 1)) {
        setNotice(`This file has the ${ENTITY_META[detected].label} columns, so the table was switched from ${ENTITY_META[forEntity].label} to ${ENTITY_META[detected].label}.`);
        setEntity(detected); setGuide(null);
        next = await api<ImportPreview>("/data/import/preview", { json: { entity: detected, mode: forMode, csv: text } });
      }
      setPlan(next);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  /** Loads a dropped or chosen file and validates it straight away (a dry run writes nothing). */
  async function loadFile(file: File) {
    if (!/\.csv$/i.test(file.name) && file.type && !file.type.includes("csv") && file.type !== "text/plain") { setError(`${file.name} is not a CSV file.`); return; }
    if (file.size > 2_000_000) { setError("Files larger than 2 MB are not accepted."); return; }
    const text = await file.text();
    setCsv(text); setSource(file.name); setCorrected(false); setNotice(null);
    await preview(text);
  }

  /** Applies chosen fixes: mode and table switches re-validate; cell edits and row removals correct the file, then re-validate. */
  async function applyFix(actions: FixAction[], description: string) {
    const switchMode = actions.find((a): a is Extract<FixAction, { type: "switchMode" }> => a.type === "switchMode");
    const switchEntity = actions.find((a): a is Extract<FixAction, { type: "switchEntity" }> => a.type === "switchEntity");
    if (switchMode) { setMode(switchMode.mode); setNotice(`Switched to "Add or update": rows that already exist will update them.`); await preview(csv, entity, switchMode.mode); return; }
    if (switchEntity) { setEntity(switchEntity.entity); setGuide(null); setNotice(`Switched the table to ${ENTITY_META[switchEntity.entity].label}.`); await preview(csv, switchEntity.entity, mode); return; }
    setBusy("fix"); setError(null); setReviewed(false);
    try {
      const r = await api<FixResult>("/data/import/fix", { json: { entity, mode, csv, actions } });
      const left = r.preview.errors.length + (r.preview.quality?.newErrors.length ?? 0);
      setCsv(r.csv); setPlan(r.preview); setCorrected(true);
      setNotice(`Applied ${description} (${r.applied} change${r.applied === 1 ? "" : "s"} to the file). Re-validated: ${left ? `${left} conflict${left === 1 ? "" : "s"} left` : "no conflicts left"}.`);
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  async function commit() {
    if (!plan) return;
    setBusy("commit"); setError(null);
    try {
      const r = await api<CommitResult>("/data/import/commit", { json: { entity, mode, csv, planHash: plan.planHash } });
      setResult(r);
      toast.success(`Imported ${r.committed.created + r.committed.updated} ${ENTITY_META[entity].label.toLowerCase()} records`, { description: r.verified ? "Read back from the database and verified." : "Written, but verification found differences." });
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(null); }
  }

  async function download(kind: "export" | "template", which: ImportEntity = entity) {
    try {
      const data = await api<{ filename: string; csv: string; rows?: number }>(`/data/export?entity=${which}${kind === "template" ? "&template=1" : ""}`);
      saveText(data.filename, data.csv);
      if (kind === "export") toast.success(`Exported ${data.rows} rows`, { description: data.filename });
    } catch (e) { toast.error(kind === "export" ? "Export failed" : "Template download failed", { description: errorMessage(e) }); }
  }

  async function showGuide() {
    try { setGuide(await api<Template>(`/data/export?entity=${entity}&template=1`)); } catch (e) { setError(errorMessage(e)); }
  }

  const writes = plan ? plan.summary.create + plan.summary.update : 0;
  const noRowsToImport = Boolean(plan && plan.parsedRows === 0 && plan.errors.length === 1 && plan.errors[0].code === "EMPTY_FILE" && !plan.quality?.newErrors.length);
  const issueCount = (plan?.errors.length ?? 0) + (plan?.quality?.newErrors.length ?? 0);
  const visibleIssues = rowFilter === "issues" && plan
    ? [
        ...plan.errors.map((issue) => ({ line: issue.line ? String(issue.line) : "File", record: issue.key ?? issue.field ?? "—", problem: `${issue.code}: ${issue.message}` })),
        ...(plan.quality?.newErrors ?? []).map((issue) => ({ line: "Dataset", record: `${issue.rowId} · ${issue.table}.${issue.field}`, problem: `${issue.code}: ${issue.message}` })),
      ]
    : [];
  const rowFilterOptions = plan ? [
    { value: "all" as const, label: `All rows (${plan.rows.length + new Set(plan.errors.filter((e) => e.line > 1).map((e) => e.line)).size})` },
    { value: "create" as const, label: `New (${plan.summary.create})` },
    { value: "update" as const, label: `Updates (${plan.summary.update})` },
    { value: "unchanged" as const, label: `Unchanged (${plan.summary.unchanged})` },
    { value: "issues" as const, label: `Problems (${issueCount})` },
  ] : [];
  const visibleRows = plan?.rows.filter((row) => rowFilter === "all" || row.action === rowFilter) ?? [];

  return (
    <div className="space-y-10 pb-8">
      <PageIntro eyebrow="Operations" title="Import & Export" description="Import CSV files into the scheduling database in two separate steps: a dry-run validation you review, then a confirmed commit that is read back and verified. Export any table in the same format." />

      <section className="space-y-4" aria-labelledby="import-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="import-heading" className="text-sm font-semibold">Import a CSV file</h2>
          <p className="text-xs text-muted-foreground">Imports add or update records. They never delete records or enrollments.</p>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="max-w-full overflow-x-auto"><Segmented label="Table to import" value={entity} onChange={selectEntity} options={ENTITIES.map((e) => ({ value: e, label: ENTITY_META[e].label }))} /></div>
            <Segmented label="Import mode" value={mode} onChange={selectMode} options={[{ value: "insert", label: "Add new only" }, { value: "upsert", label: "Add or update" }]} />
          </div>
          <p className="text-xs text-muted-foreground">
            {mode === "insert" ? "Add new only: a row whose identifier already exists is an error." : "Add or update: new identifiers are created; existing ones are updated where values differ. Blank optional cells keep the current value."}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void download("template")}><FileDown />Template</Button>
            <Button variant="ghost" size="sm" onClick={() => (guide ? setGuide(null) : void showGuide())}>{guide ? "Hide column guide" : "Column guide"}</Button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadFile(f); e.target.value = ""; }} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; if (!dragging) setDragging(true); }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false); }}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void loadFile(f); }}
            aria-label="Upload a CSV file: drop it here or press to choose a file"
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none",
              dragging ? "border-primary bg-primary/6" : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            {busy === "preview" ? <Loader2 className="size-7 animate-spin text-primary" /> : <Upload className={cn("size-7", dragging ? "text-primary" : "text-muted-foreground")} />}
            <span className="text-sm font-medium">{dragging ? "Drop the CSV file to validate it" : "Drag and drop a CSV file here, or click to choose"}</span>
            <span className="text-xs text-muted-foreground">It is validated immediately as a dry run; nothing is written until you confirm. The table is detected from the columns.</span>
            {source && <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-0.5 text-xs"><FileSpreadsheet className="size-3.5 text-primary" />{source}{corrected ? " (corrected)" : ""}</span>}
          </button>
          {guide && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs"><thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-1.5 font-medium">Column</th><th className="px-3 py-1.5 font-medium">Required</th><th className="px-3 py-1.5 font-medium">Meaning</th><th className="px-3 py-1.5 font-medium">Example</th></tr></thead>
                <tbody>{guide.fields.map((f) => <tr key={f.name} className="border-t"><td className="px-3 py-1.5 font-mono font-semibold">{f.name}</td><td className="px-3 py-1.5">{f.required ? "yes" : "no"}</td><td className="px-3 py-1.5 text-muted-foreground">{f.description}</td><td className="px-3 py-1.5 font-mono">{f.example || "(blank)"}</td></tr>)}</tbody></table>
            </div>
          )}
          <details className="rounded-lg border" open={!source}>
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium">{source ? "View or edit the CSV text" : "Or paste CSV text"}</summary>
            <Textarea value={csv} onChange={(e) => { setCsv(e.target.value); setSource("Pasted text"); setCorrected(false); resetPlan(); }} placeholder="Paste CSV here" className="min-h-36 rounded-t-none border-0 border-t font-mono text-xs" spellCheck={false} aria-label="CSV content" />
          </details>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Step 1.</span> Validate: checks headers, types, duplicates, references and the dataset as a whole. Nothing is written.</p>
            <Button disabled={busy !== null || !csv.trim()} onClick={() => void preview()}>{busy === "preview" ? <Loader2 className="animate-spin" /> : <ShieldCheck />}Validate (dry run)</Button>
          </div>
        </div>

        {error && <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
        {notice && <p className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/4 p-3 text-sm"><Info className="mt-0.5 size-4 shrink-0 text-primary" />{notice}</p>}

        {plan && (
          <div className="space-y-4 rounded-xl border bg-card p-5" aria-live="polite">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Dry-run result: {ENTITY_META[plan.entity].label} ({plan.mode === "insert" ? "add new only" : "add or update"})</p>
                <p className="text-xs text-muted-foreground">{source ?? "Pasted text"} · columns {plan.columns.join(", ") || "none"} · nothing has been written</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", plan.canCommit ? "border-success/40 text-success" : "border-destructive/30 text-destructive")}>
                {plan.canCommit ? <CheckCircle2 className="size-3.5" /> : noRowsToImport ? <Info className="size-3.5" /> : <CircleAlert className="size-3.5" />}{plan.canCommit ? "Ready to import" : noRowsToImport ? corrected ? "No rows left to import" : "No data rows to import" : plan.errors.length || plan.quality?.newErrors.length ? "Needs attention: fix the errors" : "Nothing to import"}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 lg:grid-cols-8">
              {[["Parsed rows", plan.parsedRows], ["Valid", plan.validRows], ["Invalid", plan.invalidRows], ["Duplicate keys", plan.duplicateKeys.length], ["To create", plan.summary.create], ["To update", plan.summary.update], ["Unchanged", plan.summary.unchanged], ...(plan.entity === "students" ? [["Enrollments to add", plan.summary.enrollmentsToAdd]] : [])].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border p-2.5"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value}</dd></div>
              ))}
            </dl>
            {plan.quality && (
              <p className="text-xs text-muted-foreground">Data quality report on the whole dataset: {plan.quality.before}/100 now, {plan.quality.after}/100 after this import.{plan.quality.newErrors.length > 0 && <span className="text-destructive"> This import would introduce {plan.quality.newErrors.length} new dataset error{plan.quality.newErrors.length === 1 ? "" : "s"}, so it is blocked.</span>}</p>
            )}

            {noRowsToImport ? (
              <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                {corrected ? "There are no data rows left in this file." : "This file has a header but no data rows."} Add at least one row to import, or download the CSV for your records. Nothing has been written.
              </p>
            ) : <ResolvePanel plan={plan} busy={busy !== null} onApply={(actions, description) => { setRowFilter("all"); void applyFix(actions, description); }} />}
            {corrected && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                <span>The corrected file is now shown in the preview below. Your original file is unchanged on your computer; nothing has been written to the database yet.</span>
                <Button size="sm" variant="outline" onClick={() => saveText(`${(source ?? "import").replace(/\.csv$/i, "")}-corrected.csv`, csv)}><Download />Download corrected CSV</Button>
              </div>
            )}
            {corrected && (
              <details className="rounded-lg border" open={noRowsToImport}>
                <summary className="cursor-pointer px-3 py-2 text-xs font-medium">View corrected CSV text</summary>
                <pre className="max-h-64 overflow-auto border-t bg-muted/20 p-3 text-xs whitespace-pre-wrap">{csv}</pre>
              </details>
            )}
            {plan.warnings.length > 0 && (
              <ul className="space-y-1 text-xs">{plan.warnings.slice(0, 50).map((w, i) => <li key={i} className="flex gap-1.5"><TriangleAlert className="mt-px size-3.5 shrink-0 text-warning" /><span><span className="tabular-nums text-muted-foreground">Line {w.line}</span> <code className="font-mono">{w.key}</code>: {w.message}</span></li>)}</ul>
            )}
            {(plan.rows.length > 0 || issueCount > 0) && (
              <section className="space-y-2" aria-label="Import row results">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{corrected ? "Corrected data preview" : "Rows to review"}</h3>
                    <p className="text-xs text-muted-foreground">{corrected ? "These are the valid rows after your fixes." : "Filter the dry-run rows by what will happen when you confirm."} {visibleRows.length} shown.</p>
                  </div>
                  <div className="max-w-full overflow-x-auto">
                    <Segmented label="Filter import rows" value={rowFilter} onChange={setRowFilter} options={rowFilterOptions} />
                  </div>
                </div>
                {rowFilter === "issues" ? (
                  visibleIssues.length ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 text-left text-muted-foreground"><tr><th className="px-3 py-2 font-medium">Line</th><th className="px-3 py-2 font-medium">Record</th><th className="px-3 py-2 font-medium">Problem</th></tr></thead>
                        <tbody>{visibleIssues.slice(0, 200).map((issue, index) => (
                          <tr key={`${issue.line}-${issue.record}-${index}`} className="border-t align-top">
                            <td className="px-3 py-2 tabular-nums">{issue.line}</td><td className="px-3 py-2 font-mono">{issue.record}</td><td className="px-3 py-2">{issue.problem}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                      {visibleIssues.length > 200 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Showing 200 of {visibleIssues.length} problems.</p>}
                    </div>
                  ) : <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">No problems found.</p>
                ) : visibleRows.length ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[760px] text-xs">
                      <thead className="bg-muted/50 text-left text-muted-foreground"><tr>
                        <th className="px-3 py-2 font-medium">Line</th><th className="px-3 py-2 font-medium">Record</th><th className="px-3 py-2 font-medium">Action</th>
                        {plan.columns.map((column) => <th key={column} className="px-3 py-2 font-medium">{column}</th>)}
                      </tr></thead>
                      <tbody>{visibleRows.slice(0, 300).map((row) => (
                        <tr key={row.key} className="border-t align-top">
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.line}</td>
                          <td className="px-3 py-2 font-mono font-semibold">{row.key}</td>
                          <td className="px-3 py-2 capitalize">{row.action}{row.changedFields.length > 0 && <span className="block text-muted-foreground">{row.changedFields.join(", ")}</span>}</td>
                          {plan.columns.map((column) => {
                            const value = row.values[column];
                            return <td key={column} className="max-w-64 px-3 py-2">{value === null || value === undefined || value === "" ? "—" : Array.isArray(value) ? value.join(", ") : String(value)}</td>;
                          })}
                        </tr>
                      ))}</tbody>
                    </table>
                    {visibleRows.length > 300 && <p className="border-t px-3 py-2 text-xs text-muted-foreground">Showing 300 of {visibleRows.length} rows.</p>}
                  </div>
                ) : (
                  <p className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">No rows match this filter.</p>
                )}
              </section>
            )}

            {plan.canCommit && !result && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary/4 p-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />I reviewed these {writes} change{writes === 1 ? "" : "s"}; write them to the database.</label>
                <Button disabled={!reviewed || busy !== null} onClick={() => void commit()}>{busy === "commit" ? <Loader2 className="animate-spin" /> : <Database />}Step 2. Confirm import</Button>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className={cn("space-y-2 rounded-xl border p-5", result.verified ? "border-success/40" : "border-destructive/30")} aria-live="polite">
            <p className="flex items-center gap-2 text-sm font-semibold">{result.verified ? <CheckCircle2 className="size-4 text-success" /> : <CircleAlert className="size-4 text-destructive" />}
              {result.verified ? "Imported and verified" : "Imported, but the read-back found differences"}</p>
            <p className="text-sm text-muted-foreground">{result.committed.created} created · {result.committed.updated} updated · {result.committed.unchanged} unchanged{result.entity === "students" ? ` · ${result.committed.enrollmentsAdded} enrollments added` : ""}, in table <code className="font-mono">{result.table}</code>. Every written value was read back from the database{result.verified ? " and matched." : `: ${result.mismatches.join(", ")}.`}</p>
            <p className="text-xs text-muted-foreground">Schedules are revalidated against the new data the next time they are opened; the published timetable is not changed by an import.</p>
            <Link href={ENTITY_META[result.entity].page} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">Open {ENTITY_META[result.entity].label}<ArrowUpRight className="size-3.5" /></Link>
            <Button size="sm" variant="outline" onClick={() => { setCsv(""); setSource(null); setCorrected(false); setRowFilter("all"); resetPlan(); }}>Start another import</Button>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-sm font-semibold">Export</h2>
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div>
            <p className="text-sm font-medium">Data tables</p>
            <p className="text-xs text-muted-foreground">The stored records in the import format (UTF-8, quoted where needed, slot lists separated by |). An exported file re-imports without changing anything.</p>
            <div className="mt-2 flex flex-wrap gap-2">{ENTITIES.map((e) => <Button key={e} variant="outline" size="sm" onClick={() => void download("export", e)}><Download />{ENTITY_META[e].label}</Button>)}</div>
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">Published timetable, room allocation and invigilation sheets. To export a draft run, open it in the <Link href="/admin/schedules" className="text-primary hover:underline">Timetable</Link>.</p>
            <ExportMenu />
          </div>
        </div>
      </section>

      <ReferenceCheck />
    </div>
  );
}

type QualityResult = { table: string; rowCount: number; columns: string[]; report: DataQualityReport };

/** The reference backend's whole-dataset quality report on a sample subjects file. Dry run only. */
function ReferenceCheck() {
  const [result, setResult] = useState<QualityResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function check(variant: ReferenceVariant) {
    setBusy(true); setError(null);
    try { setResult(await api<QualityResult>("/scheduling/data-quality", { json: { table: "subjects", csv: REFERENCE_VARIANTS[variant].csv } })); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-3" aria-labelledby="reference-heading">
      <h2 id="reference-heading" className="text-sm font-semibold">Reference edge-case files <span className="font-normal text-muted-foreground">· quality report only, never imported</span></h2>
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border bg-card p-4 text-xs">
        <span className="text-muted-foreground">Check a reference subjects file against the live data:</span>
        {(Object.keys(REFERENCE_VARIANTS) as ReferenceVariant[]).map((v) => <Button key={v} variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => void check(v)}>{REFERENCE_VARIANTS[v].label}</Button>)}
        {busy && <Loader2 className="size-3.5 animate-spin" />}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <div className="space-y-3 rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><p className="text-sm">{result.rowCount} subject rows checked with the rest of the live dataset.</p><QualityScore report={result.report} /></div>
          <QualityIssues report={result.report} />
        </div>
      )}
    </section>
  );
}
