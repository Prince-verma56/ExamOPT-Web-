"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Check, ChevronDown, CircleAlert, Fingerprint, Loader2, Play, RefreshCw, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "./api";
import { DiagnosticList } from "./diagnostic-list";
import { ALGORITHM_LABEL, dateTime, ms, num } from "./format";
import { OutcomeBadge, TONE_CLASS } from "./outcome-badge";
import { PageIntro, StatStrip } from "./page-intro";
import { ComparisonTable, PenaltyBar, rankRows, RunDetailSheet, rowFromResult, rowFromSummary, type RunRow } from "./run-views";
import type { AlgorithmId, Diagnostic, EngineConfig } from "@/server/scheduling/domain";
import type { RunResult } from "@/server/scheduling/engine";
import type { GraphStats } from "@/server/scheduling/conflict-graph";
import type { RunSummary } from "@/server/scheduling/persistence";
import type { DataQualityReport } from "@/server/scheduling/data-quality";
import { QualityIssues } from "./quality-report";

interface Readiness {
  fingerprint: string;
  loadedAt: string;
  status: "READY" | "READY_WITH_WARNINGS" | "BLOCKED_BY_DATA" | "PROVEN_INFEASIBLE";
  counts: Record<"exams" | "labExams" | "students" | "enrollments" | "backlogEnrollments" | "rooms" | "labRooms" | "totalSeats" | "slots" | "days" | "fixedSlotExams" | "examUnavailabilities" | "roomUnavailabilities" | "faculty" | "invigilationCapacity", number>;
  preflight: { errors: number; warnings: number; diagnostics: Diagnostic[] };
  dataQuality: DataQualityReport;
  graph: GraphStats;
  algorithms: { id: AlgorithmId; name: string; version: string; family: string; summary: string; complete: boolean }[];
  defaults: EngineConfig;
}
type ExecuteResponse = { fingerprint: string; config: EngineConfig; runs: { runId: string | null; persisted: boolean; persistenceError: string | null; result: RunResult }[] };
type Phase = "queued" | "running" | "done" | "error";

const STATUS_COPY: Record<Readiness["status"], { label: string; tone: keyof typeof TONE_CLASS; body: string }> = {
  READY: { label: "Ready to schedule", tone: "success", body: "Preflight found no data errors and no proof of infeasibility." },
  READY_WITH_WARNINGS: { label: "Ready, with warnings", tone: "warning", body: "The solver can run; review the warnings below." },
  BLOCKED_BY_DATA: { label: "Blocked by data errors", tone: "error", body: "Fix the data errors below. Runs will be rejected until then." },
  PROVEN_INFEASIBLE: { label: "Proven infeasible", tone: "error", body: "A necessary condition fails, so no schedule can satisfy every hard constraint." },
};

function useElapsed(running: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const start = useRef(0);
  useEffect(() => {
    if (!running) return;
    start.current = performance.now();
    const id = setInterval(() => setElapsed(performance.now() - start.current), 100);
    return () => clearInterval(id);
  }, [running]);
  return running ? elapsed : 0;
}

