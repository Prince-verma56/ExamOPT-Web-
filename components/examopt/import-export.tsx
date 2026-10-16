"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { CircleAlert, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/components/scheduling/api";
import { PageIntro } from "@/components/scheduling/page-intro";
import { ExportMenu } from "@/components/scheduling/publish-panel";
import { QualityIssues, QualityScore } from "@/components/scheduling/quality-report";
import { Segmented } from "@/components/scheduling/segmented";
import { REFERENCE_VARIANTS, type ReferenceVariant } from "@/server/scheduling/reference-samples";
import type { DataQualityReport } from "@/server/scheduling/data-quality";

type Table = "subjects" | "rooms" | "timeslots" | "faculty";
type Result = { table: Table; rowCount: number; columns: string[]; report: DataQualityReport };

const COLUMNS: Record<Table, string> = {
  subjects: "subject_id, name, program, semester, duration_hours, requires_lab, fixed_slot, unavailable_slots, enrolled_students",
  rooms: "room_id, name, building, capacity, room_type, unavailable_slots",
  timeslots: "slot_id, day_number, exam_date, session, time_range",
  faculty: "faculty_id, name, department, unavailable_slots, max_duties",
};

/**
 * CSV validation is a dry run (reference `validate_csv_file`): the file
 * replaces one table in memory and the whole dataset is checked. Nothing is
 * written to the database.
 */
export function ImportExport() {
  const [table, setTable] = useState<Table>("subjects");
  const [csv, setCsv] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function validate(text = csv, forTable = table) {
    setBusy(true); setError(null); setResult(null);
    try { setResult(await api<Result>("/scheduling/data-quality", { json: { table: forTable, csv: text } })); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  }

  function loadSample(variant: ReferenceVariant) {
    const sample = REFERENCE_VARIANTS[variant];
    setTable("subjects"); setCsv(sample.csv); setSource(`Reference sample: ${sample.file}`);
    void validate(sample.csv, "subjects");
  }

  async function readFile(file: File) {
    if (file.size > 2_000_000) { setError("Files larger than 2 MB are not accepted."); return; }
    const text = await file.text();
    setCsv(text); setSource(file.name); setResult(null);
  }

  return (
    <div className="space-y-10 pb-8">
      <PageIntro eyebrow="Operations" title="Import & Export" description="Check a CSV file against the live data before changing anything, and export the published timetable as CSV. Validation is a dry run: no record is created or changed." />

      <section className="space-y-3" aria-labelledby="export-heading">
        <h2 id="export-heading" className="text-sm font-semibold">Export the published timetable</h2>
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Timetable, room allocation and invigilation sheets in the reference CSV layout. To export a draft run, open it in the <Link href="/admin/schedules" className="text-primary hover:underline">Timetable</Link>.</p>
          <ExportMenu />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="validate-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="validate-heading" className="text-sm font-semibold">Validate a CSV file</h2>
          <p className="text-xs text-muted-foreground">The file replaces one table in memory; every other table comes from the database.</p>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="max-w-full overflow-x-auto"><Segmented label="Table" value={table} onChange={(v) => { setTable(v); setResult(null); }} options={(Object.keys(COLUMNS) as Table[]).map((t) => ({ value: t, label: t }))} /></div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = ""; }} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload />Choose file</Button>
            {source && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileSpreadsheet className="size-3.5" />{source}</span>}
          </div>
          <p className="text-xs text-muted-foreground">Expected columns: <code className="font-mono">{COLUMNS[table]}</code></p>
          <Textarea value={csv} onChange={(e) => { setCsv(e.target.value); setSource("Pasted text"); }} placeholder="Paste CSV here, or choose a file" className="min-h-36 font-mono text-xs" spellCheck={false} aria-label="CSV content" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Reference samples:</span>
              {(Object.keys(REFERENCE_VARIANTS) as ReferenceVariant[]).map((v) => <Button key={v} variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => loadSample(v)}>{REFERENCE_VARIANTS[v].label}</Button>)}
            </div>
            <Button disabled={busy || !csv.trim()} onClick={() => void validate()}>{busy ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}Validate</Button>
          </div>
        </div>

        {error && <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p>}

        {result && (
          <div className="space-y-4 rounded-xl border bg-card p-5" aria-live="polite">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold">Result for {result.table}</p>
                <p className="text-xs text-muted-foreground">{result.rowCount} rows · columns {result.columns.join(", ")}</p>
              </div>
              <QualityScore report={result.report} />
            </div>
            <QualityIssues report={result.report} />
            <p className="text-xs text-muted-foreground">Nothing was written. Edit records in the data workspace, or correct the file and validate again.</p>
          </div>
        )}
      </section>
    </div>
  );
}
