"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CircleAlert, Compass, Database, FlaskConical, Presentation, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ALGORITHM_LABEL } from "../format";
import { PageIntro } from "../page-intro";
import { Segmented } from "../segmented";
import { AlgorithmArena } from "./algorithm-arena";
import { ConflictSimulator, errorExams, overlapPairs, ResolutionPanel } from "./conflict-simulator";
import { DemoGraph } from "./demo-graph";
import { GUIDED_STEPS, GuidedDemo } from "./guided-demo";
import { ReadinessPanel } from "./readiness-panel";
import type { DemoSource, PlacedAssignment, StudioTab } from "./types";
import { useDemoController, type DemoStudioInitial } from "./use-demo-controller";

const TAB_LABEL: Record<StudioTab, string> = { readiness: "Readiness", graph: "Conflict graph", arena: "Algorithm arena", simulator: "Conflict simulator", resolution: "Resolution" };
type Overlay = "input" | "arena" | "candidate" | "corrected";

/** Keeps the address bar shareable without a navigation (no re-render, no refetch). */
function syncUrl(next: Record<string, string | null>) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(next)) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", url);
}

export function DemoStudio({ initial }: { initial: DemoStudioInitial }) {
  const c = useDemoController(initial);
  const [tab, setTab] = useState<StudioTab>(initial.tab);
  const [guidedStep, setGuidedStep] = useState<number | null>(initial.guided ? Math.min(Math.max(initial.step, 0), GUIDED_STEPS - 1) : null);
  const [graphSelected, setGraphSelected] = useState<string | null>(null);
  /** null = follow the most recent real result; otherwise the view the presenter pinned. */
  const [overlayChoice, setOverlayChoice] = useState<Overlay | null>(null);

  const changeTab = (next: StudioTab) => { setTab(next); syncUrl({ tab: next }); };
  const goStep = (n: number) => { const step = Math.min(Math.max(n, 0), GUIDED_STEPS - 1); setGuidedStep(step); syncUrl({ guided: "1", step: String(step) }); };
  const exitGuided = () => { setGuidedStep(null); syncUrl({ guided: null, step: null }); };
  const changeSource = (next: DemoSource) => { c.changeSource(next); setGraphSelected(null); setOverlayChoice(null); syncUrl({ source: next }); };

  const arenaEntry = c.arena?.entries.find((e) => e.result.algorithm === c.traceAlgorithm) ?? c.arena?.entries[0];
  const resolution = c.resolved?.resolution ?? null;
  const overlays = useMemo(() => {
    const list: { value: Overlay; label: string }[] = [{ value: "input", label: "Input only" }];
    if (arenaEntry) list.push({ value: "arena", label: ALGORITHM_LABEL[arenaEntry.result.algorithm] });
    if (c.simulation) list.push({ value: "candidate", label: "Injected" });
    if (resolution) list.push({ value: "corrected", label: "Corrected" });
    return list;
  }, [arenaEntry, c.simulation, resolution]);
  const latest: Overlay = resolution ? "corrected" : c.simulation ? "candidate" : arenaEntry ? "arena" : "input";
  const overlay = overlayChoice && overlays.some((o) => o.value === overlayChoice) ? overlayChoice : latest;
  const graphState = useMemo((): { assignments?: PlacedAssignment[]; errors?: Set<string>; pairs?: [string, string][]; label?: string } => {
    if (overlay === "arena" && arenaEntry) return { assignments: arenaEntry.result.assignments, label: `${ALGORITHM_LABEL[arenaEntry.result.algorithm]} result (${arenaEntry.result.outcome})` };
    if (overlay === "candidate" && c.simulation) return { assignments: c.simulation.injected.assignments, errors: errorExams(c.simulation.injected), pairs: overlapPairs(c.simulation.injected), label: "injected sandbox candidate" };
    if (overlay === "corrected" && resolution) return { assignments: resolution.corrected.assignments, errors: errorExams(resolution.corrected), pairs: overlapPairs(resolution.corrected), label: "corrected sandbox candidate" };
    return {};
  }, [overlay, arenaEntry, c.simulation, resolution]);

  const d = c.dataset;

  return (
    <div className="space-y-6 pb-10">
      <PageIntro
        eyebrow="Judge Demo Studio"
        title="Demo Studio"
        description={<>Follow a timetable from raw enrollments to a validated result: how conflicts arise, how each algorithm decides, and how the independent validator catches and confirms a correction. Everything here runs in memory; <strong className="font-medium text-foreground">nothing is saved to live data</strong>.</>}
        actions={
          <>
            <Segmented<DemoSource> label="Data source" value={c.source} onChange={changeSource} options={[{ value: "live", label: "Live data", icon: Database }, { value: "fixture", label: "Test Lab fixture", icon: FlaskConical }]} />
            <Button variant="outline" onClick={() => { c.reload(); setGraphSelected(null); }} aria-label="Reload dataset"><RefreshCw /></Button>
            <Segmented<"guided" | "explore"> label="Mode" value={guidedStep === null ? "explore" : "guided"} onChange={(m) => (m === "guided" ? goStep(guidedStep ?? 0) : exitGuided())}
              options={[{ value: "guided", label: "Guided demo", icon: Presentation }, { value: "explore", label: "Explore", icon: Compass }]} />
          </>
        }
      />

      {c.datasetError && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive">
          <CircleAlert className="size-4" />{c.datasetError}
          {c.source === "live" && <Button size="sm" variant="outline" onClick={() => changeSource("fixture")}>Use the Test Lab fixture instead</Button>}
        </div>
      )}
      {!d && !c.datasetError && <div className="space-y-3"><Skeleton className="h-10 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-96 rounded-xl" /></div>}

      {d && guidedStep !== null && <GuidedDemo c={c} step={guidedStep} onStep={goStep} onExit={exitGuided} />}

      {d && guidedStep === null && (
        <Tabs value={tab} onValueChange={(value) => changeTab(value as StudioTab)}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-0.5 sm:w-fit">
            {(Object.keys(TAB_LABEL) as StudioTab[]).map((t, i) => (
              <TabsTrigger key={t} value={t} className="h-8 flex-none px-3">
                <span className="font-mono text-[10px] text-muted-foreground">{i + 1}</span>{TAB_LABEL[t]}
                {t === "simulator" && c.simulation && <span className="size-1.5 rounded-full bg-destructive" aria-label="conflict injected" />}
                {t === "resolution" && resolution && <span className={cn("size-1.5 rounded-full", resolution.resolved ? "bg-success" : "bg-destructive")} aria-label={resolution.resolved ? "resolved" : "unresolved"} />}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="readiness" className="mt-4"><ReadinessPanel dataset={d} /></TabsContent>

          <TabsContent value="graph" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">{d.graph.stats.examCount} exams · {d.graph.stats.edgeCount} shared-student relationships, built from {d.counts.enrollments.toLocaleString("en-US")} enrollments by the engine&apos;s own graph builder.</p>
              <Segmented label="Colour the graph by" value={overlay} onChange={setOverlayChoice} options={overlays} />
            </div>
            <DemoGraph nodes={d.graph.nodes} edges={d.graph.edges} slots={d.slots}
              assignments={graphState.assignments} errorExams={graphState.errors} overlapPairs={graphState.pairs} assignmentLabel={graphState.label}
              warningExams={overlay === "arena" && c.traceEvent?.relatedExamIds ? new Set(c.traceEvent.relatedExamIds) : undefined}
              focusExamId={overlay === "arena" ? c.traceEvent?.examId ?? null : null}
              selected={graphSelected} onSelect={setGraphSelected} />
            <p className="text-[11px] text-muted-foreground">Want the full analysis? <Link href="/admin/conflicts" className="text-primary hover:underline">Conflict Analysis</Link> shows the same graph with cohort filters.</p>
          </TabsContent>

          <TabsContent value="arena" className="mt-4">
            {c.arenaError && <p className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><CircleAlert className="size-4" />{c.arenaError}</p>}
            <AlgorithmArena dataset={d} arena={c.arena} running={c.arenaRunning} onRun={(config) => void c.runArena(config)} selected={c.traceAlgorithm} onSelect={c.setTraceAlgorithm} onEvent={c.setTraceEvent} />
          </TabsContent>

          <TabsContent value="simulator" className="mt-4">
            <ConflictSimulator dataset={d} params={c.params} onParams={c.setParams} simulation={c.simulation} busy={c.simBusy} error={c.simError}
              onInject={() => void c.inject()} onReset={c.resetScenario}
              onShowInGraph={() => { setOverlayChoice("candidate"); setGraphSelected(c.simulation?.injection.changes[0]?.examId ?? null); changeTab("graph"); }}
              onContinue={() => changeTab("resolution")}
              bottleneck={{ data: c.bottleneck, busy: c.bottleneckBusy, error: c.bottleneckError, onRun: () => void c.runBottleneck() }} />
          </TabsContent>

          <TabsContent value="resolution" className="mt-4">
            <ResolutionPanel dataset={d} simulation={c.simulation} resolved={c.resolved} strategy={c.strategy} algorithm={c.regenAlgorithm}
              onStrategy={c.setStrategy} onAlgorithm={c.setRegenAlgorithm} onApply={() => void c.apply()} busy={c.resBusy} error={c.resError} candidateMatches={c.candidateMatches} />
          </TabsContent>
        </Tabs>
      )}

      <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-4 text-xs text-muted-foreground">
        <span>Detailed pages:</span>
        {[["/admin/optimization", "Optimization Lab"], ["/admin/conflicts", "Conflict Analysis"], ["/admin/schedules", "Timetable"], ["/admin/test-lab", "Test Lab"], ["/admin/import", "Import & Export"]].map(([href, label]) => (
          <Link key={href} href={href} className="inline-flex items-center gap-1 text-primary hover:underline">{label}<ArrowUpRight className="size-3" /></Link>
        ))}
      </footer>
    </div>
  );
}