export function OptimizationLab() {
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AlgorithmId[]>(["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"]);
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [phases, setPhases] = useState<Partial<Record<AlgorithmId, Phase>>>({});
  const [batch, setBatch] = useState<RunRow[]>([]);
  const [batchFingerprints, setBatchFingerprints] = useState<string[]>([]);
  const [runError, setRunError] = useState<string | null>(null);
  const [history, setHistory] = useState<RunSummary[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [tab, setTab] = useState<string>("batch");
  const [open, setOpen] = useState<RunRow | null>(null);
  const running = Object.values(phases).some((p) => p === "queued" || p === "running");
  const elapsed = useElapsed(running);

  const loadReadiness = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await api<Readiness>("/scheduling/readiness");
      setReadiness(data);
      setConfig((current) => current ?? data.defaults);
    } catch (error) { setLoadError(errorMessage(error)); }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryError(null);
    try { setHistory((await api<{ runs: RunSummary[] }>("/scheduling/runs?limit=60")).runs); }
    catch (error) { setHistoryError(errorMessage(error)); }
  }, []);

  useEffect(() => {
    // Initial fetches; state updates happen after the awaited responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadReadiness(); void loadHistory();
  }, [loadReadiness, loadHistory]);

  async function run() {
    if (!config || !selected.length) return;
    const order = (["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"] as AlgorithmId[]).filter((id) => selected.includes(id));
    setRunError(null); setBatch([]); setBatchFingerprints([]); setTab("batch");
    setPhases(Object.fromEntries(order.map((id) => [id, "queued"])));
    let completed = 0;
    for (const algorithm of order) {
      setPhases((p) => ({ ...p, [algorithm]: "running" }));
      try {
        const data = await api<ExecuteResponse>("/scheduling/runs", { json: { algorithms: [algorithm], config } });
        const entry = data.runs[0];
        setBatch((rows) => [...rows, rowFromResult(entry)]);
        setBatchFingerprints((f) => [...f, data.fingerprint]);
        setPhases((p) => ({ ...p, [algorithm]: "done" }));
        completed++;
        if (entry.persistenceError) toast.error(`${ALGORITHM_LABEL[algorithm]} finished but was not saved`, { description: entry.persistenceError });
      } catch (error) {
        setPhases((p) => ({ ...p, [algorithm]: "error" }));
        setRunError(`${ALGORITHM_LABEL[algorithm]}: ${errorMessage(error)}`);
      }
    }
    if (completed) toast.success(`${completed} run${completed > 1 ? "s" : ""} completed and validated`);
    void loadHistory();
  }

  const ranked = useMemo(() => rankRows(batch), [batch]);
  const maxPenalty = Math.max(0, ...batch.map((r) => r.penalty ?? 0));
  const comparedRows = useMemo(() => (history ?? []).filter((r) => picked.includes(r.runId)).map(rowFromSummary), [history, picked]);
  const comparedSameDataset = comparedRows.length > 1 && new Set(comparedRows.map((r) => r.fingerprint)).size === 1 && comparedRows.every((r) => r.fingerprint);
  const inputsShifted = new Set(batchFingerprints).size > 1;

  if (loadError) {
    return (
      <div className="space-y-8">
        <Intro />
        <div className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/4 p-6">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive"><CircleAlert className="size-4" />Could not load the scheduling dataset</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => void loadReadiness()}><RefreshCw />Try again</Button>
        </div>
      </div>
    );
  }

  const g = readiness?.graph;
  const minSlotsProven = g && g.cliqueLowerBound === g.welshPowellColors;
  const status = readiness ? STATUS_COPY[readiness.status] : null;

  return (
    <div className="space-y-10 pb-4">
      <Intro actions={readiness && (
        <>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-xs text-muted-foreground" title="Changes whenever exams, rooms, slots or enrollments change">
            <Fingerprint className="size-3.5" />Dataset <code className="font-mono text-foreground">{readiness.fingerprint}</code>
          </span>
          <Button variant="outline" onClick={() => void loadReadiness()} disabled={running}><RefreshCw />Reload data</Button>
        </>
      )} />

      {/* Dataset readiness */}
      <section aria-labelledby="readiness-heading" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="readiness-heading" className="text-sm font-semibold">Dataset readiness</h2>
          {readiness && <p className="text-xs text-muted-foreground">Loaded {dateTime(readiness.loadedAt)} from Supabase</p>}
        </div>
        {!readiness ? <Skeleton className="h-21 rounded-xl" /> : (
          <StatStrip items={[
            { label: "Examinations", value: readiness.counts.exams, hint: `${readiness.counts.labExams} practical (lab)` },
            { label: "Students", value: num(readiness.counts.students), hint: `${num(readiness.counts.enrollments)} enrollments` },
            { label: "Backlog seats", value: readiness.counts.backlogEnrollments, hint: "cross-semester" },
            { label: "Rooms", value: readiness.counts.rooms, hint: `${readiness.counts.labRooms} labs · ${num(readiness.counts.totalSeats)} seats` },
            { label: "Time slots", value: readiness.counts.slots, hint: `${readiness.counts.days} days` },
            { label: "Fixed slots", value: readiness.counts.fixedSlotExams, hint: `${readiness.counts.examUnavailabilities + readiness.counts.roomUnavailabilities} blackouts` },
            { label: "Invigilators", value: readiness.counts.faculty, hint: `${readiness.counts.invigilationCapacity} duties available` },
            { label: "Conflict graph", value: `${g!.edgeCount} edges`, hint: `${num(g!.density * 100, 0)}% dense · max ${g!.maxDegree}` },
          ]} />
        )}
        {readiness && status && (
          <Collapsible className="rounded-xl border bg-card">
            <div className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn("inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium", TONE_CLASS[status.tone])}>
                  {status.tone === "success" ? <Check className="size-3.5" /> : <CircleAlert className="size-3.5" />}{status.label}
                </span>
                <p className="text-sm text-muted-foreground">{status.body}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm">
                  <span className="text-muted-foreground">Minimum slots </span>
                  <strong className="tabular-nums">{minSlotsProven ? g!.cliqueLowerBound : `${g!.cliqueLowerBound}–${g!.welshPowellColors}`}</strong>
                  <span className="text-muted-foreground"> of {readiness.counts.slots}{minSlotsProven ? " · proven" : ""}</span>
                </p>
                <CollapsibleTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "group")}>
                  Preflight · {readiness.preflight.errors} errors · {readiness.preflight.warnings} warnings
                  <ChevronDown className="transition-transform group-data-panel-open:rotate-180" />
                </CollapsibleTrigger>
              </div>
            </div>
            <CollapsibleContent className="space-y-3 border-t p-4">
              {minSlotsProven && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Exams {g!.cliqueExamIds.join(", ")} all share students pairwise, so they need {g!.cliqueLowerBound} different slots; a Welsh-Powell colouring needs exactly {g!.welshPowellColors}. Rooms and fixed slots can only raise this.
                </p>
              )}
              <DiagnosticList diagnostics={readiness.preflight.diagnostics} empty="No preflight findings. References, durations, capacities, laboratories and fixed slots are consistent." />
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium">
                  Data quality checks (ported from the reference validator) · readiness {readiness.dataQuality.readinessScore}/100 · {readiness.dataQuality.summary.totalErrors} errors · {readiness.dataQuality.summary.totalWarnings} warnings
                </p>
                <QualityIssues report={readiness.dataQuality} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </section>

      {/* Algorithm selection and configuration */}
      <section aria-labelledby="algorithms-heading" className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 id="algorithms-heading" className="text-sm font-semibold">Strategies</h2>
            <p className="text-xs text-muted-foreground">Same dataset snapshot, same configuration</p>
          </div>
          <div className="space-y-2.5" role="group" aria-label="Algorithms to run">
            {(readiness?.algorithms ?? []).map((algorithm) => {
              const checked = selected.includes(algorithm.id);
              const phase = phases[algorithm.id];
              const result = batch.find((r) => r.algorithm === algorithm.id);
              return (
                <label key={algorithm.id} className={cn("group/algo flex cursor-pointer items-start gap-4 rounded-xl border bg-card p-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40", checked ? "border-primary/50 bg-primary/2.5" : "hover:border-foreground/20", running && "cursor-default")}>
                  <Checkbox className="mt-0.5" checked={checked} disabled={running} onCheckedChange={(value) => setSelected((list) => value ? [...list, algorithm.id] : list.filter((id) => id !== algorithm.id))} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-medium">{algorithm.name}</span>
                      <span className="text-xs text-muted-foreground">{algorithm.family} · v{algorithm.version}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{algorithm.summary}</p>
                    <p className="text-xs text-foreground/70">{algorithm.complete ? "Complete search: can prove infeasibility, bounded by the search budget." : "Heuristic: a failure to place an exam is not proof that no schedule exists."}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right empty:hidden sm:w-28">
                    {phase === "queued" && <span className="text-xs text-muted-foreground">Queued</span>}
                    {phase === "running" && <span className="inline-flex items-center gap-1.5 text-xs text-primary"><Loader2 className="size-3.5 animate-spin" />Running</span>}
                    {phase === "error" && <span className="text-xs text-destructive">Failed</span>}
                    {result && <><OutcomeBadge outcome={result.outcome} evidence={result.evidence} /><span className="font-mono text-[11px] text-muted-foreground">{ms(result.timeMs)}</span></>}
                  </div>
                </label>
              );
            })}
            {!readiness && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-26 rounded-xl" />)}
          </div>
        </div>

        <aside className="space-y-3">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold"><SlidersHorizontal className="size-4 text-muted-foreground" />Configuration</h2>
          <div className="space-y-5 rounded-xl border bg-card p-4">
            {config && readiness ? (
              <>
                <fieldset className="space-y-3" disabled={running}>
                  <legend className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Search budget · backtracking</legend>
                  <NumberField label="Node limit" value={config.maxNodes} min={1} max={2_000_000} step={1000} onChange={(maxNodes) => setConfig({ ...config, maxNodes })} />
                  <NumberField label="Time limit (ms)" value={config.timeLimitMs} min={50} max={10_000} step={250} onChange={(timeLimitMs) => setConfig({ ...config, timeLimitMs })} />
                </fieldset>
                <fieldset className="space-y-3" disabled={running}>
                  <legend className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Soft-penalty weights</legend>
                  <NumberField label="Extra same-day exam" value={config.weights.sameDay} min={0} max={100} step={0.5} onChange={(sameDay) => setConfig({ ...config, weights: { ...config.weights, sameDay } })} />
                  <NumberField label="Back-to-back pair" value={config.weights.backToBack} min={0} max={100} step={0.5} onChange={(backToBack) => setConfig({ ...config, weights: { ...config.weights, backToBack } })} />
                  <NumberField label="Per 100 empty seats" value={config.weights.capacityWaste} min={0} max={100} step={0.5} onChange={(capacityWaste) => setConfig({ ...config, weights: { ...config.weights, capacityWaste } })} />
                  <NumberField label="Per exam day used" value={config.weights.daysUsed} min={0} max={100} step={0.5} onChange={(daysUsed) => setConfig({ ...config, weights: { ...config.weights, daysUsed } })} />
                </fieldset>
                <div className="flex items-center justify-between border-t pt-3">
                  <p className="text-xs leading-5 text-muted-foreground">Weights only rank valid schedules. They never offset a hard violation.</p>
                  <Button variant="ghost" size="sm" disabled={running} onClick={() => setConfig(readiness.defaults)}><RotateCcw />Defaults</Button>
                </div>
              </>
            ) : <Skeleton className="h-80" />}
          </div>
        </aside>
      </section>

      {/* Results */}
      <section aria-labelledby="results-heading" className="space-y-4">
        <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="text-sm font-semibold">Results</h2>
            <TabsList>
              <TabsTrigger value="batch">This batch{batch.length ? ` · ${batch.length}` : ""}</TabsTrigger>
              <TabsTrigger value="history">Saved runs{history ? ` · ${history.length}` : ""}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="batch" className="mt-4 space-y-5">
            {runError && <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/4 p-3 text-sm text-destructive"><CircleAlert className="size-4 shrink-0" />{runError}</p>}
            {inputsShifted && <p className="rounded-lg border border-warning/40 bg-warning/6 p-3 text-sm">The dataset changed while this batch was running, so these runs did not all see identical input.</p>}
            {!batch.length && !running && (
              <div className="rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center">
                <p className="font-display text-2xl">No runs in this batch yet</p>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Choose one or more strategies and run them. Each schedule is checked by the independent validator and saved, so you can compare it later.</p>
              </div>
            )}
            {(batch.length > 0 || running) && (
              <div className="grid gap-4 md:grid-cols-3">
                {ranked.map((row, i) => <ResultCard key={row.key} row={row} rank={i + 1} maxPenalty={maxPenalty} onOpen={() => setOpen(row)} />)}
                {running && Object.entries(phases).filter(([, p]) => p === "queued" || p === "running").map(([id, p]) => (
                  <div key={id} className="flex min-h-64 flex-col justify-between rounded-xl border border-dashed bg-card/60 p-5">
                    <p className="font-medium">{ALGORITHM_LABEL[id]}</p>
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">{p === "running" ? <><Loader2 className="size-4 animate-spin text-primary" />Solving and validating on the server…</> : "Waiting for the previous strategy"}</p>
                  </div>
                ))}
              </div>
            )}
            {batch.length > 1 && <ComparisonTable rows={batch} onOpen={setOpen} caption="Ranked by feasibility first (validator-passed schedules), then fewest unscheduled exams, then lowest soft penalty (↓ lower is better), then speed. Violations count hard-constraint breaches in placed exams; same-day counts extra exams a student sits on one day. Green marks the best value among feasible runs only." />}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-5">
            {historyError && <p className="flex items-center gap-2 text-sm text-destructive"><CircleAlert className="size-4" />{historyError} <Button variant="link" size="sm" onClick={() => void loadHistory()}>Retry</Button></p>}
            {!history && !historyError && <Skeleton className="h-72 rounded-xl" />}
            {history && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-muted-foreground">Select up to six runs to compare. Runs marked <em>Unverified</em> predate the Phase 2 engine.</p>
                  {picked.length > 0 && <Button variant="ghost" size="sm" onClick={() => setPicked([])}>Clear selection ({picked.length})</Button>}
                </div>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <ul className="max-h-105 divide-y overflow-y-auto">
                    {history.map((run) => {
                      const isPicked = picked.includes(run.runId);
                      return (
                        <li key={run.runId} className={cn("flex items-center gap-4 px-4 py-2.5 text-sm", isPicked && "bg-primary/3")}>
                          <Checkbox aria-label={`Compare ${run.runId}`} checked={isPicked} disabled={!isPicked && picked.length >= 6} onCheckedChange={(value) => setPicked((list) => value ? [...list, run.runId] : list.filter((id) => id !== run.runId))} />
                          <button type="button" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-left" onClick={() => setOpen(rowFromSummary(run))}>
                            <span className="w-28 font-medium">{ALGORITHM_LABEL[run.algorithm]}</span>
                            <OutcomeBadge outcome={run.outcome} evidence={run.infeasibilityEvidence} legacy={run.source === "legacy"} />
                            <span className="font-mono text-[11px] text-muted-foreground">{run.runId}</span>
                            {run.published && <span className="rounded-full border px-2 text-[11px]">v{run.published.version}{run.published.isActive ? " · active" : ""}</span>}
                            <span className="ml-auto text-xs text-muted-foreground tabular-nums">{run.scheduledExams}/{run.totalExams} · {run.softPenalty !== null ? `penalty ${num(run.softPenalty, 1)}` : "legacy score"} · {dateTime(run.createdAt)}</span>
                          </button>
                          <Link href={`/admin/schedules?run=${run.runId}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))} aria-label={`Open ${run.runId} in the timetable`}><ArrowUpRight /></Link>
                        </li>
                      );
                    })}
                    {!history.length && <li className="px-4 py-10 text-center text-sm text-muted-foreground">No runs saved yet.</li>}
                  </ul>
                </div>
                {comparedRows.length > 1 && (
                  <ComparisonTable rows={comparedRows} onOpen={setOpen} caption={comparedSameDataset
                    ? "All selected runs used the identical dataset (same fingerprint)."
                    : "Warning: these runs did not all use the same dataset fingerprint (or predate fingerprinting), so the comparison is not like-for-like."} />
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Sticky run bar */}
      <div className="sticky bottom-4 z-20 rounded-2xl border bg-background/90 shadow-[0_8px_30px_-12px_rgb(23_32_51/0.25)] backdrop-blur-md">
        <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {running
              ? <>Running {Object.values(phases).filter((p) => p === "done").length + 1} of {Object.keys(phases).length} · <span className="font-mono tabular-nums">{(elapsed / 1000).toFixed(1)} s</span> elapsed</>
              : !selected.length ? "Select at least one strategy." : readiness?.status === "BLOCKED_BY_DATA" ? "Fix data errors before running." : `${selected.length} strateg${selected.length > 1 ? "ies" : "y"} selected · runs execute one after another on the server and cannot be cancelled mid-run (each is capped by its time limit).`}
          </p>
          <Button size="lg" className="h-10 px-4" disabled={running || !selected.length || !readiness || !config || readiness.status === "BLOCKED_BY_DATA"} onClick={() => void run()}>
            {running ? <Loader2 className="animate-spin" /> : <Play />}{running ? "Running…" : `Run ${selected.length || ""} ${selected.length === 1 ? "strategy" : "strategies"}`}
          </Button>
        </div>
      </div>

      <RunDetailSheet row={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function Intro({ actions }: { actions?: React.ReactNode }) {
  return <PageIntro eyebrow="Algorithm arena" title="Optimization Lab" description="Run, compare and validate examination schedules on the live dataset. Every schedule is checked by an independent validator before it can be called feasible." actions={actions} />;
}

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-foreground/80">{label}</span>
      <Input type="number" inputMode="decimal" className="h-8 w-28 text-right font-mono tabular-nums" value={value} min={min} max={max} step={step}
        onChange={(event) => { const next = Number(event.target.value); if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next))); }} />
    </label>
  );
}

function ResultCard({ row, rank, maxPenalty, onOpen }: { row: RunRow; rank: number; maxPenalty: number; onOpen: () => void }) {
  const failedChecks = row.checks?.filter((c) => !c.passed).length ?? 0;
  return (
    <article className={cn("flex flex-col rounded-xl border bg-card p-5 transition-shadow hover:shadow-sm", rank === 1 && row.outcome === "FEASIBLE" && "border-success/40")}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">#{rank}</p>
          <h3 className="font-medium">{ALGORITHM_LABEL[row.algorithm]}</h3>
        </div>
        <OutcomeBadge outcome={row.outcome} evidence={row.evidence} />
      </header>
      <p className="mt-4 font-display text-5xl leading-none tabular-nums">{row.scheduled}<span className="text-2xl text-muted-foreground">/{row.total}</span></p>
      <p className="mt-1 text-xs text-muted-foreground">examinations scheduled</p>
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
        <div><dt className="text-[11px] text-muted-foreground">Hard violations</dt><dd className={cn("font-semibold tabular-nums", (row.violations ?? 0) > 0 && "text-destructive")}>{row.violations ?? "—"}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground">Time{row.nodes !== null ? " · nodes" : ""}</dt><dd className="font-semibold tabular-nums">{ms(row.timeMs)}{row.nodes !== null && <span className="font-normal text-muted-foreground"> · {num(row.nodes)}</span>}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground">Slots · days</dt><dd className="font-semibold tabular-nums">{row.slotsUsed ?? "—"} · {row.daysUsed ?? "—"}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground">Seat fill</dt><dd className="font-semibold tabular-nums">{row.fill === null ? "—" : `${num(row.fill, 1)}%`}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground">Extra same-day</dt><dd className="font-semibold tabular-nums">{num(row.sameDay)}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground">Back-to-back</dt><dd className="font-semibold tabular-nums">{num(row.backToBack)}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground">Invigilators</dt><dd className={cn("font-semibold tabular-nums", row.invigilation && !row.invigilation.valid && "text-destructive")}>{row.invigilation ? `${row.invigilation.covered}/${row.invigilation.total}` : "—"}</dd></div>
        <div><dt className="text-[11px] text-muted-foreground" title="Reference backend's 0-100 score; for comparison only">Ref. score</dt><dd className="font-semibold tabular-nums">{row.referenceScore === null ? "—" : num(row.referenceScore, 1)}</dd></div>
      </dl>
      {row.penalty !== null && (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Soft penalty</span><span className="font-mono tabular-nums">{num(row.penalty, 2)}</span></div>
          <PenaltyBar components={row.components} max={maxPenalty} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs">
        <span className={cn("inline-flex items-center gap-1", row.checks ? (failedChecks ? "text-destructive" : "text-success") : "text-muted-foreground")}>
          {row.checks ? (failedChecks ? <><CircleAlert className="size-3.5" />{failedChecks} of 10 rules failed</> : <><Check className="size-3.5" />10 of 10 rules passed</>) : "Not validated (solver not run)"}
        </span>
        <Button variant="ghost" size="sm" onClick={onOpen}>Details{row.diagnostics.length ? ` · ${row.diagnostics.length}` : ""}</Button>
      </div>
    </article>
  );
}
