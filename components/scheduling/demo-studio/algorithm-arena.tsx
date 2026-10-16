"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Loader2, Play, X } from "lucide-react";
import type { TraceEvent } from "@/server/scheduling/trace";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ALGORITHM_LABEL, ms, num } from "../format";
import { OutcomeBadge } from "../outcome-badge";
import { Segmented } from "../segmented";
import { TracePlayer } from "./trace-player";
import type { AlgorithmId, ArenaEntry, DemoArena, DemoDataset } from "./types";

export function AlgorithmArena({ dataset, arena, running, onRun, selected, onSelect, onEvent }: {
  dataset: DemoDataset;
  arena: DemoArena | null;
  running: boolean;
  onRun: (config: { maxNodes: number; timeLimitMs: number }) => void;
  selected: AlgorithmId;
  onSelect: (id: AlgorithmId) => void;
  onEvent: (event: TraceEvent | null) => void;
}) {
  const [maxNodes, setMaxNodes] = useState(Math.min(dataset.defaults.maxNodes, 500_000));
  const [timeLimitMs, setTimeLimitMs] = useState(Math.min(dataset.defaults.timeLimitMs, 5_000));
  const entries = arena?.entries ?? [];
  const byId = new Map(entries.map((e) => [e.result.algorithm, e]));
  const rank = new Map((arena?.ranking ?? []).map((id, i) => [id, i + 1]));
  const entry = byId.get(selected) ?? entries[0];
  const rules = entries[0]?.result.validation?.checks ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
        <div>
          <p className="text-sm font-semibold">Run all strategies on the same snapshot</p>
          <p className="text-xs text-muted-foreground">Each algorithm gets its own copy of the same normalised input and constraints. Results are validated independently and never saved.</p>
        </div>
        <label className="ml-auto text-[11px] text-muted-foreground">Backtracking node limit
          <Input type="number" min={1} max={500000} value={maxNodes} onChange={(e) => setMaxNodes(Math.max(1, Math.min(500_000, Number(e.target.value) || 1)))} className="mt-0.5 h-8 w-28 tabular-nums" />
        </label>
        <label className="text-[11px] text-muted-foreground">Time limit (ms)
          <Input type="number" min={50} max={5000} value={timeLimitMs} onChange={(e) => setTimeLimitMs(Math.max(50, Math.min(5_000, Number(e.target.value) || 50)))} className="mt-0.5 h-8 w-24 tabular-nums" />
        </label>
        <Button onClick={() => onRun({ maxNodes, timeLimitMs })} disabled={running}>{running ? <Loader2 className="animate-spin" /> : <Play />}{running ? "Running…" : "Run all strategies"}</Button>
      </div>
      <p className="-mt-2 px-1 text-[11px] text-muted-foreground">Tip: set the node limit to 5 to watch backtracking stop at its budget and report SEARCH_LIMIT rather than claim infeasibility.</p>

      {!arena && !running && <p className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">No strategies have run yet. Nothing is shown until a real run returns.</p>}

      {arena && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-3">#</TableHead><TableHead>Strategy</TableHead><TableHead>Outcome</TableHead>
                  <TableHead className="text-right" title="Wall time of the measured run, which recorded the trace">Time (traced)</TableHead><TableHead className="text-right" title="A separate run with tracing off, for a fair speed comparison">Trace off</TableHead><TableHead className="text-right">Placed</TableHead><TableHead className="text-right">Slots used</TableHead>
                  <TableHead className="text-right">Rooms · seat fill</TableHead><TableHead>Validator</TableHead><TableHead className="text-right">Soft penalty</TableHead>
                  <TableHead className="pr-3 text-right">Telemetry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...entries].sort((a, b) => (rank.get(a.result.algorithm) ?? 9) - (rank.get(b.result.algorithm) ?? 9)).map(({ result: r, trace }) => {
                  const v = r.validation;
                  const passed = v?.checks.filter((c) => c.passed).length ?? 0;
                  return (
                    <TableRow key={r.algorithm} className={cn("cursor-pointer", r.algorithm === entry?.result.algorithm && "bg-primary/5")} onClick={() => onSelect(r.algorithm)}>
                      <TableCell className="pl-3 tabular-nums text-muted-foreground">{rank.get(r.algorithm)}</TableCell>
                      <TableCell><span className="font-medium">{ALGORITHM_LABEL[r.algorithm]}</span><span className="block text-[11px] text-muted-foreground">{dataset.algorithms.find((a) => a.id === r.algorithm)?.family}</span></TableCell>
                      <TableCell><OutcomeBadge outcome={r.outcome} evidence={r.infeasibilityEvidence} /></TableCell>
                      <TableCell className="text-right tabular-nums">{ms(r.durationMs)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{arena.entries.find((x) => x.result.algorithm === r.algorithm)?.benchmark ? ms(arena.entries.find((x) => x.result.algorithm === r.algorithm)!.benchmark!.durationMs) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.assignments.length}/{r.totalExams}{r.unscheduledExamIds.length > 0 && <span className="block text-[11px] text-destructive">{r.unscheduledExamIds.length} unscheduled</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.metrics ? `${r.metrics.slotsUsed}/${r.metrics.totalSlots}` : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.assignments.length ? `${new Set(r.assignments.map((a) => a.roomId)).size} · ${r.metrics ? `${num(r.metrics.seatFillPct, 1)}%` : "—"}` : "—"}</TableCell>
                      <TableCell>{v ? <span className={cn("text-xs font-medium", v.valid ? "text-success" : "text-destructive")}>{passed}/{v.checks.length} rules · {v.violationCount} violation{v.violationCount === 1 ? "" : "s"}</span> : <span className="text-xs text-muted-foreground">not run</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.metrics ? num(r.metrics.softPenalty.total, 1) : "—"}</TableCell>
                      <TableCell className="pr-3 text-right text-xs tabular-nums text-muted-foreground">
                        {r.searchNodes !== null ? `${num(r.searchNodes)} nodes` : r.colorsUsed !== null ? `${r.colorsUsed} colours` : "single pass"}
                        <span className="block">{num(trace.emitted)} trace events</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">Ranking: {arena.rankingRule} Hard-constraint feasibility is never traded for a better soft score. "Time (traced)" is the run whose decisions you replay below. "Trace off" is a separate run of the same solver with recording disabled, reported only for a fair speed comparison; its assignments are checked against the traced run.</p>
          </div>

          <section className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <h3 className="text-sm font-semibold">Independent validator, rule by rule</h3>
              <Link href="/admin/test-lab" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Validator cases in the Test Lab<ArrowUpRight className="size-3" /></Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b text-left text-muted-foreground"><th className="py-1.5 pl-3 font-medium">Rule</th>{entries.map((e) => <th key={e.result.algorithm} className="px-2 py-1.5 text-center font-medium">{ALGORITHM_LABEL[e.result.algorithm]}</th>)}</tr></thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.rule} className="border-b last:border-0">
                      <td className="py-1.5 pl-3">{rule.rule}. {rule.label}</td>
                      {entries.map((e) => {
                        const c = e.result.validation?.checks.find((x) => x.rule === rule.rule);
                        return <td key={e.result.algorithm} className="px-2 py-1.5 text-center">{!c ? "—" : c.passed ? <Check className="mx-auto size-3.5 text-success" aria-label="passed" /> : <span className="inline-flex items-center gap-0.5 text-destructive"><X className="size-3.5" aria-label="failed" />{c.violations}</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {entry && <TraceSection entry={entry} dataset={dataset} onSelect={onSelect} onEvent={onEvent} />}
        </>
      )}
    </div>
  );
}

function TraceSection({ entry, dataset, onSelect, onEvent }: { entry: ArenaEntry; dataset: DemoDataset; onSelect: (id: AlgorithmId) => void; onEvent: (event: TraceEvent | null) => void }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Execution trace <span className="font-normal text-muted-foreground">· recorded during the real run, replayed step by step</span></h3>
        <Segmented<AlgorithmId> label="Trace algorithm" value={entry.result.algorithm} onChange={onSelect} options={(["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"] as const).map((id) => ({ value: id, label: ALGORITHM_LABEL[id] }))} />
      </div>
      {/* Keyed so the replay restarts at event 1 whenever a different run or algorithm is shown. */}
      <TracePlayer key={`${entry.result.algorithm}-${entry.result.startedAt}`} entry={entry} slots={dataset.slots} rooms={dataset.rooms} nodes={dataset.graph.nodes} edges={dataset.graph.edges} onEvent={onEvent} />
    </section>
  );
}
