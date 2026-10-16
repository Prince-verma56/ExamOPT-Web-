/**
 * ExamOpt scheduling domain model.
 *
 * Everything under `server/scheduling` except `loader.ts`, `persistence.ts`
 * and `service.ts` is pure TypeScript with no I/O, so the same code runs in
 * route handlers, the Test Lab and Vitest.
 */

export const ENGINE_VERSION = "2.0.0";

export type AlgorithmId = "FIRST_FIT" | "WELSH_POWELL" | "BACKTRACKING";
export const ALGORITHM_IDS: AlgorithmId[] = ["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"];

export type RoomType = "THEORY" | "LAB";

export interface Exam {
  /** Examination id. One examination per subject in the C10 dataset, so this equals the subject id. */
  id: string;
  subjectId: string;
  name: string;
  program: string;
  semester: number;
  durationMinutes: number;
  /** Enrollment count declared on the subject record. Informational only. */
  declaredStudents: number;
  requiredRoomType: RoomType;
  fixedSlotId: string | null;
  unavailableSlotIds: string[];
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  roomType: RoomType;
  unavailableSlotIds: string[];
}

export interface Slot {
  id: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  startMinutes: number;
  endMinutes: number;
  session: string;
  label: string;
}

export interface Enrollment {
  studentId: string;
  examId: string;
  groupId: string | null;
  /** True when the student sits this exam outside their own program/semester (backlog or bridge course). */
  isBacklog: boolean;
}

export interface SchedulingInput {
  exams: Exam[];
  rooms: Room[];
  slots: Slot[];
  enrollments: Enrollment[];
}

export interface Assignment {
  examId: string;
  slotId: string;
  roomId: string;
}

export interface SoftWeights {
  /** Penalty per extra exam a student sits on the same day. */
  sameDay: number;
  /** Penalty per pair of a student's exams in chronologically adjacent slots. */
  backToBack: number;
  /** Penalty per 100 empty seats across allocated rooms. */
  capacityWaste: number;
  /** Penalty per examination day used. */
  daysUsed: number;
}

export interface EngineConfig {
  /** Maximum backtracking search nodes (assignments tried). */
  maxNodes: number;
  /** Wall-clock limit for backtracking, in milliseconds. */
  timeLimitMs: number;
  weights: SoftWeights;
}

export const DEFAULT_CONFIG: EngineConfig = {
  maxNodes: 200_000,
  timeLimitMs: 3_000,
  weights: { sameDay: 3, backToBack: 1, capacityWaste: 1, daysUsed: 0.5 },
};

export type DiagnosticCode =
  | "INVALID_DATA"
  | "MISSING_REFERENCE"
  | "DUPLICATE_IDENTIFIER"
  | "ENROLLMENT_MISMATCH"
  | "EMPTY_DATASET"
  | "ROOM_CAPACITY_BOTTLENECK"
  | "LABORATORY_UNAVAILABLE"
  | "FIXED_SLOT_CONFLICT"
  | "NO_AVAILABLE_TIME_SLOT"
  | "STUDENT_CONFLICT_BOTTLENECK"
  | "UNSCHEDULED_EXAM"
  | "SEARCH_LIMIT_REACHED"
  | "SEARCH_EXHAUSTED"
  | "VALIDATION_FAILED";

export type DiagnosticKind = "data" | "constraint" | "search";

export interface Diagnostic {
  code: DiagnosticCode;
  severity: "error" | "warning" | "info";
  /** Data problems are fixed in the source records; constraint problems are genuine scheduling conflicts. */
  kind: DiagnosticKind;
  message: string;
  constraint?: string;
  examIds?: string[];
  roomIds?: string[];
  slotIds?: string[];
  remediation?: string;
  /** True only when this diagnostic on its own establishes that no feasible schedule exists. */
  provesInfeasible?: boolean;
}

/**
 * - FEASIBLE: every exam assigned and the independent validator passed.
 * - PARTIAL: a heuristic left exams unscheduled. This does not establish infeasibility.
 * - SEARCH_LIMIT: bounded search stopped before finding a schedule. Feasibility is unknown.
 * - INFEASIBLE: established either by a necessary-condition check or by exhausting the complete search.
 * - INVALID: the solver produced assignments that failed independent validation.
 * - INVALID_INPUT: input data errors; the solver was not run.
 */
export type RunOutcome = "FEASIBLE" | "PARTIAL" | "SEARCH_LIMIT" | "INFEASIBLE" | "INVALID" | "INVALID_INPUT";

export type InfeasibilityEvidence = "necessary-condition" | "exhaustive-search";
