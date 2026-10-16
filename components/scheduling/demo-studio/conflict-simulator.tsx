"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, CircleAlert, Lightbulb, Loader2, Network, RotateCcw, ShieldAlert, ShieldCheck, Syringe, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ALGORITHM_LABEL } from "../format";
import { OutcomeBadge } from "../outcome-badge";
import { ScheduleGrid } from "./schedule-grid";
import { ALGORITHMS, SCENARIOS, type AlgorithmId, type DemoBottleneck, type DemoDataset, type DemoSimulation, type ResolutionId, type ScenarioId } from "./types";

type Status = DemoSimulation["injected"];
type Explained = Status["explained"][number];
type Publication = Status["publication"];

export interface SimulatorParams {
  scenario: ScenarioId;
  baselineAlgorithm: AlgorithmId;
  /** "" means: let the scenario choose its targets from the data. */
  examId: string;
  otherExamId: string;
}

function Stage({ n, label, tone = "neutral", children, id }: { n: number; label: string; tone?: "neutral" | "error" | "success" | "primary"; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border bg-card">
      <h3 className="flex items-center gap-2 border-b px-4 py-2.5 text-sm font-semibold">
        <span className={cn("grid size-5 place-items-center rounded-full text-[11px] text-white", { neutral: "bg-foreground/70", error: "bg-destructive", success: "bg-success", primary: "bg-primary" }[tone])}>{n}</span>
        {label}
      </h3>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export function RuleChecklist({ checks }: { checks: Status["validation"]["checks"] }) {
  return (
    <ul className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
      {checks.map((c) => (
        <li key={c.rule} className={cn("flex items-center gap-1.5", !c.passed && "font-medium text-destructive")}>
          {c.passed ? <Check className="size-3.5 shrink-0 text-success" aria-label="passed" /> : <X className="size-3.5 shrink-0" aria-label="failed" />}
          <span>{c.rule}. {c.label}</span>{!c.passed && <span className="tabular-nums">({c.violations})</span>}
        </li>
      ))}
    </ul>
  );
}

function ViolationCard({ v }: { v: Explained }) {
  return (
    <li className="relative overflow-hidden rounded-lg border bg-card py-3 pr-3 pl-4 motion-safe:animate-in motion-safe:fade-in-0">
      <span className="absolute inset-y-0 left-0 w-0.75 bg-destructive" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CircleAlert className="size-4 text-destructive" aria-hidden />
        <code className="font-mono text-[11px] font-semibold">{v.code}</code>
        <span className="text-[11px] text-muted-foreground">Rule {v.rule} · {v.ruleLabel}</span>
        <span className="rounded-full border border-destructive/30 px-1.5 text-[10px] font-medium text-destructive">Hard constraint · blocks publication</span>
      </div>
      <p className="mt-1.5 text-sm">{v.message}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{v.explanation}</p>
      {v.facts.length > 0 && (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          {v.facts.map((f) => <div key={f.label}><dt className="text-muted-foreground">{f.label}</dt><dd className="font-mono font-medium">{f.value}</dd></div>)}
        </dl>
      )}
      <p className="mt-2 flex items-start gap-1.5 text-xs"><Lightbulb className="mt-px size-3.5 shrink-0 text-primary" aria-hidden /><span><span className="font-medium">Validator remediation:</span> {v.remediation}</span></p>
      {v.alternatives.length > 0 && <p className="mt-1 pl-5 text-xs text-muted-foreground">Free alternatives in this candidate: <span className="font-mono text-foreground">{v.alternatives.join(" · ")}</span></p>}
    </li>
  );
}

export function PublicationPanel({ publication }: { publication: Publication }) {
  const { gate } = publication;
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium">
        {gate.allowed ? <ShieldCheck className="size-4 text-success" /> : <ShieldAlert className="size-4 text-destructive" />}
        Publication gate on this candidate: {gate.allowed ? "schedule checks pass" : `refused (${gate.rejections.length})`}
      </p>
      {!gate.allowed && <ul className="mt-1.5 space-y-1 pl-5">{gate.rejections.map((r) => <li key={r.code}><code className="font-mono text-[10.5px] font-semibold">{r.code}</code> <span className="text-muted-foreground">{r.message}</span></li>)}</ul>}
      <p className="mt-2 text-muted-foreground">{publication.sandboxReason}</p>
      <p className="mt-1.5 flex flex-wrap gap-3">
        <Link href="/admin/optimization" className="inline-flex items-center gap-1 text-primary hover:underline">Optimization Lab<ArrowUpRight className="size-3" /></Link>
        <Link href="/admin/schedules" className="inline-flex items-center gap-1 text-primary hover:underline">Timetable & publication<ArrowUpRight className="size-3" /></Link>
      </p>
    </div>
  );
}

/** Any validated candidate: injected or corrected. */
type Validated = { validation: { violations: { code: string; examIds: string[] }[] } };

export const overlapPairs = (status: Validated) => status.validation.violations.filter((v) => v.code === "STUDENT_OVERLAP").map((v) => [v.examIds[0], v.examIds[1]] as [string, string]);
export const errorExams = (status: Validated) => new Set(status.validation.violations.flatMap((v) => v.examIds));

export function ScenarioDetail({ meta }: { meta: DemoDataset["scenarios"][ScenarioId] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-lg border bg-muted/25 p-3 text-xs sm:grid-cols-2">
      <div><dt className="font-medium">Condition created</dt><dd className="text-muted-foreground">{meta.condition}</dd></div>
      <div><dt className="font-medium">Expected validator result</dt><dd className="text-muted-foreground">{meta.expected}</dd></div>
      <div><dt className="font-medium">Diagnostic category</dt><dd className="text-muted-foreground">{meta.category}</dd></div>
      <div><dt className="font-medium">Remediation</dt><dd className="text-muted-foreground">{meta.remediation}</dd></div>
      <div className="sm:col-span-2"><dt className="font-medium">Expected after correction</dt><dd className="text-muted-foreground">{meta.afterCorrection}</dd></div>
    </dl>
  );
}

/** Scenario H: preflight proves the squeezed variant infeasible; a search limit, by contrast, proves nothing. */
export function BottleneckPanel({ data, busy, error, onRun }: { data: DemoBottleneck | null; busy: boolean; error: string | null; onRun: () => void }) {
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 gap-y-2 rounded-lg border bg-muted/25 p-3 text-xs sm:grid-cols-2">
        <div><dt className="font-medium">Condition created</dt><dd className="text-muted-foreground">An in-memory copy of the input keeps fewer time slots than the largest group of exams that all share students.</dd></div>
        <div><dt className="font-medium">Expected result</dt><dd className="text-muted-foreground">Preflight proves no timetable exists (STUDENT_CONFLICT_BOTTLENECK) before any algorithm runs.</dd></div>
        <div><dt className="font-medium">Diagnostic category</dt><dd className="text-muted-foreground">An input problem (not enough slots), not an invalid assignment.</dd></div>
        <div><dt className="font-medium">Remediation / after correction</dt><dd className="text-muted-foreground">Restore the slots; backtracking then finds a validator-approved schedule.</dd></div>
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">The live tables are read, never changed: the slots are removed from a copy in memory.</p>
        <Button onClick={onRun} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Syringe />}Run the bottleneck scenario</Button>
      </div>
      {error && <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
      {data && (
        <div className="space-y-3">
          <Stage n={1} label="The squeezed input" tone="primary">
            <p className="text-sm leading-6 text-muted-foreground">{data.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
              <div><dt className="text-muted-foreground">Largest clique</dt><dd className="font-mono font-medium">{data.clique.size} exams</dd></div>
              <div><dt className="text-muted-foreground">Clique members</dt><dd className="font-mono font-medium">{data.clique.examIds.join(", ")}</dd></div>
              <div><dt className="text-muted-foreground">Non-overlapping slots</dt><dd className="font-mono font-medium">{data.slots.disjointBefore} to {data.slots.disjointAfter}</dd></div>
              <div><dt className="text-muted-foreground">Slots kept</dt><dd className="font-mono font-medium">{data.slots.kept.join(", ")}</dd></div>
            </dl>
          </Stage>
          <Stage n={2} label="Preflight: a proof, not a guess" tone="error">
            <ul className="space-y-1.5 text-sm">
              {data.preflight.filter((d) => d.severity !== "info").map((d, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-2"><code className="font-mono text-[11px] font-semibold">{d.code}</code>{d.provesInfeasible && <span className="rounded-full border border-destructive/30 px-1.5 text-[10px] font-medium text-destructive">proves infeasibility</span>}<span className="text-muted-foreground">{d.message}</span></li>
              ))}
            </ul>
            <p className="flex flex-wrap gap-3 text-xs">{data.runs.map((r) => <span key={r.algorithm} className="inline-flex items-center gap-1.5"><OutcomeBadge outcome={r.outcome} evidence={r.evidence} />{ALGORITHM_LABEL[r.algorithm]}: {r.solverRan ? "solver ran" : "no solver needed"}</span>)}</p>
          </Stage>
          <Stage n={3} label="Contrast: a search limit proves nothing" tone="neutral">
            <p className="flex flex-wrap items-center gap-2 text-sm"><OutcomeBadge outcome={data.contrast.outcome} />{data.contrast.message} ({data.contrast.nodes} nodes explored.)</p>
          </Stage>
          <Stage n={4} label="Correction: restore the slots" tone={data.corrected.valid ? "success" : "error"}>
            <p className="flex flex-wrap items-center gap-2 text-sm"><OutcomeBadge outcome={data.corrected.outcome} />{data.corrected.message} {data.corrected.placed}/{data.corrected.total} exams placed.</p>
          </Stage>
        </div>
      )}
    </div>
  );
}

export function ConflictSimulator({ dataset, params, onParams, simulation, busy, error, onInject, onReset, onShowInGraph, onContinue, bottleneck }: {
  bottleneck: { data: DemoBottleneck | null; busy: boolean; error: string | null; onRun: () => void };
  dataset: DemoDataset;
  params: SimulatorParams;
  onParams: (next: SimulatorParams) => void;
  simulation: DemoSimulation | null;
  busy: boolean;
  error: string | null;
  onInject: () => void;
  onReset: () => void;
  onShowInGraph: () => void;
  onContinue: () => void;
}) {
  const [showBottleneck, setShowBottleneck] = useState(false);
  const pairs = [...dataset.graph.edges]
    .filter((e) => params.scenario !== "BACKLOG_CONFLICT" || (e.backlogShared > 0 && e.crossCohort))
    .sort((a, b) => b.shared - a.shared || a.source.localeCompare(b.source)).slice(0, 40);
  const exams = [...dataset.graph.nodes].sort((a, b) => a.id.localeCompare(b.id));
  const targetKind = params.scenario === "STUDENT_OVERLAP" || params.scenario === "BACKLOG_CONFLICT" ? "pair" : ["ROOM_CAPACITY_EXCEEDED", "ROOM_TYPE_MISMATCH", "SLOT_RULE_VIOLATED"].includes(params.scenario) ? "exam" : "auto";
  const sim = simulation;
  const changed = new Set(sim?.injection.changes.map((c) => c.examId) ?? []);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">Choose a controlled conflict</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">The simulator copies a validator-approved schedule, injects one change, and asks the real validator to judge the copy. Nothing touches the database.</p>
          </div>
          <span className="rounded-md border border-dashed border-primary/50 bg-primary/5 px-2 py-1 font-mono text-[10.5px] font-semibold tracking-wide text-primary">SANDBOX SIMULATION — NOT SAVED TO LIVE DATA</span>
        </div>
        <div role="radiogroup" aria-label="Conflict scenario" className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SCENARIOS.map((s) => {
            const active = !showBottleneck && params.scenario === s.id;
            const meta = dataset.scenarios[s.id];
            return (
              <button key={s.id} type="button" role="radio" aria-checked={active} onClick={() => { setShowBottleneck(false); onParams({ ...params, scenario: s.id, examId: "", otherExamId: "" }); }}
                className={cn("rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none", active ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
                <span className="font-mono text-[10px] text-muted-foreground">Scenario {meta.letter}</span>
                <span className="block text-sm font-medium">{meta.title}</span>
                <span className="block text-xs text-muted-foreground">{meta.summary}</span>
              </button>
            );
          })}
          <button type="button" role="radio" aria-checked={showBottleneck} onClick={() => setShowBottleneck(true)}
            className={cn("rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none", showBottleneck ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
            <span className="font-mono text-[10px] text-muted-foreground">Scenario H</span>
            <span className="block text-sm font-medium">Genuine bottleneck</span>
            <span className="block text-xs text-muted-foreground">Too few slots for a group of mutually conflicting exams: proven impossible before solving.</span>
          </button>
        </div>
        <div className="mt-3">{showBottleneck ? <BottleneckPanel data={bottleneck.data} busy={bottleneck.busy} error={bottleneck.error} onRun={bottleneck.onRun} /> : <ScenarioDetail meta={dataset.scenarios[params.scenario]} />}</div>
        {!showBottleneck && <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-[11px] text-muted-foreground">Baseline algorithm
            <select value={params.baselineAlgorithm} onChange={(e) => onParams({ ...params, baselineAlgorithm: e.target.value as AlgorithmId })} className="mt-0.5 block h-8 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              {ALGORITHMS.map((a) => <option key={a} value={a}>{ALGORITHM_LABEL[a]}</option>)}
            </select>
          </label>
          {targetKind === "pair" && (
            <label className="text-[11px] text-muted-foreground">Exams that share students
              <select value={params.examId ? `${params.examId}|${params.otherExamId}` : ""} onChange={(e) => { const [a = "", b = ""] = e.target.value ? e.target.value.split("|") : []; onParams({ ...params, examId: a, otherExamId: b }); }}
                className="mt-0.5 block h-8 max-w-72 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <option value="">Auto: largest shared pair that isolates the rule</option>
                {pairs.map((e) => <option key={`${e.source}|${e.target}`} value={`${e.source}|${e.target}`}>{e.source} ↔ {e.target} · {e.shared} shared</option>)}
              </select>
            </label>
          )}
          {targetKind === "exam" && (
            <label className="text-[11px] text-muted-foreground">Target exam
              <select value={params.examId} onChange={(e) => onParams({ ...params, examId: e.target.value, otherExamId: "" })} className="mt-0.5 block h-8 max-w-64 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <option value="">Auto: chosen from the data</option>
                {exams.map((n) => <option key={n.id} value={n.id}>{n.id}{n.requiresLab ? " (lab)" : ""}{n.fixedSlotId ? ` (fixed ${n.fixedSlotId})` : ""}</option>)}
              </select>
            </label>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onReset} disabled={busy || !sim}><RotateCcw />Reset scenario</Button>
            <Button onClick={onInject} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Syringe />}Inject conflict</Button>
          </div>
        </div>}
        {error && <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
      </div>

      {!showBottleneck && !sim && !busy && <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Pick a scenario and inject it. Reset discards the candidate; nothing was saved, so there is nothing to undo on the server.</p>}

      {!showBottleneck && sim && (
        <div className="space-y-4">
          <Stage n={1} label="Valid source schedule" tone="success">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <OutcomeBadge outcome={sim.baseline.outcome} />
              <span>{ALGORITHM_LABEL[sim.baseline.algorithm]} placed {sim.baseline.assignments.length} exams; the validator passed {sim.baseline.validation?.checks.filter((c) => c.passed).length}/{sim.baseline.validation?.checks.length} rules.</span>
              <span className="font-mono text-xs text-muted-foreground">dataset {sim.fingerprint}</span>
            </div>
          </Stage>

          <Stage n={2} label="Injected demo conflict" tone="primary">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{sim.injection.title}</span>
              <span className="rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">{sim.injection.origin === "test-lab-fixture" ? "Test Lab fixture tamper (independent-validation)" : "Targets chosen from this dataset"}</span>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">{sim.injection.description}</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-5">
              {sim.injection.facts.map((f) => <div key={f.label}><dt className="text-muted-foreground">{f.label}</dt><dd className="font-mono font-medium">{f.value}</dd></div>)}
            </dl>
            <ul className="space-y-1 text-xs">
              {sim.injection.changes.map((c, i) => (
                <li key={`${c.examId}-${i}`} className="flex flex-wrap items-center gap-1.5">
                  <code className="font-mono font-semibold">{c.examId}</code>
                  <span className="font-mono text-muted-foreground">{c.from ? `${c.from.slotId} / ${c.from.roomId}` : "(new)"}</span>
                  <ArrowRight className="size-3 text-muted-foreground" />
                  <span className="font-mono text-destructive">{c.to.slotId} / {c.to.roomId}</span>
                  <span className="text-muted-foreground">· {c.note}</span>
                </li>
              ))}
            </ul>
          </Stage>

          <Stage n={3} label="Validation result" tone="error" id="demo-validation">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <OutcomeBadge outcome={sim.injected.outcome} />
              <span>The independent validator found <strong>{sim.injected.validation.violationCount}</strong> hard-constraint violation{sim.injected.validation.violationCount === 1 ? "" : "s"} in {sim.injected.validation.checkedAssignments} assignments.</span>
              <Button size="sm" variant="outline" onClick={onShowInGraph}><Network />Show in graph</Button>
            </div>
            {!sim.injected.hitTarget && <p className="text-xs text-destructive">The targeted rule was not triggered; the validator's actual findings are shown as-is.</p>}
            {sim.injected.validation.violations.some((v) => !sim.injection.targetCodes.includes(v.code)) && <p className="text-xs text-muted-foreground">The validator also reported rules this scenario did not target. They are real findings on this candidate and are shown unfiltered.</p>}
            <RuleChecklist checks={sim.injected.validation.checks} />
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <ul className="space-y-2">{sim.injected.explained.map((v, i) => <ViolationCard key={`${v.code}-${i}`} v={v} />)}</ul>
              <ScheduleGrid slots={dataset.slots} rooms={dataset.rooms} assignments={sim.injected.assignments} caption="Injected candidate (red: in a violation · green: changed)" highlight={{ error: errorExams(sim.injected), changed }} />
            </div>
            <PublicationPanel publication={sim.injected.publication} />
            <div className="flex justify-end"><Button onClick={onContinue}><Wrench />Suggested remediation</Button></div>
          </Stage>
        </div>
      )}
    </div>
  );
}

const STRATEGIES: { id: ResolutionId; title: string; body: string }[] = [
  { id: "repair", title: "Targeted repair", body: "Re-place only the tampered exams, every other assignment pinned, using the scheduler's own clash and best-fit room checks." },
  { id: "regenerate", title: "Regenerate", body: "Discard the candidate and re-run a scheduling algorithm on the clean sandbox input." },
  { id: "restore", title: "Restore", body: "Put the tampered exams back where the source schedule had them." },
];

export function ResolutionPanel({ dataset, simulation, resolved, strategy, algorithm, onStrategy, onAlgorithm, onApply, busy, error, candidateMatches }: {
  dataset: DemoDataset;
  simulation: DemoSimulation | null;
  resolved: DemoSimulation | null;
  strategy: ResolutionId;
  algorithm: AlgorithmId;
  onStrategy: (s: ResolutionId) => void;
  onAlgorithm: (a: AlgorithmId) => void;
  onApply: () => void;
  busy: boolean;
  error: string | null;
  candidateMatches: boolean | null;
}) {
  if (!simulation) return <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">Inject a conflict in the simulator first. The correction is applied to that sandbox candidate.</p>;
  const res = resolved?.resolution ?? null;
  const before = resolved?.injected ?? simulation.injected;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold">Apply a supported correction</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">The server rebuilds the same candidate deterministically, applies the correction, and runs the validator again. A correction counts only if the validator passes it.</p>
        <div role="radiogroup" aria-label="Correction strategy" className="mt-3 grid gap-2 md:grid-cols-3">
          {STRATEGIES.map((s) => (
            <button key={s.id} type="button" role="radio" aria-checked={strategy === s.id} onClick={() => onStrategy(s.id)}
              className={cn("rounded-lg border p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40", strategy === s.id ? "border-primary bg-primary/5" : "hover:border-primary/40")}>
              <span className="block text-sm font-medium">{s.title}</span><span className="block text-xs text-muted-foreground">{s.body}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          {strategy === "regenerate" && (
            <label className="text-[11px] text-muted-foreground">Algorithm
              <select value={algorithm} onChange={(e) => onAlgorithm(e.target.value as AlgorithmId)} className="mt-0.5 block h-8 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                {ALGORITHMS.map((a) => <option key={a} value={a}>{ALGORITHM_LABEL[a]}</option>)}
              </select>
            </label>
          )}
          <Button className="ml-auto" onClick={onApply} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Wrench />}Apply and revalidate</Button>
        </div>
        {error && <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
      </div>

      {res && resolved && (
        <div className="space-y-4">
          {candidateMatches === false && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">The rebuilt candidate differs from the one shown in the simulator (the data changed in between). The result below applies to the rebuilt candidate.</p>}
          <Stage n={4} label="Suggested remediation applied" tone="primary">
            <p className="text-sm">{res.summary}</p>
            {res.regenerated && <p className="flex items-center gap-2 text-xs text-muted-foreground"><OutcomeBadge outcome={res.regenerated.outcome as DemoSimulation["baseline"]["outcome"]} />{ALGORITHM_LABEL[res.regenerated.algorithm]} · {res.regenerated.durationMs.toFixed(2)} ms{res.regenerated.searchNodes !== null ? ` · ${res.regenerated.searchNodes} nodes` : ""}</p>}
            {res.steps.length > 0 && (
              <ul className="space-y-1 text-xs">{res.steps.map((s) => <li key={s.examId} className="flex flex-wrap gap-1.5"><code className="font-mono font-semibold">{s.examId}</code><span className={cn(s.to ? "text-muted-foreground" : "text-destructive")}>{s.note}</span></li>)}</ul>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1 pr-3 font-medium">Exam</th><th className="py-1 pr-3 font-medium">Injected candidate</th><th className="py-1 font-medium">Corrected candidate</th></tr></thead>
                <tbody>{res.changedFromInjected.map((d) => <tr key={d.examId} className="border-b last:border-0"><td className="py-1 pr-3 font-mono font-semibold">{d.examId}</td><td className="py-1 pr-3 font-mono text-destructive">{d.before.join(", ") || "—"}</td><td className="py-1 font-mono text-success">{d.after.join(", ") || "unscheduled"}</td></tr>)}</tbody>
              </table>
            </div>
          </Stage>

          <Stage n={5} label="Corrected candidate, revalidated" tone={res.resolved ? "success" : "error"} id="demo-revalidation">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <OutcomeBadge outcome={res.corrected.outcome} />
              <span className="tabular-nums">Violations <strong className="text-destructive">{before.validation.violationCount}</strong> → <strong className={res.corrected.validation.violationCount ? "text-destructive" : "text-success"}>{res.corrected.validation.violationCount}</strong></span>
              <span className="text-muted-foreground">{res.changedFromInjected.length} assignment{res.changedFromInjected.length === 1 ? "" : "s"} changed · {res.changedFromSource.length} differ from the source schedule</span>
              {res.corrected.unscheduled.length > 0 && <span className="text-destructive">Unscheduled: {res.corrected.unscheduled.join(", ")}</span>}
            </div>
            {!res.resolved && <p className="text-sm text-destructive">The correction did not produce a valid schedule. The remaining violations are listed below; nothing has been marked as fixed.</p>}
            <RuleChecklist checks={res.corrected.validation.checks} />
            {res.corrected.explained.length > 0 && <ul className="space-y-2">{res.corrected.explained.map((v, i) => <ViolationCard key={`${v.code}-${i}`} v={v} />)}</ul>}
            <div className="grid gap-4 xl:grid-cols-2">
              <ScheduleGrid slots={dataset.slots} rooms={dataset.rooms} assignments={before.assignments} caption={`Before: injected candidate (${before.validation.violationCount} violation${before.validation.violationCount === 1 ? "" : "s"})`} highlight={{ error: errorExams(before) }} />
              <ScheduleGrid slots={dataset.slots} rooms={dataset.rooms} assignments={res.corrected.assignments} caption={`After: corrected candidate (${res.corrected.validation.violationCount} violation${res.corrected.validation.violationCount === 1 ? "" : "s"})`} highlight={{ error: errorExams(res.corrected), changed: new Set(res.changedFromInjected.map((d) => d.examId)) }} />
            </div>
          </Stage>

          <Stage n={6} label="Publication readiness" tone={res.publication.gate.allowed ? "success" : "error"} id="demo-publication">
            <PublicationPanel publication={res.publication} />
          </Stage>
        </div>
      )}
    </div>
  );
}
