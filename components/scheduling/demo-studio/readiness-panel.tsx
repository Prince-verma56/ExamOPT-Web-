"use client";

import Link from "next/link";
import { ArrowUpRight, CircleCheck, CircleX, Database, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { DiagnosticList } from "../diagnostic-list";
import { num } from "../format";
import { TONE_CLASS } from "../outcome-badge";
import { StatStrip } from "../page-intro";
import type { DemoDataset } from "./types";

const STATUS: Record<string, { label: string; tone: keyof typeof TONE_CLASS; note: string }> = {
  READY: { label: "Ready", tone: "success", note: "No data errors, no proven infeasibility, no warnings." },
  READY_WITH_WARNINGS: { label: "Ready, with warnings", tone: "warning", note: "The solver can run; the warnings below are worth a look." },
  NEEDS_ATTENTION: { label: "Needs attention", tone: "warning", note: "The data quality report found errors in the source tables." },
  BLOCKED_BY_DATA: { label: "Blocked by data errors", tone: "error", note: "Preflight found malformed or missing records, so no solver will run." },
  PROVEN_INFEASIBLE: { label: "Proven infeasible", tone: "error", note: "A necessary-condition check proves no schedule can satisfy every hard constraint." },
};

const DATA_LINKS = [
  { href: "/admin/data/subjects", label: "Subjects & exams" },
  { href: "/admin/data/rooms", label: "Rooms & labs" },
  { href: "/admin/data/time-slots", label: "Time slots" },
  { href: "/admin/data/students", label: "Students" },
  { href: "/admin/constraints", label: "Constraints" },
];

export function ReadinessPanel({ dataset }: { dataset: DemoDataset }) {
  const c = dataset.counts;
  const status = STATUS[dataset.status] ?? STATUS.NEEDS_ATTENTION;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 font-medium", TONE_CLASS[status.tone])}>
          {dataset.ready ? <CircleCheck className="size-3.5" /> : <CircleX className="size-3.5" />}{status.label}
        </span>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-muted-foreground">
          {dataset.source === "live" ? <Database className="size-3.5" /> : <FlaskConical className="size-3.5" />}{dataset.label}
        </span>
        <span className="inline-flex h-7 items-center rounded-full border border-dashed px-2.5 text-muted-foreground">Synthetic demonstration data, no real students</span>
        <span className="text-muted-foreground">Fingerprint <code className="font-mono text-foreground">{dataset.fingerprint}</code></span>
        {dataset.matchesReferenceDataset !== null && (
          <span className="text-muted-foreground">{dataset.matchesReferenceDataset ? "Identical to the bundled reference GLA dataset" : "Differs from the bundled reference GLA dataset (data edited since seeding)"}</span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{status.note}</p>

      <StatStrip items={[
        { label: "Examinations", value: c.exams, hint: `${c.labExams} practical (lab)` },
        { label: "Students", value: num(c.students), hint: `${num(c.backlogEnrollments)} backlog enrollments` },
        { label: "Enrollments", value: num(c.enrollments), hint: "student-exam records" },
        { label: "Rooms", value: c.rooms, hint: `${c.labRooms} laboratories · ${num(c.totalSeats)} seats` },
        { label: "Time slots", value: c.slots, hint: `${c.days} days` },
        { label: "Conflict edges", value: dataset.graph.stats.edgeCount, hint: `${num(dataset.graph.stats.density * 100, 1)}% of exam pairs` },
        { label: "Fixed slots", value: c.fixedSlotExams, hint: "exams pinned to a slot" },
        { label: "Unavailability", value: c.examUnavailabilities + c.roomUnavailabilities, hint: `${c.examUnavailabilities} exam · ${c.roomUnavailabilities} room` },
      ]} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Preflight diagnostics</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Preflight checks identify potential scheduling bottlenecks before the solver begins. They describe the input, not any schedule; schedule violations are reported by the independent validator in the Arena and Simulator.</p>
          </div>
          <DiagnosticList diagnostics={dataset.preflight.diagnostics} empty="Preflight found nothing to report: no data errors, no bottlenecks, no proof of infeasibility." />
        </section>
        <aside className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Lower and upper bounds</h3>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Largest clique (slots needed at least)</dt><dd className="font-semibold tabular-nums">{dataset.graph.stats.cliqueLowerBound}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Plain Welsh-Powell colours</dt><dd className="font-semibold tabular-nums">{dataset.graph.stats.welshPowellColors}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Max / average degree</dt><dd className="font-semibold tabular-nums">{dataset.graph.stats.maxDegree} / {num(dataset.graph.stats.averageDegree, 1)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Slots available</dt><dd className="font-semibold tabular-nums">{c.slots}</dd></div>
            </dl>
          </div>
          {dataset.dataQuality && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="flex items-center justify-between text-sm font-semibold">Source data quality <span className="tabular-nums">{dataset.dataQuality.readinessScore}/100</span></h3>
              <p className="mt-1 text-xs text-muted-foreground">{dataset.dataQuality.errors.length} error{dataset.dataQuality.errors.length === 1 ? "" : "s"} · {dataset.dataQuality.warnings.length} warning{dataset.dataQuality.warnings.length === 1 ? "" : "s"} in the canonical tables.</p>
              {[...dataset.dataQuality.errors, ...dataset.dataQuality.warnings].slice(0, 5).map((issue, i) => (
                <p key={`${issue.code}-${i}`} className="mt-1.5 text-xs"><code className="font-mono text-[10.5px] font-semibold">{issue.code}</code> <span className="text-muted-foreground">{issue.table} {issue.rowId}: {issue.message}</span></p>
              ))}
            </div>
          )}
          <div className="rounded-xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Correct the input</h3>
            <p className="mt-1 text-xs text-muted-foreground">Fixes belong in the source records, not in the demo.</p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
              {DATA_LINKS.map((l) => <li key={l.href}><Link href={l.href} className="inline-flex items-center gap-1 text-primary hover:underline">{l.label}<ArrowUpRight className="size-3" /></Link></li>)}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
