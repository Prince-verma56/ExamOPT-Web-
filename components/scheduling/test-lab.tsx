"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleAlert, Circle, Loader2, Play, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "./api";
import { DiagnosticList } from "./diagnostic-list";
import { ALGORITHM_LABEL, dateTime, ms } from "./format";
import { OutcomeBadge } from "./outcome-badge";
import { PageIntro, StatStrip } from "./page-intro";
import { Segmented } from "./segmented";
import type { TestCaseResult } from "@/server/scheduling/test-lab";

type CaseMeta = { id: string; name: string; category: string; expected: string };
type LabRun = { results: TestCaseResult[]; passed: number; total: number; durationMs: number };

export function TestLab() {
  const [cases, setCases] = useState<CaseMeta[] | null>(null);
  const [results, setResults] = useState<Map<string, TestCaseResult>>(new Map());
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [lastRun, setLastRun] = useState<{ at: string; durationMs: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    api<{ cases: CaseMeta[] }>("/scheduling/test-lab").then((d) => setCases(d.cases)).catch((e) => setError(errorMessage(e)));
  }, []);

  const run = useCallback(async (caseIds?: string[]) => {
    const ids = caseIds ?? (cases ?? []).map((c) => c.id);
    setError(null);
    setRunning(new Set(ids));
    try {
      const data = await api<LabRun>("/scheduling/test-lab", { json: caseIds ? { caseIds } : {} });
      setResults((current) => { const next = new Map(current); for (const r of data.results) next.set(r.id, r); return next; });
      setLastRun({ at: new Date().toISOString(), durationMs: data.durationMs });
      const failed = data.results.find((r) => !r.passed);
      if (failed) setExpanded(failed.id);
    } catch (e) { setError(errorMessage(e)); }
    finally { setRunning(new Set()); }
  }, [cases]);

  const categories = useMemo(() => [...new Set((cases ?? []).map((c) => c.category))], [cases]);
  const shown = (cases ?? []).filter((c) => category === "all" || c.category === category);
  const done = [...results.values()];
  const passed = done.filter((r) => r.passed).length;

  return (
    <div className="space-y-8 pb-8">
      <PageIntro
        eyebrow="Edge-case verification"
        title="Test Lab"
        description="Deterministic synthetic datasets, kept separate from the working data, run through the real engine. Each case asserts the behaviour expected of the solvers and the independent validator; nothing here is simulated."
        actions={<Button size="lg" className="h-9" disabled={!cases || running.size > 0} onClick={() => void run()}>{running.size > 1 ? <Loader2 className="animate-spin" /> : <Play />}Run all {cases ? cases.length : ""} tests</Button>}
      />

      {error && <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p>}

      <StatStrip items={[
        { label: "Passed", value: done.length ? `${passed}/${done.length}` : "—", hint: done.length ? (passed === done.length ? "all assertions hold" : "see failures below") : "not run yet", tone: done.length && passed < done.length ? "error" : "default" },
        { label: "Failed", value: done.length ? done.length - passed : "—", tone: done.length - passed ? "error" : "default" },
        { label: "Assertions", value: done.length ? done.reduce((sum, r) => sum + r.checks.length, 0) : "—", hint: "individual checks" },
        { label: "Engine time", value: lastRun ? ms(lastRun.durationMs) : "—", hint: lastRun ? `run ${dateTime(lastRun.at)}` : undefined },
      ]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Category" value={category} onChange={setCategory} options={[{ value: "all", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]} />
        {done.length > 0 && <Button variant="ghost" size="sm" onClick={() => { setResults(new Map()); setLastRun(null); }}><RotateCw />Reset</Button>}
      </div>

      {!cases && !error && <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>}

      {cases && (
        <ol className="divide-y overflow-hidden rounded-xl border bg-card">
          {shown.map((c) => {
            const result = results.get(c.id);
            const isRunning = running.has(c.id);
            const isOpen = expanded === c.id;
            return (
              <li key={c.id}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-6 shrink-0 items-center justify-center" aria-label={isRunning ? "Running" : result ? (result.passed ? "Passed" : "Failed") : "Not run"}>
                    {isRunning ? <Loader2 className="size-4 animate-spin text-primary" />
                      : result ? (result.passed ? <span className="flex size-5 items-center justify-center rounded-full bg-success text-white"><Check className="size-3" /></span> : <span className="flex size-5 items-center justify-center rounded-full bg-destructive text-white"><X className="size-3" /></span>)
                      : <Circle className="size-4 text-muted-foreground/50" />}
                  </span>
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : c.id)}>
                    <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{c.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{result ? result.actual : c.expected}</span>
                    </span>
                    <span className="hidden rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground sm:inline">{c.category}</span>
                    {result && <span className="w-16 text-right font-mono text-[11px] text-muted-foreground tabular-nums">{ms(result.durationMs)}</span>}
                  </button>
                  <Button variant="ghost" size="sm" disabled={running.size > 0} onClick={() => void run([c.id])} aria-label={`Run ${c.name}`}><Play />Run</Button>
                </div>
                {isOpen && (
                  <div className="grid gap-6 border-t bg-muted/20 px-4 py-5 sm:px-14 lg:grid-cols-2">
                    <div className="space-y-4">
                      <div><h4 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Expected</h4><p className="mt-1 text-sm leading-6">{c.expected}</p></div>
                      <div><h4 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Actual</h4><p className="mt-1 text-sm leading-6">{result ? result.actual : <span className="text-muted-foreground">Run this case to see the actual behaviour.</span>}</p></div>
                      {result && (
                        <ul className="space-y-1.5" aria-label="Assertions">
                          {result.checks.map((check) => (
                            <li key={check.label} className="flex items-start gap-2 text-sm">
                              {check.passed ? <Check className="mt-0.5 size-4 shrink-0 text-success" aria-label="Pass" /> : <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Fail" />}
                              <span className={cn(!check.passed && "font-medium text-destructive")}>{check.label}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {result && result.runs.length > 0 && (
                        <table className="w-full text-xs">
                          <thead><tr className="text-left text-muted-foreground"><th className="py-1 font-medium">Algorithm</th><th className="font-medium">Outcome</th><th className="text-right font-medium">Placed</th><th className="text-right font-medium">Nodes</th><th className="text-right font-medium">Time</th></tr></thead>
                          <tbody>{result.runs.map((r, i) => (
                            <tr key={`${r.algorithm}-${i}`} className="border-t">
                              <td className="py-1.5">{ALGORITHM_LABEL[r.algorithm]}</td><td><OutcomeBadge outcome={r.outcome} /></td>
                              <td className="text-right tabular-nums">{r.scheduled}/{r.total}</td><td className="text-right tabular-nums">{r.searchNodes ?? "—"}</td><td className="text-right font-mono">{ms(r.durationMs)}</td>
                            </tr>
                          ))}</tbody>
                        </table>
                      )}
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Diagnostics</h4>
                      {result ? <DiagnosticList diagnostics={result.diagnostics} empty="No diagnostics: every exam was placed and validated." /> : <p className="text-sm text-muted-foreground">—</p>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
