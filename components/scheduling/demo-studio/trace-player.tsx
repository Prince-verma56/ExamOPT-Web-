"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, ChevronFirst, ChevronLeft, ChevronRight, FastForward, Network, Pause, Play, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TraceEvent, TraceEventType } from "@/server/scheduling/trace";
import { ALGORITHM_LABEL } from "../format";
import { Segmented } from "../segmented";
import { DemoGraph } from "./demo-graph";
import { ScheduleGrid } from "./schedule-grid";
import type { ArenaEntry, DemoRoom, DemoSlot, GraphEdge, GraphNode, Highlight, PlacedAssignment } from "./types";

const EVENT_META: Record<TraceEventType, { label: string; tone: "neutral" | "primary" | "success" | "warning" | "error" }> = {
  run_started: { label: "Run started", tone: "neutral" },
  exam_ordered: { label: "Exam order", tone: "neutral" },
  exam_selected: { label: "Exam selected", tone: "primary" },
  slot_opened: { label: "Slot opened", tone: "neutral" },
  candidate_considered: { label: "Candidate", tone: "primary" },
  candidate_rejected: { label: "Rejected", tone: "warning" },
  room_selected: { label: "Room chosen", tone: "success" },
  slot_assigned: { label: "Assigned", tone: "success" },
  forward_check_failed: { label: "Forward check failed", tone: "warning" },
  backtrack: { label: "Backtrack", tone: "error" },
  exam_unscheduled: { label: "Unscheduled", tone: "error" },
  search_limit_reached: { label: "Search limit", tone: "error" },
  run_completed: { label: "Run completed", tone: "neutral" },
};

const TONE: Record<string, string> = {
  neutral: "border-border bg-muted/60 text-muted-foreground",
  primary: "border-primary/30 bg-primary/8 text-primary",
  success: "border-success/30 bg-[color-mix(in_oklch,var(--examopt-success),transparent_90%)] text-success",
  warning: "border-[color-mix(in_oklch,var(--examopt-warning),transparent_55%)] bg-[color-mix(in_oklch,var(--examopt-warning),transparent_90%)] text-[color-mix(in_oklch,var(--examopt-warning),black_25%)]",
  error: "border-destructive/30 bg-destructive/7 text-destructive",
};

const KEY_EVENTS = new Set<TraceEventType>(["candidate_rejected", "forward_check_failed", "backtrack", "exam_unscheduled", "search_limit_reached"]);
const SPEEDS = [{ label: "0.5×", ms: 1200 }, { label: "1×", ms: 600 }, { label: "2×", ms: 300 }, { label: "4×", ms: 150 }, { label: "10×", ms: 60 }];

export const ALGORITHM_EXPLAINER: Record<string, { order: string; slot: string; room: string; failure: string }> = {
  FIRST_FIT: {
    order: "Exams in identifier order; conflicts do not influence the order.",
    slot: "The earliest permitted slot in which no already-placed exam shares a student.",
    room: "First fit: the free room of the right type, with enough seats, that comes first by room id.",
    failure: "Never revisits a decision. An exam with no workable slot is left unscheduled (PARTIAL), which proves nothing about feasibility.",
  },
  WELSH_POWELL: {
    order: "Conflict degree descending, then students, then id. Fixed-slot exams are placed first.",
    slot: "One slot (colour) at a time, in time order: every unplaced exam with no clash joins it.",
    room: "Best fit: the smallest free room of the right type that seats everyone.",
    failure: "No undo. Exams left after the last slot are unscheduled (PARTIAL), not proven impossible.",
  },
  BACKTRACKING: {
    order: "MRV: the unplaced exam with the fewest remaining (slot, room) values; ties by degree, then students.",
    slot: "Values tried best-first: fewer shared students on the same or adjacent slot, then fewer empty seats.",
    room: "Chosen jointly with the slot as one (slot, room) value. Forward checking removes clashing values from unplaced exams; an emptied domain discards the value.",
    failure: "Complete search. Exhausting it proves INFEASIBLE; hitting the node or time budget reports SEARCH_LIMIT, feasibility unknown.",
  },
};

/** Schedule and emphasis after events 0..index, rebuilt from the stored trace. */
function replay(events: TraceEvent[], index: number): { assignments: PlacedAssignment[]; highlight: Highlight } {
  const state = new Map<string, PlacedAssignment>();
  for (let i = 0; i <= index && i < events.length; i++) {
    const e = events[i];
    if (e.type === "slot_assigned" && e.examId && e.slotId && e.roomId) state.set(e.examId, { examId: e.examId, slotId: e.slotId, roomId: e.roomId });
    if (e.type === "backtrack" && e.examId) state.delete(e.examId);
  }
  const current = events[index];
  const highlight: Highlight = {};
  if (current) {
    if (current.examId) highlight.focus = new Set([current.examId]);
    if (current.relatedExamIds?.length) highlight.warning = new Set(current.relatedExamIds);
    if (current.slotId) highlight.slotId = current.slotId;
    if (current.examId && current.slotId && ["candidate_considered", "candidate_rejected", "forward_check_failed"].includes(current.type)) {
      highlight.ghost = { examId: current.examId, slotId: current.slotId, roomId: current.roomId ?? "" };
    }
    if (current.type === "exam_unscheduled" && current.examId) highlight.error = new Set([current.examId]);
  }
  return { assignments: [...state.values()], highlight };
}

