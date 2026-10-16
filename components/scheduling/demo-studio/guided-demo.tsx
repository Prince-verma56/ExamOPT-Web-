"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, CircleAlert, Loader2, Play, RotateCcw, Syringe, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DiagnosticList } from "../diagnostic-list";
import { ALGORITHM_LABEL, ms, num } from "../format";
import { OUTCOME_META, OutcomeBadge } from "../outcome-badge";
import { Segmented } from "../segmented";
import { errorExams, overlapPairs, PublicationPanel, RuleChecklist, ScenarioDetail } from "./conflict-simulator";
import { DemoGraph } from "./demo-graph";
import { ScheduleGrid } from "./schedule-grid";
import { TracePlayer } from "./trace-player";
import { ALGORITHMS, SCENARIOS, type AlgorithmId, type DemoDataset, type ResolutionId, type ScenarioId } from "./types";
import type { DemoController } from "./use-demo-controller";

/** Plain-language definitions, shown on the step where each term first matters. */
const TERMS: Record<string, string> = {
  Preflight: "Checks on the input before any algorithm runs: missing or malformed records, and conditions that already prove no timetable can exist.",
  Fingerprint: "A short code computed from the exact input. Two runs with the same fingerprint used identical data.",
  "Conflict edge": "A line between two exams that share at least one enrolled student. Those two exams must not be held at overlapping times. It is a rule, not an error.",
  Degree: "How many other exams an exam shares students with. High-degree exams are the hardest to place.",
  Clique: "A group of exams that all share students with each other. Each needs its own time slot, so the largest clique is a lower bound on the slots required.",
  Backlog: "A student re-taking an exam from an earlier semester, or a bridge course. It links exams of different cohorts.",
  Feasible: "Every exam has a slot and a room, and the independent validator found zero hard-rule violations.",
  Partial: "A heuristic left some exams unscheduled. This does not prove that no timetable exists.",
  "Search limit": "Backtracking stopped at its node or time budget. Feasibility is unknown: a limit is not a proof of impossibility.",
  Validator: "A separate checker that recomputes all 10 hard rules from the raw data and the assignments. It shares no code with the algorithms.",
  "Execution trace": "The decisions an algorithm recorded while it actually ran, replayed here step by step.",
  Sandbox: "An in-memory copy. Changes made to it are never written to the database or the published timetable.",
  Candidate: "A proposed timetable (a list of exam, slot and room assignments) that has not been saved.",
  Violation: "A broken hard rule in a candidate's assignments. It describes an invalid assignment, not an invalid source dataset.",
  "Publication gate": "The server-side check that only a saved, feasible, revalidated run can become the timetable students see.",
};

interface Narrative {
  title: string;
  seeing: string;
  why: string;
  did: string;
  means: string;
  next: string;
  terms: string[];
}

const STEP_TITLES = ["Meet the dataset", "Understand the conflict graph", "Compare scheduling strategies", "Introduce a controlled conflict", "Inspect the validator's finding", "Understand the suggested correction", "Revalidate the corrected candidate", "Final schedule and publication readiness"];
export const GUIDED_STEPS = STEP_TITLES.length;

