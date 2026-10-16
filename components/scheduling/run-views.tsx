"use client";

import Link from "next/link";
import { ArrowUpRight, Check, CircleSlash, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DiagnosticList } from "./diagnostic-list";
import { ALGORITHM_LABEL, dateTime, ms, num } from "./format";
import { OutcomeBadge, OUTCOME_META } from "./outcome-badge";
import { compareRunResults, type RunResult } from "@/server/scheduling/engine";
import type { Diagnostic, EngineConfig, RunOutcome } from "@/server/scheduling/domain";
import type { PenaltyComponent } from "@/server/scheduling/metrics";
import type { RunSummary } from "@/server/scheduling/persistence";
import type { ValidationCheck } from "@/server/scheduling/validator";

/** One run, from either a fresh execution or a saved summary, in the shape the views need. */
export interface RunRow {
  key: string;
  runId: string | null;
  algorithm: string;
  outcome: RunOutcome;
  evidence: string | null;
  legacy: boolean;
  scheduled: number;
  total: number;
  violations: number | null;
  penalty: number | null;
  components: PenaltyComponent[];
  sameDay: number | null;
  backToBack: number | null;
  slotsUsed: number | null;
  daysUsed: number | null;
  fill: number | null;
  timeMs: number;
  nodes: number | null;
  createdAt: string | null;
  fingerprint: string | null;
  published: RunSummary["published"];
  diagnostics: Diagnostic[];
  checks: ValidationCheck[] | null;
  unscheduled: string[];
  config: EngineConfig | null;
  persisted: boolean;
  persistenceError: string | null;
}

export function rowFromResult(entry: { runId: string | null; persisted: boolean; persistenceError: string | null; result: RunResult }): RunRow {
  const r = entry.result, m = r.metrics;
  return {
    key: entry.runId ?? `${r.algorithm}-${r.startedAt}`, runId: entry.runId, algorithm: r.algorithm, outcome: r.outcome, evidence: r.infeasibilityEvidence, legacy: false,
    scheduled: r.assignments.length, total: r.totalExams, violations: r.validation?.placementViolationCount ?? null,
    penalty: m?.softPenalty.total ?? null, components: m?.softPenalty.components ?? [], sameDay: m?.sameDayExtraExams ?? null, backToBack: m?.backToBackPairs ?? null,
    slotsUsed: m?.slotsUsed ?? null, daysUsed: m?.daysUsed ?? null, fill: m?.seatFillPct ?? null, timeMs: r.durationMs, nodes: r.searchNodes,
    createdAt: r.startedAt, fingerprint: r.datasetFingerprint, published: null, diagnostics: r.diagnostics, checks: r.validation?.checks ?? null,
    unscheduled: r.unscheduledExamIds, config: r.config, persisted: entry.persisted, persistenceError: entry.persistenceError,
  };
}

export function rowFromSummary(s: RunSummary): RunRow {
  const m = s.metrics;
  return {
    key: s.runId, runId: s.runId, algorithm: s.algorithm, outcome: s.outcome, evidence: s.infeasibilityEvidence, legacy: s.source === "legacy",
    scheduled: s.scheduledExams, total: s.totalExams, violations: s.source === "legacy" ? null : s.hardViolations,
    penalty: s.softPenalty, components: m?.softPenalty.components ?? [], sameDay: m?.sameDayExtraExams ?? null, backToBack: m?.backToBackPairs ?? null,
    slotsUsed: m?.slotsUsed ?? null, daysUsed: m?.daysUsed ?? null, fill: m?.seatFillPct ?? null, timeMs: s.executionTimeMs, nodes: s.searchNodes,
    createdAt: s.createdAt, fingerprint: s.datasetFingerprint, published: s.published, diagnostics: s.diagnostics, checks: null,
    unscheduled: [], config: s.config, persisted: true, persistenceError: null,
  };
}

export function rankRows(rows: RunRow[]) {
  return [...rows].sort((a, b) => compareRunResults(
    // Legacy runs were never independently validated, so they rank after every engine run.
    { outcome: a.legacy ? "INVALID_INPUT" : a.outcome, unscheduled: a.total - a.scheduled, softPenalty: a.penalty, durationMs: a.timeMs },
    { outcome: b.legacy ? "INVALID_INPUT" : b.outcome, unscheduled: b.total - b.scheduled, softPenalty: b.penalty, durationMs: b.timeMs },
  ));
}

const SEGMENT = ["bg-(--chart-1)", "bg-(--chart-3)", "bg-(--chart-5)", "bg-(--chart-2)"];