export function TracePlayer({ entry, slots, rooms, nodes, edges, onEvent }: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  entry: ArenaEntry;
  slots: DemoSlot[];
  rooms: DemoRoom[];
  /** Called when the presenter moves to an event, so other views can highlight its exam. */
  onEvent?: (event: TraceEvent | null) => void;
}) {
  const { events } = entry.trace;
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [view, setView] = useState<"timetable" | "graph">("timetable");
  const [graphSelected, setGraphSelected] = useState<string | null>(null);
  const examNames = useMemo(() => new Map(nodes.map((n) => [n.id, n.name])), [nodes]);
  const listRef = useRef<HTMLOListElement>(null);
  const last = events.length - 1;

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(last, next));
    setStep(clamped);
    onEvent?.(events[clamped] ?? null);
  };

  // Advance one recorded event per tick while playing; stop at the end. State changes happen in the timer callback.
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step >= last) { setPlaying(false); return; }
      setStep(step + 1);
      onEvent?.(events[step + 1] ?? null);
    }, SPEEDS[speed].ms);
    return () => window.clearTimeout(timer);
  }, [playing, step, speed, last, events, onEvent]);

  // Keep the current event visible in the log (DOM only, no state).
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-step="${step}"]`)?.scrollIntoView({ block: "nearest" });
  }, [step]);

  const { assignments, highlight } = useMemo(() => replay(events, step), [events, step]);
  const current = events[step];
  const nextKey = () => {
    const i = events.findIndex((e, idx) => idx > step && KEY_EVENTS.has(e.type));
    if (i !== -1) go(i);
  };
  const explainer = ALGORITHM_EXPLAINER[entry.result.algorithm];

  if (!events.length) {
    return <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">The solver did not run ({entry.result.outcome}): preflight stopped it before any decision was made, so there is no trace. See the readiness diagnostics.</p>;
  }

  return (
    <div className="@container"><div className="grid gap-4 @5xl:grid-cols-[minmax(0,1fr)_340px]"
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest("input,select,textarea")) return;
        if (e.key === "ArrowRight") { e.preventDefault(); go(step + 1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); go(step - 1); }
      }}>
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2">
          <Button size="sm" onClick={() => setPlaying((p) => !p)} disabled={step >= last && !playing} aria-label={playing ? "Pause trace" : "Play trace"}>
            {playing ? <Pause /> : <Play />}{playing ? "Pause" : "Play trace"}
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Step backward"><ChevronLeft /></Button>
          <Button size="icon-sm" variant="outline" onClick={() => go(step + 1)} disabled={step >= last} aria-label="Step forward"><ChevronRight /></Button>
          <Button size="sm" variant="outline" onClick={nextKey} disabled={!events.some((e, i) => i > step && KEY_EVENTS.has(e.type))}><FastForward />Next rejection</Button>
          <Button size="sm" variant="ghost" onClick={() => { setPlaying(false); go(0); }}><ChevronFirst />Reset</Button>
          <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            Speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="h-7 rounded-md border bg-background px-1.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              {SPEEDS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
            </select>
          </label>
          <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">Event <span className="font-semibold text-foreground">{step + 1}</span> / {events.length}</span>
        </div>
        <input type="range" min={0} max={last} value={step} onChange={(e) => { setPlaying(false); go(Number(e.target.value)); }} aria-label="Trace position" className="w-full accent-(--primary)" />

        {current && (
          <div className="rounded-xl border bg-card p-3" aria-live="polite">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", TONE[EVENT_META[current.type].tone])}>{EVENT_META[current.type].label}</span>
              <code className="font-mono text-[11px] text-muted-foreground">{current.type}</code>
              {current.reason && <code className="rounded border px-1.5 font-mono text-[10.5px]">{current.reason}</code>}
              {current.depth !== undefined && <span className="text-[11px] text-muted-foreground">depth {current.depth}</span>}
              {current.node !== undefined && <span className="text-[11px] text-muted-foreground">node {current.node.toLocaleString("en-US")}</span>}
            </div>
            <p className="mt-2 text-sm leading-relaxed">{current.message}</p>
            {(current.examId || current.slotId || current.roomId) && (
              <p className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px] text-muted-foreground">
                {current.examId && <span className="rounded border px-1.5">exam {current.examId}</span>}
                {current.slotId && <span className="rounded border px-1.5">slot {current.slotId}</span>}
                {current.roomId && <span className="rounded border px-1.5">room {current.roomId}</span>}
                {current.relatedExamIds?.map((id) => <span key={id} className="rounded border border-[color-mix(in_oklch,var(--examopt-warning),transparent_50%)] px-1.5">blocked by {id}</span>)}
              </p>
            )}
            {current.type === "exam_ordered" && Array.isArray(current.data?.order) && (
              <ol className="mt-2 flex flex-wrap gap-1 font-mono text-[10.5px]">
                {(current.data.order as string[]).map((id, i) => <li key={id} className="rounded border px-1.5">{i + 1}. {id}{Array.isArray(current.data?.degrees) ? <span className="text-muted-foreground"> d{(current.data.degrees as number[])[i]}</span> : null}</li>)}
              </ol>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">State after event {step + 1}: <strong className="text-foreground">{assignments.length}</strong> of {entry.result.totalExams} exams placed. Blue outline: the exam this event is about; amber: exams that blocked it.</p>
          <Segmented label="Trace view" value={view} onChange={setView} options={[{ value: "timetable", label: "Timetable", icon: CalendarRange }, { value: "graph", label: "Conflict graph", icon: Network }]} />
        </div>
        {view === "timetable"
          ? <ScheduleGrid slots={slots} rooms={rooms} assignments={assignments} highlight={highlight} examNames={examNames} caption={`Partial schedule after event ${step + 1}`} />
          : <DemoGraph nodes={nodes} edges={edges} slots={slots} assignments={assignments} warningExams={highlight.warning} focusExamId={current?.examId ?? null}
              selected={graphSelected} onSelect={setGraphSelected} assignmentLabel={`partial schedule after event ${step + 1}`} />}
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border bg-card p-4">
          <h4 className="text-sm font-semibold">How {ALGORITHM_LABEL[entry.result.algorithm]} decides</h4>
          <dl className="mt-2 space-y-2 text-xs leading-5">
            <div><dt className="font-medium text-foreground">Order</dt><dd className="text-muted-foreground">{explainer.order}</dd></div>
            <div><dt className="font-medium text-foreground">Slot</dt><dd className="text-muted-foreground">{explainer.slot}</dd></div>
            <div><dt className="font-medium text-foreground">Room</dt><dd className="text-muted-foreground">{explainer.room}</dd></div>
            <div><dt className="font-medium text-foreground">When it fails</dt><dd className="text-muted-foreground">{explainer.failure}</dd></div>
          </dl>
        </div>
        <div className="rounded-xl border bg-card">
          <p className="flex items-center justify-between gap-2 border-b px-3 py-2 text-xs">
            <span className="font-medium">Execution-trace replay</span>
            {entry.benchmark === null ? <span className="text-muted-foreground">recorded during the measured run</span>
              : entry.benchmark.sameResult
                ? <span className="inline-flex items-center gap-1 text-success" title="A separate run with tracing off produced the same assignments."><ShieldCheck className="size-3.5" />trace-off rerun agrees</span>
                : <span className="inline-flex items-center gap-1 text-destructive" title="A separate run with tracing off produced different assignments."><TriangleAlert className="size-3.5" />trace-off rerun differs</span>}
          </p>
          {entry.trace.truncated && <p className="border-b px-3 py-1.5 text-[11px] text-muted-foreground">Showing the first {entry.trace.limit.toLocaleString("en-US")} of {entry.trace.emitted.toLocaleString("en-US")} events, plus the final summary.</p>}
          <ol ref={listRef} className="max-h-112 overflow-auto py-1 text-xs" aria-label="Trace events">
            {events.map((e, i) => (
              <li key={e.seq} data-step={i}>
                <button type="button" onClick={() => { setPlaying(false); go(i); }}
                  className={cn("flex w-full items-baseline gap-2 px-3 py-1 text-left hover:bg-muted/60", i === step && "bg-primary/8")}
                  aria-current={i === step ? "step" : undefined}>
                  <span className="w-8 shrink-0 text-right font-mono text-[10px] text-muted-foreground tabular-nums">{i + 1}</span>
                  <span className={cn("size-1.5 shrink-0 translate-y-[-1px] rounded-full", { neutral: "bg-muted-foreground/50", primary: "bg-primary", success: "bg-success", warning: "bg-warning", error: "bg-destructive" }[EVENT_META[e.type].tone])} aria-hidden />
                  <span className="min-w-0 flex-1 truncate"><span className="font-medium">{EVENT_META[e.type].label}</span>{e.examId && <span className="font-mono text-muted-foreground"> {e.examId}</span>}{e.slotId && <span className="font-mono text-muted-foreground"> {e.slotId}</span>}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
        <p className="px-1 text-[11px] leading-4 text-muted-foreground">These events were recorded while the solver ran on the server. The replay re-applies them in order; it does not re-run or imitate the algorithm, and playback speed has nothing to do with how fast the solver ran. Use ← / → to step.</p>
      </aside>
    </div></div>
  );
}