function narrative(step: number, c: DemoController, d: DemoDataset, scenario: ScenarioId): Narrative {
  const counts = d.counts;
  const arena = c.arena;
  const sim = c.simulation;
  const res = c.resolved?.resolution ?? null;
  const graph = d.graph.stats;
  const topExam = [...d.graph.nodes].sort((a, b) => b.degree - a.degree)[0];
  switch (step) {
    case 0: return {
      title: STEP_TITLES[0], terms: ["Preflight", "Fingerprint"],
      seeing: `The scheduling input read from ${d.source === "live" ? "the live database" : "the Test Lab fixture"}: examinations, students and their enrollments, rooms and time slots.`,
      why: "Every later step runs on exactly this snapshot. If the input were broken, no algorithm's answer could be trusted.",
      did: `Loaded ${counts.exams} exams, ${num(counts.students)} students with ${num(counts.enrollments)} enrollments, ${counts.rooms} rooms (${counts.labRooms} labs) and ${counts.slots} slots over ${counts.days} days, then ran preflight: ${d.preflight.errors} error${d.preflight.errors === 1 ? "" : "s"}, ${d.preflight.warnings} warning${d.preflight.warnings === 1 ? "" : "s"}.`,
      means: d.ready
        ? `The input is ready: no data errors and no proof that scheduling is impossible.${d.matchesReferenceDataset === false ? " It differs from the bundled reference dataset, so earlier saved runs may no longer validate against it." : ""}`
        : "The input is not ready. The diagnostics name the records to fix; no schedule should be trusted until they are corrected.",
      next: "See how enrollments become scheduling rules in the conflict graph.",
    };
    case 1: return {
      title: STEP_TITLES[1], terms: ["Conflict edge", "Degree", "Clique", "Backlog"],
      seeing: "Each dot is an examination. A line joins two exams that share at least one enrolled student. Dashed lines are links between different cohorts, usually through backlog students.",
      why: "These lines are the main rule a timetable must respect: joined exams can never overlap. Counts are aggregated, so no student is identified.",
      did: `Built ${graph.edgeCount} edges from ${num(counts.enrollments)} enrollments with the engine's own graph builder.`,
      means: `${topExam ? `${topExam.id} is the most constrained exam (shares students with ${topExam.degree} others). ` : ""}The largest clique has ${graph.cliqueLowerBound} exams, so any timetable needs at least ${graph.cliqueLowerBound} separate slots; ${counts.slots} are available.`,
      next: "Ask three algorithms to build a timetable that respects these rules.",
    };
    case 2: return {
      title: STEP_TITLES[2], terms: ["Feasible", "Partial", "Search limit", "Validator", "Execution trace"],
      seeing: "Three strategies on the same input: First-Fit (simple baseline), Welsh-Powell (graph colouring) and Backtracking (complete search). Below is the selected run's recorded decisions.",
      why: "The algorithms behave differently on the same rules. The independent validator, not the algorithm, decides which results are valid.",
      did: arena
        ? arena.entries.map((e) => `${ALGORITHM_LABEL[e.result.algorithm]}: ${e.result.assignments.length}/${e.result.totalExams} placed, ${OUTCOME_META[e.result.outcome].label.toLowerCase()}, ${ms(e.result.durationMs)}${e.result.searchNodes !== null ? `, ${num(e.result.searchNodes)} search nodes` : ""}`).join(". ") + "."
        : "Not run yet. Press “Run all strategies”.",
      means: arena
        ? `Ranked by validity first: ${arena.ranking.map((id) => ALGORITHM_LABEL[id]).join(" > ")}. ${arena.entries.filter((e) => e.result.outcome === "PARTIAL").map((e) => `${ALGORITHM_LABEL[e.result.algorithm]} left ${e.result.unscheduledExamIds.join(", ")} unscheduled: its one-pass rule painted itself into a corner, which says nothing about whether a timetable exists.`).join(" ")}`
        : "Once run, each result is labelled by the validator's verdict.",
      next: "Take a valid timetable and deliberately break one rule in a copy of it.",
    };
    case 3: return {
      title: STEP_TITLES[3], terms: ["Sandbox", "Candidate"],
      seeing: "A copy of a validator-approved timetable with one deliberate change, highlighted on the conflict graph (red line: an actual overlap).",
      why: "A trustworthy scheduler must catch bad timetables, including ones a person edits by hand. This tests the checker, not the algorithm.",
      did: sim ? sim.injection.description : `Not injected yet. Choose a scenario (${d.scenarios[scenario].letter}: ${d.scenarios[scenario].title}) and press “Inject”.`,
      means: sim ? "Only the copy changed. The database and the published timetable are untouched." : "The original stays valid; only the copy will be broken.",
      next: "Ask the independent validator to judge the broken copy.",
    };
    case 4: return {
      title: STEP_TITLES[4], terms: ["Violation", "Validator"],
      seeing: "The validator's report on the broken copy: which of the 10 rules failed, the exams, slots and rooms involved, and the real figures.",
      why: "A finding is only useful if it says exactly what is wrong and how to fix it.",
      did: sim ? `Re-checked ${sim.injected.validation.checkedAssignments} assignments against all 10 rules from the raw data: ${sim.injected.validation.violationCount} violation${sim.injected.validation.violationCount === 1 ? "" : "s"} (${[...new Set(sim.injected.validation.violations.map((v) => v.code))].join(", ")}).` : "Nothing to validate yet: inject a conflict in step 4.",
      means: sim ? "These are invalid assignments in the candidate. The source data is still correct; the timetable built on it is not." : "",
      next: "Apply a correction that matches the finding.",
    };
    case 5: return {
      title: STEP_TITLES[5], terms: ["Candidate"],
      seeing: "A correction applied to the broken copy. Targeted repair moves only the tampered exams, using the scheduler's own clash and room checks.",
      why: "A fix must address the actual violation without creating a new one elsewhere.",
      did: res ? res.summary : sim ? "Not applied yet. Choose a strategy and press “Apply”." : "Inject a conflict first (step 4).",
      means: res ? `${res.changedFromInjected.length} assignment${res.changedFromInjected.length === 1 ? "" : "s"} changed. Whether this is a fix is decided in the next step, by the validator.` : "",
      next: "Send the corrected copy back through the same validator.",
    };
    case 6: return {
      title: STEP_TITLES[6], terms: ["Validator"],
      seeing: "The corrected copy, checked again against all 10 rules, next to the broken one.",
      why: "Nothing counts as fixed until the independent check passes.",
      did: res ? `Violations went from ${c.resolved!.injected.validation.violationCount} to ${res.corrected.validation.violationCount}.` : "No correction applied yet.",
      means: res ? (res.resolved ? "Every hard rule passes: the corrected candidate is valid." : "The correction did not resolve everything; the remaining violations stay listed below.") : "",
      next: "See what this means for the timetable students actually see.",
    };
    default: return {
      title: STEP_TITLES[7], terms: ["Publication gate", "Sandbox"],
      seeing: "Where each version of the timetable lives: the input, the original, the broken copy, the corrected copy, saved runs and the published timetable.",
      why: "Judges and students must never confuse a demonstration copy with the official timetable.",
      did: res ? `Ran the real publication gate on the corrected copy: ${res.publication.gate.allowed ? "its schedule checks pass" : "refused"}. Read the active publication without changing it.` : "Read the active publication without changing it.",
      means: "Demonstration copies are never saved, so they can never be published. The official path is: generate and save a run in the Optimization Lab, then publish from the Timetable, where the gate re-checks it against today's data.",
      next: "Explore any step freely in Explore mode, or open the Timetable.",
    };
  }
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div>
      <dt className="text-[11px] font-semibold tracking-wide text-primary uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm leading-6 text-foreground/90">{children}</dd>
    </div>
  );
}