/** Soft-penalty composition as a stacked bar, scaled to the largest penalty in view. */
export function PenaltyBar({ components, max }: { components: PenaltyComponent[]; max: number }) {
  const total = components.reduce((sum, c) => sum + c.penalty, 0);
  if (!components.length || !max) return null;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={components.map((c) => `${c.label} ${c.penalty}`).join(", ")}>
      <div className="flex h-full" style={{ width: `${Math.max(2, (total / max) * 100)}%` }}>
        {components.map((c, i) => c.penalty > 0 && <span key={c.key} className={SEGMENT[i % SEGMENT.length]} style={{ width: `${(c.penalty / total) * 100}%` }} />)}
      </div>
    </div>
  );
}

export function PenaltyLegend({ components }: { components: PenaltyComponent[] }) {
  return (
    <ul className="grid gap-1.5 text-xs">
      {components.map((c, i) => (
        <li key={c.key} className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-sm", SEGMENT[i % SEGMENT.length])} aria-hidden />
          <span className="flex-1 text-muted-foreground">{c.label}</span>
          <span className="font-mono tabular-nums text-foreground/80">{num(c.value, c.key === "capacityWaste" ? 2 : 0)} × {c.weight} = <strong className="font-semibold">{num(c.penalty, 2)}</strong></span>
        </li>
      ))}
    </ul>
  );
}

export function ValidationChecklist({ checks }: { checks: ValidationCheck[] }) {
  return (
    <ol className="divide-y rounded-lg border">
      {checks.map((check) => (
        <li key={check.rule} className="flex items-center gap-3 px-3 py-2 text-sm">
          <span className="w-5 font-mono text-[11px] text-muted-foreground tabular-nums">{check.rule}</span>
          <span className="flex-1">{check.label}</span>
          {check.passed
            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-success"><Check className="size-3.5" aria-hidden />Pass</span>
            : <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><X className="size-3.5" aria-hidden />{check.violations} violation{check.violations > 1 ? "s" : ""}</span>}
        </li>
      ))}
    </ol>
  );
}

function Best({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <span className={cn("tabular-nums", on && "font-semibold text-success")}>{children}{on && <span className="sr-only"> (best among feasible runs)</span>}</span>;
}

/** Ranked comparison. Best values are highlighted only among feasible runs, so an invalid run never looks best. */
export function ComparisonTable({ rows, onOpen, caption }: { rows: RunRow[]; onOpen?: (row: RunRow) => void; caption?: React.ReactNode }) {
  const ranked = rankRows(rows);
  const feasible = ranked.filter((r) => r.outcome === "FEASIBLE" && !r.legacy);
  const best = (pick: (r: RunRow) => number | null, dir: "min" | "max") => {
    const values = feasible.map(pick).filter((v): v is number => v !== null);
    if (feasible.length < 2 || !values.length) return null;
    return dir === "min" ? Math.min(...values) : Math.max(...values);
  };
  const bestPenalty = best((r) => r.penalty, "min"), bestSameDay = best((r) => r.sameDay, "min"), bestB2b = best((r) => r.backToBack, "min"), bestFill = best((r) => r.fill, "max"), bestTime = best((r) => r.timeMs, "min");
  const maxPenalty = Math.max(0, ...ranked.map((r) => r.penalty ?? 0));
  const isBest = (r: RunRow, value: number | null, target: number | null) => target !== null && value === target && r.outcome === "FEASIBLE" && !r.legacy;

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10 pl-4">#</TableHead>
            <TableHead>Run</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Scheduled</TableHead>
            <TableHead className="text-right">Violations</TableHead>
            <TableHead className="min-w-32">Soft penalty ↓</TableHead>
            <TableHead className="text-right">Same-day</TableHead>
            <TableHead className="text-right">Back-to-back</TableHead>
            <TableHead className="text-right">Slots · days</TableHead>
            <TableHead className="text-right">Seat fill</TableHead>
            <TableHead className="pr-4 text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((r, i) => (
            <TableRow key={r.key} className={cn(onOpen && "cursor-pointer")} onClick={() => onOpen?.(r)}>
              <TableCell className="pl-4 font-mono text-xs text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <div className="font-medium">{ALGORITHM_LABEL[r.algorithm] ?? r.algorithm}</div>
                {r.runId && <div className="font-mono text-[11px] text-muted-foreground">{r.runId}</div>}
              </TableCell>
              <TableCell><OutcomeBadge outcome={r.outcome} evidence={r.evidence} legacy={r.legacy} /></TableCell>
              <TableCell className="text-right tabular-nums">{r.scheduled}<span className="text-muted-foreground">/{r.total}</span></TableCell>
              <TableCell className={cn("text-right tabular-nums", (r.violations ?? 0) > 0 && "font-semibold text-destructive")}>{r.violations ?? "—"}</TableCell>
              <TableCell>
                {r.penalty === null ? <span className="text-muted-foreground">—</span> : (
                  <div className="space-y-1">
                    <Best on={isBest(r, r.penalty, bestPenalty)}>{num(r.penalty, 2)}</Best>
                    <PenaltyBar components={r.components} max={maxPenalty} />
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right"><Best on={isBest(r, r.sameDay, bestSameDay)}>{num(r.sameDay)}</Best></TableCell>
              <TableCell className="text-right"><Best on={isBest(r, r.backToBack, bestB2b)}>{num(r.backToBack)}</Best></TableCell>
              <TableCell className="text-right tabular-nums">{r.slotsUsed ?? "—"} · {r.daysUsed ?? "—"}</TableCell>
              <TableCell className="text-right"><Best on={isBest(r, r.fill, bestFill)}>{r.fill === null ? "—" : `${num(r.fill, 1)}%`}</Best></TableCell>
              <TableCell className="pr-4 text-right"><Best on={isBest(r, r.timeMs, bestTime)}>{ms(r.timeMs)}</Best></TableCell>
            </TableRow>
          ))}
        </TableBody>
        {caption && <TableCaption className="mb-3 px-4 text-left text-xs">{caption}</TableCaption>}
      </Table>
    </div>
  );
}

