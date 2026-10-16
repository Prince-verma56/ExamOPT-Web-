"use client";

import { useEffect, useState } from "react";
import type { TraceEvent } from "@/server/scheduling/trace";
import { api, errorMessage } from "../api";
import type { SimulatorParams } from "./conflict-simulator";
import type { AlgorithmId, DemoArena, DemoBottleneck, DemoDataset, DemoPublished, DemoSimulation, DemoSource, ResolutionId, ScenarioId, StudioTab } from "./types";

export interface DemoStudioInitial {
  tab: StudioTab;
  source: DemoSource;
  algorithm: AlgorithmId;
  scenario: ScenarioId;
  guided: boolean;
  step: number;
}

export interface PublicationSummary {
  version: number | null;
  runId: string | null;
  publishedAt: string | null;
  assignments: number;
  validAgainstToday: boolean | null;
}

/**
 * All Demo Studio state and the actions that call the real demo APIs. The
 * guided presentation and the explore tabs both read from it, so they always
 * show the same runs. Every action is an event handler; effects only fetch.
 */
export function useDemoController(initial: DemoStudioInitial) {
  const [source, setSource] = useState<DemoSource>(initial.source);
  const [reloadKey, setReloadKey] = useState(0);
  const [dataset, setDataset] = useState<DemoDataset | null>(null);
  const [datasetError, setDatasetError] = useState<string | null>(null);
  const [publication, setPublication] = useState<PublicationSummary | null>(null);

  const [arena, setArena] = useState<DemoArena | null>(null);
  const [arenaRunning, setArenaRunning] = useState(false);
  const [arenaError, setArenaError] = useState<string | null>(null);
  const [traceAlgorithm, setTraceAlgorithm] = useState<AlgorithmId>(initial.algorithm);
  const [traceEvent, setTraceEvent] = useState<TraceEvent | null>(null);

  const [params, setParams] = useState<SimulatorParams>({ scenario: initial.scenario, baselineAlgorithm: "BACKTRACKING", examId: "", otherExamId: "" });
  const [simRequest, setSimRequest] = useState<SimulatorParams | null>(null);
  const [simulation, setSimulation] = useState<DemoSimulation | null>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<ResolutionId>("repair");
  const [regenAlgorithm, setRegenAlgorithm] = useState<AlgorithmId>("WELSH_POWELL");
  const [resolved, setResolved] = useState<DemoSimulation | null>(null);
  const [resBusy, setResBusy] = useState(false);
  const [resError, setResError] = useState<string | null>(null);

  const [bottleneck, setBottleneck] = useState<DemoBottleneck | null>(null);
  const [bottleneckBusy, setBottleneckBusy] = useState(false);
  const [bottleneckError, setBottleneckError] = useState<string | null>(null);

  // Fetch the sandbox dataset and the live publication summary. State is set only when responses arrive.
  useEffect(() => {
    let active = true;
    api<DemoDataset>(`/scheduling/demo/dataset?source=${source}`)
      .then((data) => { if (active) { setDataset(data); setDatasetError(null); } })
      .catch((error) => { if (active) setDatasetError(errorMessage(error)); });
    return () => { active = false; };
  }, [source, reloadKey]);

  useEffect(() => {
    let active = true;
    api<DemoPublished>("/scheduling/published")
      .then((data) => { if (active) setPublication({ version: data.publication?.version ?? null, runId: data.publication?.runId ?? null, publishedAt: data.publication?.publishedAt ?? null, assignments: data.assignments.length, validAgainstToday: data.valid }); })
      .catch(() => { if (active) setPublication(null); });
    return () => { active = false; };
  }, [reloadKey]);

  const clearRuns = () => {
    setArena(null); setArenaError(null); setTraceEvent(null);
    setSimulation(null); setSimRequest(null); setSimError(null);
    setResolved(null); setResError(null);
    setBottleneck(null); setBottleneckError(null);
  };

  const changeSource = (next: DemoSource) => {
    if (next === source) return;
    setSource(next); setDataset(null); setDatasetError(null); clearRuns();
  };
  const reload = () => { setDataset(null); setDatasetError(null); clearRuns(); setReloadKey((k) => k + 1); };

  const runArena = async (config?: { maxNodes: number; timeLimitMs: number }) => {
    setArenaRunning(true); setArenaError(null);
    try {
      const result = await api<DemoArena>("/scheduling/demo/arena", { json: { source, algorithms: ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"], benchmark: true, ...(config ? { config } : {}) } });
      setArena(result); setTraceEvent(null);
    } catch (error) { setArenaError(errorMessage(error)); }
    finally { setArenaRunning(false); }
  };

  const requestBody = (p: SimulatorParams) => ({
    source, scenario: p.scenario, baselineAlgorithm: p.baselineAlgorithm,
    ...(p.examId ? { targets: { examId: p.examId, ...(p.otherExamId ? { otherExamId: p.otherExamId } : {}) } } : {}),
  });

  const inject = async (p: SimulatorParams = params) => {
    setSimBusy(true); setSimError(null); setResolved(null); setResError(null);
    try {
      const result = await api<DemoSimulation>("/scheduling/demo/simulate", { json: requestBody(p) });
      setSimulation(result); setSimRequest(p);
    } catch (error) { setSimulation(null); setSimRequest(null); setSimError(errorMessage(error)); }
    finally { setSimBusy(false); }
  };

  /** Nothing was saved, so resetting only discards the browser's copy of the candidate. */
  const resetScenario = () => { setSimulation(null); setSimRequest(null); setSimError(null); setResolved(null); setResError(null); };

  const apply = async (s: ResolutionId = strategy) => {
    if (!simRequest) return;
    setResBusy(true); setResError(null);
    try {
      const result = await api<DemoSimulation>("/scheduling/demo/simulate", { json: { ...requestBody(simRequest), resolution: { strategy: s, ...(s === "regenerate" ? { algorithm: regenAlgorithm } : {}) } } });
      setResolved(result);
    } catch (error) { setResError(errorMessage(error)); }
    finally { setResBusy(false); }
  };

  const runBottleneck = async () => {
    setBottleneckBusy(true); setBottleneckError(null);
    try { setBottleneck(await api<DemoBottleneck>("/scheduling/demo/bottleneck", { json: { source } })); }
    catch (error) { setBottleneckError(errorMessage(error)); }
    finally { setBottleneckBusy(false); }
  };

  const candidateMatches = resolved && simulation ? JSON.stringify(resolved.injected.assignments) === JSON.stringify(simulation.injected.assignments) : null;

  return {
    source, changeSource, reload, dataset, datasetError, publication,
    arena, arenaRunning, arenaError, runArena, traceAlgorithm, setTraceAlgorithm, traceEvent, setTraceEvent,
    params, setParams, simulation, simBusy, simError, inject, resetScenario,
    strategy, setStrategy, regenAlgorithm, setRegenAlgorithm, resolved, resBusy, resError, apply, candidateMatches,
    bottleneck, bottleneckBusy, bottleneckError, runBottleneck,
    resetDemo: clearRuns,
  };
}

export type DemoController = ReturnType<typeof useDemoController>;
