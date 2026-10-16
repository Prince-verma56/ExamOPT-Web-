/**
 * Optional, bounded execution trace for the scheduling algorithms.
 *
 * Solvers call `trace?.emit(...)`. Optional-call short-circuiting means that
 * when no recorder is passed the event object is never built, so the default
 * path does the same work as before. Events carry exam, slot and room ids and
 * aggregate counts only, never student identities.
 */

export type TraceEventType =
  | "run_started"
  | "exam_ordered"
  | "exam_selected"
  | "slot_opened"
  | "candidate_considered"
  | "candidate_rejected"
  | "room_selected"
  | "slot_assigned"
  | "forward_check_failed"
  | "backtrack"
  | "exam_unscheduled"
  | "search_limit_reached"
  | "run_completed";

export type RejectionReason = "STUDENT_CLASH" | "NO_FREE_ROOM" | "SLOT_NOT_PERMITTED";

export interface TraceEvent {
  /** Position in the full event stream, counting dropped events. */
  seq: number;
  type: TraceEventType;
  examId?: string;
  slotId?: string;
  roomId?: string;
  reason?: RejectionReason;
  /** Exams responsible for a rejection (student clash) or emptied by forward checking. */
  relatedExamIds?: string[];
  /** Search depth (backtracking). */
  depth?: number;
  /** Search node counter at this point (backtracking). */
  node?: number;
  /** One sentence on what the algorithm did and why, in its own terms. */
  message: string;
  /** Small, algorithm-specific figures (domain size, degree, capacity, students). */
  data?: Record<string, number | string | boolean | string[] | number[]>;
}

export interface ExecutionTrace {
  events: TraceEvent[];
  /** Events emitted in total, including any dropped once the cap was reached. */
  emitted: number;
  dropped: number;
  limit: number;
  truncated: boolean;
}

export const DEFAULT_TRACE_LIMIT = 1500;

export class TraceRecorder {
  private readonly events: TraceEvent[] = [];
  private emitted = 0;

  constructor(readonly limit = DEFAULT_TRACE_LIMIT) {}

  emit(event: Omit<TraceEvent, "seq">) {
    const seq = this.emitted++;
    // The final summary is always kept so a truncated trace still ends with the outcome.
    if (this.events.length < this.limit || event.type === "run_completed") this.events.push({ seq, ...event });
  }

  result(): ExecutionTrace {
    const dropped = this.emitted - this.events.length;
    return { events: this.events, emitted: this.emitted, dropped, limit: this.limit, truncated: dropped > 0 };
  }
}