export function RunDetailSheet({ row, onClose }: { row: RunRow | null; onClose: () => void }) {
  return (
    <Sheet open={row !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
        {row && (
          <>
            <SheetHeader className="border-b p-6 pr-12">
              <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{row.runId ?? "Not saved"}</p>
              <SheetTitle className="font-display text-3xl font-normal">{ALGORITHM_LABEL[row.algorithm] ?? row.algorithm}</SheetTitle>
              <SheetDescription render={<div />} className="flex flex-wrap items-center gap-2 pt-1">
                <OutcomeBadge outcome={row.outcome} evidence={row.evidence} legacy={row.legacy} size="lg" />
                {row.published && <span className="rounded-full border px-2.5 py-1 text-xs">Published v{row.published.version}{row.published.isActive ? " · active" : ""}</span>}
                {row.createdAt && <span className="text-xs text-muted-foreground">{dateTime(row.createdAt)}</span>}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-7 p-6">
              <p className="text-sm leading-6 text-muted-foreground">{row.legacy ? "This run was created before the Phase 2 engine existed. Open it in the timetable to re-validate it against current data." : OUTCOME_META[row.outcome].explain}</p>
              {row.persistenceError && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">The run completed but could not be saved: {row.persistenceError}</p>}

              <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border text-sm">
                {[
                  ["Scheduled", `${row.scheduled}/${row.total}`], ["Hard violations", row.violations ?? "—"], ["Time", ms(row.timeMs)],
                  ["Search nodes", row.nodes === null ? "n/a" : num(row.nodes)], ["Slots · days", `${row.slotsUsed ?? "—"} · ${row.daysUsed ?? "—"}`], ["Seat fill", row.fill === null ? "—" : `${num(row.fill, 1)}%`],
                ].map(([label, value]) => (
                  <div key={label as string} className="bg-card px-3 py-2.5"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="mt-0.5 font-semibold tabular-nums">{value}</dd></div>
                ))}
              </dl>

              {row.checks && <section className="space-y-2.5"><h3 className="text-sm font-semibold">Independent validation</h3><ValidationChecklist checks={row.checks} /></section>}

              {row.components.length > 0 && (
                <section className="space-y-2.5">
                  <h3 className="text-sm font-semibold">Soft penalty · {num(row.penalty, 2)}</h3>
                  <PenaltyBar components={row.components} max={row.penalty ?? 0} />
                  <PenaltyLegend components={row.components} />
                </section>
              )}

              <section className="space-y-2.5">
                <h3 className="text-sm font-semibold">Diagnostics</h3>
                <DiagnosticList diagnostics={row.diagnostics} empty="No diagnostics: nothing was rejected." />
              </section>

              {row.unscheduled.length > 0 && (
                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold"><CircleSlash className="size-4 text-muted-foreground" />Unscheduled exams</h3>
                  <p className="font-mono text-xs leading-6">{row.unscheduled.join(" · ")}</p>
                </section>
              )}

              {row.config && (
                <section className="space-y-1 text-xs text-muted-foreground">
                  <h3 className="text-sm font-semibold text-foreground">Configuration</h3>
                  <p>Search budget {num(row.config.maxNodes)} nodes / {num(row.config.timeLimitMs)} ms · weights: same-day {row.config.weights.sameDay}, back-to-back {row.config.weights.backToBack}, empty seats {row.config.weights.capacityWaste}, days {row.config.weights.daysUsed}</p>
                  {row.fingerprint && <p>Dataset fingerprint <code className="font-mono">{row.fingerprint}</code></p>}
                </section>
              )}

              {row.runId && row.scheduled > 0 && (
                <Link href={`/admin/schedules?run=${row.runId}`} className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}>
                  Open in timetable <ArrowUpRight className="size-4" />
                </Link>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
