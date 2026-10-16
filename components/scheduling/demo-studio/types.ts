import type { schedulingService } from "@/server/scheduling/service";

/** Response types come from the service itself, so the client cannot drift from what the server returns. */
export type DemoDataset = Awaited<ReturnType<typeof schedulingService.demoDataset>>;
export type DemoArena = Awaited<ReturnType<typeof schedulingService.demoArena>>;
export type ArenaEntry = DemoArena["entries"][number];
export type DemoSimulation = NonNullable<Awaited<ReturnType<typeof schedulingService.demoSimulate>>>;
export type DemoBottleneck = NonNullable<Awaited<ReturnType<typeof schedulingService.demoBottleneck>>>;
export type DemoPublished = Awaited<ReturnType<typeof schedulingService.publishedSchedule>>;
export type ScenarioCatalogue = DemoDataset["scenarios"];
export type GraphNode = DemoDataset["graph"]["nodes"][number];
export type GraphEdge = DemoDataset["graph"]["edges"][number];
export type DemoSlot = DemoDataset["slots"][number];
export type DemoRoom = DemoDataset["rooms"][number];

export type DemoSource = "live" | "fixture";
export type StudioTab = "readiness" | "graph" | "arena" | "simulator" | "resolution";
export type AlgorithmId = "FIRST_FIT" | "WELSH_POWELL" | "BACKTRACKING";
export type ScenarioId = "STUDENT_OVERLAP" | "BACKLOG_CONFLICT" | "ROOM_DOUBLE_BOOKED" | "ROOM_CAPACITY_EXCEEDED" | "ROOM_TYPE_MISMATCH" | "SLOT_RULE_VIOLATED" | "COMBINED";
export type ResolutionId = "repair" | "regenerate" | "restore";

export const STUDIO_TABS: StudioTab[] = ["readiness", "graph", "arena", "simulator", "resolution"];
export const ALGORITHMS: AlgorithmId[] = ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"];
/** Validator scenarios A-G (details come from the server catalogue). Scenario H is the preflight bottleneck. */
export const SCENARIOS: { id: ScenarioId; title: string }[] = [
  { id: "STUDENT_OVERLAP", title: "Shared-student overlap" },
  { id: "BACKLOG_CONFLICT", title: "Backlog / cross-semester conflict" },
  { id: "ROOM_DOUBLE_BOOKED", title: "Room double-booking" },
  { id: "ROOM_CAPACITY_EXCEEDED", title: "Capacity overflow" },
  { id: "ROOM_TYPE_MISMATCH", title: "Laboratory mismatch" },
  { id: "SLOT_RULE_VIOLATED", title: "Fixed / unavailable slot" },
  { id: "COMBINED", title: "Combined failure" },
];

export interface PlacedAssignment {
  examId: string;
  slotId: string;
  roomId: string;
}

/** Visual emphasis for exams in a schedule grid or the graph. */
export interface Highlight {
  /** Current focus (trace event, selection). */
  focus?: Set<string>;
  /** Exams involved in a validator violation. */
  error?: Set<string>;
  /** Exams to draw attention to without claiming an error (e.g. blockers of a rejected candidate). */
  warning?: Set<string>;
  /** Exams whose placement changed (before/after). */
  changed?: Set<string>;
  /** Slot to outline (candidate under consideration). */
  slotId?: string | null;
  /** Ghost placement to show a candidate that was considered but not (yet) assigned. */
  ghost?: PlacedAssignment | null;
}