function Tile({ label, value, meaning }: { label: string; value: React.ReactNode; meaning: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{meaning}</p>
    </div>
  );
}

export function GuidedDemo({ c, step, onStep, onExit }: { c: DemoController; step: number; onStep: (n: number) => void; onExit: () => void }) {
  const d = c.dataset!;
  const [graphSelected, setGraphSelected] = useState<string | null>(null);
  const examNames = useMemo(() => new Map(d.graph.nodes.map((n) => [n.id, n.name])), [d]);
  const n = narrative(step, c, d, c.params.scenario);
  const sim = c.simulation;
  const res = c.resolved?.resolution ?? null;
  const entry = c.arena?.entries.find((e) => e.result.algorithm === c.traceAlgorithm) ?? c.arena?.entries[0];
  const done = [true, true, Boolean(c.arena), Boolean(sim), Boolean(sim), Boolean(res), Boolean(res), Boolean(res)];

  const action = (() => {
    if (step === 2) return <Button onClick={() => void c.runArena()} disabled={c.arenaRunning}>{c.arenaRunning ? <Loader2 className="animate-spin" /> : <Play />}{c.arena ? "Run again" : "Run all strategies"}</Button>;
    if (step === 3) return (
      <div className="space-y-2">
        <label className="block text-xs font-medium">Scenario
          <select value={c.params.scenario} onChange={(e) => c.setParams({ ...c.params, scenario: e.target.value as ScenarioId, examId: "", otherExamId: "" })}
            className="mt-1 block h-9 w-full rounded-md border bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
            {SCENARIOS.map((s) => <option key={s.id} value={s.id}>{d.scenarios[s.id].letter}. {d.scenarios[s.id].title}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void c.inject()} disabled={c.simBusy}>{c.simBusy ? <Loader2 className="animate-spin" /> : <Syringe />}{sim ? "Inject again" : "Inject conflict"}</Button>
          {sim && <Button variant="outline" onClick={c.resetScenario}><RotateCcw />Discard copy</Button>}
        </div>
      </div>
    );
    if (step === 5 && sim) return (
      <div className="space-y-2">
        <Segmented<ResolutionId> label="Correction strategy" value={c.strategy} onChange={c.setStrategy} options={[{ value: "repair", label: "Targeted repair" }, { value: "regenerate", label: "Regenerate" }, { value: "restore", label: "Restore" }]} />
        {c.strategy === "regenerate" && (
          <select value={c.regenAlgorithm} onChange={(e) => c.setRegenAlgorithm(e.target.value as AlgorithmId)} aria-label="Algorithm to regenerate with" className="block h-9 w-full rounded-md border bg-background px-2 text-sm">
            {ALGORITHMS.map((a) => <option key={a} value={a}>{ALGORITHM_LABEL[a]}</option>)}
          </select>
        )}
        <Button onClick={() => void c.apply()} disabled={c.resBusy}>{c.resBusy ? <Loader2 className="animate-spin" /> : <Wrench />}Apply and revalidate</Button>
      </div>
    );
    return null;
  })();
  const error = step === 2 ? c.arenaError : step === 3 ? c.simError : step === 5 ? c.resError : null;

  const visual = (() => {
    switch (step) {
      case 0: return (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <Tile label="Examinations" value={d.counts.exams} meaning={`${d.counts.labExams} are practicals that need a laboratory.`} />
            <Tile label="Students" value={num(d.counts.students)} meaning={`${num(d.counts.enrollments)} exam enrollments; ${num(d.counts.backlogEnrollments)} are backlog or bridge enrollments.`} />
            <Tile label="Rooms" value={d.counts.rooms} meaning={`${d.counts.labRooms} laboratories, ${num(d.counts.totalSeats)} seats in total.`} />
            <Tile label="Time slots" value={d.counts.slots} meaning={`Morning and evening sessions over ${d.counts.days} days.`} />
            <Tile label="Fixed-slot exams" value={d.counts.fixedSlotExams} meaning="Exams an administrator pinned to a specific slot." />
            <Tile label="Blocked slots" value={d.counts.examUnavailabilities + d.counts.roomUnavailabilities} meaning="Slots in which an exam or a room may not be used." />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Preflight findings</h3>
            <DiagnosticList diagnostics={d.preflight.diagnostics} empty="Preflight found nothing to report: no data errors, no bottlenecks, no proof of infeasibility." />
          </div>
        </div>
      );
      case 1: return <DemoGraph nodes={d.graph.nodes} edges={d.graph.edges} slots={d.slots} selected={graphSelected} onSelect={setGraphSelected} />;
      case 2: return entry ? (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {c.arena!.entries.map((e) => (
              <div key={e.result.algorithm}
                className={cn("relative rounded-xl border bg-card p-4 text-left has-[button:focus-visible]:ring-3 has-[button:focus-visible]:ring-ring/40", e.result.algorithm === entry.result.algorithm && "border-primary ring-1 ring-primary/30")}>
                <span className="flex items-center justify-between gap-2">
                  {/* Stretched button: the whole card selects the trace, without nesting the badge's own button inside it. */}
                  <button type="button" onClick={() => c.setTraceAlgorithm(e.result.algorithm)} aria-pressed={e.result.algorithm === entry.result.algorithm}
                    className="font-medium outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']">{ALGORITHM_LABEL[e.result.algorithm]}</button>
                  <OutcomeBadge outcome={e.result.outcome} evidence={e.result.infeasibilityEvidence} className="relative z-10" />
                </span>
                <span className="mt-2 block text-2xl font-semibold tabular-nums">{e.result.assignments.length}<span className="text-base font-normal text-muted-foreground">/{e.result.totalExams} placed</span></span>
                <span className="mt-1 block text-xs text-muted-foreground">Validator: {e.result.validation?.checks.filter((x) => x.passed).length}/10 rules pass · {e.result.metrics?.slotsUsed ?? "—"} slots used · {ms(e.result.durationMs)} (traced run)</span>
                <span className="mt-1 block text-xs text-muted-foreground">{OUTCOME_META[e.result.outcome].explain}</span>
              </div>
            ))}
          </div>
          <TracePlayer key={`${entry.result.algorithm}-${entry.result.startedAt}`} entry={entry} slots={d.slots} rooms={d.rooms} nodes={d.graph.nodes} edges={d.graph.edges} onEvent={c.setTraceEvent} />
        </div>
      ) : <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Nothing has run yet. Results appear only after a real run returns from the server.</p>;
      case 3: return sim ? (
        <div className="space-y-3">
          <ScenarioDetail meta={d.scenarios[sim.injection.scenario as ScenarioId]} />
          <ul className="space-y-1 rounded-xl border bg-card p-3 text-xs">
            {sim.injection.changes.map((ch, i) => <li key={i}><code className="font-mono font-semibold">{ch.examId}</code> <span className="font-mono text-muted-foreground">{ch.from ? `${ch.from.slotId} / ${ch.from.roomId}` : "(new)"}</span> to <span className="font-mono text-destructive">{ch.to.slotId} / {ch.to.roomId}</span>: {ch.note}</li>)}
          </ul>
          <DemoGraph nodes={d.graph.nodes} edges={d.graph.edges} slots={d.slots} assignments={sim.injected.assignments} errorExams={errorExams(sim.injected)} overlapPairs={overlapPairs(sim.injected)}
            selected={graphSelected ?? sim.injection.changes[0]?.examId ?? null} onSelect={setGraphSelected} assignmentLabel="injected sandbox copy" />
        </div>
      ) : <ScenarioDetail meta={d.scenarios[c.params.scenario]} />;
      case 4: return sim ? (
        <div className="space-y-4">
          <RuleChecklist checks={sim.injected.validation.checks} />
          <ul className="space-y-2">
            {sim.injected.explained.map((v, i) => (
              <li key={i} className="rounded-xl border border-destructive/30 bg-card p-4">
                <p className="flex flex-wrap items-center gap-2"><CircleAlert className="size-4 text-destructive" /><span className="font-medium">Rule {v.rule}: {v.ruleLabel}</span><code className="font-mono text-[11px] text-muted-foreground">{v.code}</code></p>
                <p className="mt-1.5 text-sm">{v.message}</p>
                <p className="mt-1 text-sm text-muted-foreground">{v.explanation}</p>
                {v.facts.length > 0 && <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">{v.facts.map((f) => <div key={f.label}><dt className="text-muted-foreground">{f.label}</dt><dd className="font-mono font-medium">{f.value}</dd></div>)}</dl>}
                <p className="mt-2 text-sm"><span className="font-medium">How to fix it:</span> {v.remediation}</p>
                {v.alternatives.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Free options right now: <span className="font-mono text-foreground">{v.alternatives.join(" · ")}</span></p>}
              </li>
            ))}
          </ul>
          <ScheduleGrid slots={d.slots} rooms={d.rooms} assignments={sim.injected.assignments} examNames={examNames} caption="The broken copy: red marks exams in a violation" highlight={{ error: errorExams(sim.injected) }} />
        </div>
      ) : <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Inject a conflict in step 4 first.</p>;
      case 5: return res ? (
        <div className="space-y-3">
          {res.steps.length > 0 && <ul className="space-y-1 rounded-xl border bg-card p-3 text-sm">{res.steps.map((s) => <li key={s.examId}><code className="font-mono font-semibold">{s.examId}</code>: <span className={s.to ? "text-muted-foreground" : "text-destructive"}>{s.note}</span></li>)}</ul>}
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="px-3 py-2 font-medium">Exam</th><th className="px-3 py-2 font-medium">Broken copy</th><th className="px-3 py-2 font-medium">Corrected copy</th></tr></thead>
              <tbody>{res.changedFromInjected.map((x) => <tr key={x.examId} className="border-b last:border-0"><td className="px-3 py-2 font-mono font-semibold">{x.examId}</td><td className="px-3 py-2 font-mono text-destructive">{x.before.join(", ") || "none"}</td><td className="px-3 py-2 font-mono text-success">{x.after.join(", ") || "unscheduled"}</td></tr>)}</tbody></table>
          </div>
          <ScheduleGrid slots={d.slots} rooms={d.rooms} assignments={res.corrected.assignments} examNames={examNames} caption="Corrected copy: green marks changed exams" highlight={{ changed: new Set(res.changedFromInjected.map((x) => x.examId)), error: errorExams(res.corrected) }} />
        </div>
      ) : <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">{sim ? "Choose a strategy and apply it." : "Inject a conflict in step 4 first."}</p>;
      case 6: return res && c.resolved ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
            <OutcomeBadge outcome={res.corrected.outcome} size="lg" />
            <p className="text-lg tabular-nums">Violations <strong className="text-destructive">{c.resolved.injected.validation.violationCount}</strong> to <strong className={res.corrected.validation.violationCount ? "text-destructive" : "text-success"}>{res.corrected.validation.violationCount}</strong></p>
          </div>
          <RuleChecklist checks={res.corrected.validation.checks} />
          <div className="grid gap-4 2xl:grid-cols-2">
            <ScheduleGrid slots={d.slots} rooms={d.rooms} assignments={c.resolved.injected.assignments} examNames={examNames} caption={`Before: broken copy (${c.resolved.injected.validation.violationCount} violation${c.resolved.injected.validation.violationCount === 1 ? "" : "s"})`} highlight={{ error: errorExams(c.resolved.injected) }} />
            <ScheduleGrid slots={d.slots} rooms={d.rooms} assignments={res.corrected.assignments} examNames={examNames} caption={`After: corrected copy (${res.corrected.validation.violationCount} violation${res.corrected.validation.violationCount === 1 ? "" : "s"})`} highlight={{ error: errorExams(res.corrected), changed: new Set(res.changedFromInjected.map((x) => x.examId)) }} />
          </div>
        </div>
      ) : <p className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">Apply a correction in step 6 first.</p>;
      default: return (
        <div className="space-y-4">
          <ol className="grid gap-2 md:grid-cols-2">
            {[
              { label: "Source dataset", state: `${d.source === "live" ? "Live tables" : "Test Lab fixture"}, fingerprint ${d.fingerprint}`, tone: "neutral" },
              { label: "Original candidate", state: sim ? `${ALGORITHM_LABEL[sim.baseline.algorithm]} result, ${sim.baseline.outcome.toLowerCase()} (in memory)` : "Not created yet", tone: sim ? "success" : "neutral" },
              { label: "Injected (broken) candidate", state: sim ? `${sim.injected.validation.violationCount} violation(s), in memory only` : "Not created yet", tone: sim ? "error" : "neutral" },
              { label: "Corrected candidate", state: res ? `${res.corrected.validation.violationCount} violation(s), in memory only` : "Not created yet", tone: res ? (res.resolved ? "success" : "error") : "neutral" },
              { label: "Saved schedule", state: "None created by this demo. Saved runs come only from the Optimization Lab.", tone: "neutral" },
              { label: "Published schedule", state: c.publication?.version ? `Version ${c.publication.version} is active and unchanged (${c.publication.assignments} exams${c.publication.validAgainstToday === false ? "; it fails validation against today's data" : ""}).` : "No timetable is published.", tone: c.publication?.validAgainstToday === false ? "error" : "neutral" },
            ].map((x) => (
              <li key={x.label} className={cn("rounded-xl border bg-card p-3", x.tone === "success" && "border-success/40", x.tone === "error" && "border-destructive/30")}>
                <p className="text-xs font-semibold">{x.label}</p><p className="mt-0.5 text-sm text-muted-foreground">{x.state}</p>
              </li>
            ))}
          </ol>
          {res && <PublicationPanel publication={res.publication} />}
          {res && <ScheduleGrid slots={d.slots} rooms={d.rooms} assignments={res.corrected.assignments} examNames={examNames} caption="Corrected candidate (sandbox, not saved)" highlight={{ changed: new Set(res.changedFromInjected.map((x) => x.examId)) }} />}
        </div>
      );
    }
  })();

  return (
    <section aria-label="Guided demo" className="space-y-5">
      <nav aria-label="Demo steps" className="overflow-x-auto pb-1">
        <ol className="flex min-w-max gap-1.5">
          {STEP_TITLES.map((title, i) => (
            <li key={title}>
              <button type="button" onClick={() => onStep(i)} aria-current={i === step ? "step" : undefined}
                className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 motion-reduce:transition-none",
                  i === step ? "border-primary bg-primary text-primary-foreground" : done[i] && i < step ? "border-success/40 text-foreground" : "text-muted-foreground hover:border-primary/40")}>
                <span className={cn("grid size-5 place-items-center rounded-full text-[10px] font-semibold", i === step ? "bg-primary-foreground/20" : "bg-muted")}>{done[i] && i < step ? <Check className="size-3" /> : i + 1}</span>
                <span className="hidden sm:inline">{title}</span>
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid gap-5 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-18 lg:self-start">
          <div className="rounded-2xl border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
            <p className="text-xs font-medium text-muted-foreground">Step {step + 1} of {STEP_TITLES.length}</p>
            <h2 className="mt-1 font-heading text-2xl leading-tight font-semibold tracking-tight">{n.title}</h2>
            <dl className="mt-4 space-y-3">
              <Section label="What you are seeing">{n.seeing}</Section>
              <Section label="Why it matters">{n.why}</Section>
              <Section label="What the system did">{n.did}</Section>
              <Section label="What the result means">{n.means}</Section>
              <Section label="What happens next">{n.next}</Section>
            </dl>
            {action && <div className="mt-4 border-t pt-4">{action}</div>}
            {error && <p className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
          </div>
          <details className="group rounded-2xl border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">Terms used in this step</summary>
            <dl className="mt-3 space-y-2">{n.terms.map((t) => <div key={t}><dt className="font-medium">{t}</dt><dd className="text-muted-foreground">{TERMS[t]}</dd></div>)}</dl>
          </details>
          <details className="rounded-2xl border bg-card p-4 text-sm">
            <summary className="cursor-pointer font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/40">Technical details</summary>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              <li>Source: {d.label}; fingerprint <code className="font-mono text-foreground">{d.fingerprint}</code></li>
              <li>Every result on this page comes from the server's scheduling engine and validator; nothing is computed or invented in the browser.</li>
              <li>Mode: <span className="font-mono">SANDBOX SIMULATION — NOT SAVED TO LIVE DATA</span></li>
              <li>Detailed pages: <Link href="/admin/optimization" className="text-primary hover:underline">Optimization Lab</Link>, <Link href="/admin/conflicts" className="text-primary hover:underline">Conflict Analysis</Link>, <Link href="/admin/test-lab" className="text-primary hover:underline">Test Lab</Link></li>
            </ul>
          </details>
        </aside>

        <div className="min-w-0">{visual}</div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onStep(step - 1)} disabled={step === 0}><ArrowLeft />Back</Button>
          <Button onClick={() => onStep(step + 1)} disabled={step === STEP_TITLES.length - 1}>Next<ArrowRight /></Button>
        </div>
        <div className="flex gap-2">
          {step === STEP_TITLES.length - 1 && <Link href="/admin/schedules" className="inline-flex h-9 items-center gap-1 rounded-md px-3 text-sm text-primary hover:underline">Open Timetable<ArrowUpRight className="size-3.5" /></Link>}
          <Button variant="outline" onClick={() => { c.resetDemo(); setGraphSelected(null); onStep(0); }}><RotateCcw />Reset demo</Button>
          <Button variant="ghost" onClick={onExit}><X />Exit guided demo</Button>
        </div>
      </div>
    </section>
  );
}
