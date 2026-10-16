import { ALGORITHM_IDS, type AlgorithmId, type Assignment, type EngineConfig, type SchedulingInput } from "./domain";
import { classifyOutcome, compareRunResults, mergeConfig, prepareDataset, runAlgorithm, type PreparedDataset, type RunResult } from "./engine";
import { tamperCampusMiniSchedule } from "./fixtures";
import { compareSlots, Occupancy, type SchedulingModel } from "./model";
import { maxDisjointSlots } from "./preflight";
import { publishGate } from "./publication";
import { TraceRecorder, type ExecutionTrace } from "./trace";
import { validateSchedule, VALIDATION_RULES, type ValidationReport, type Violation, type ViolationCode } from "./validator";

/**
 * Judge Demo Studio sandbox.
 *
 * Pure functions over an in-memory copy of a scheduling input. Nothing here
 * reads or writes the database: the service hands in either the live tables
 * (already loaded) or the Test Lab fixture, and every function works on a
 * structured clone. Scenarios inject a violation into a copy of a real,
 * validator-approved schedule; the real validator then judges the copy, and a
 * correction is judged again by the same validator. No result is hard-coded.
 */

export type DemoSource = "live" | "fixture";
export const DEMO_SOURCES: DemoSource[] = ["live", "fixture"];

/** Validator scenarios (A-G). Scenario H, the preflight bottleneck, is an input problem and runs through `bottleneckScenario`. */
export const DEMO_SCENARIOS = ["STUDENT_OVERLAP", "BACKLOG_CONFLICT", "ROOM_DOUBLE_BOOKED", "ROOM_CAPACITY_EXCEEDED", "ROOM_TYPE_MISMATCH", "SLOT_RULE_VIOLATED", "COMBINED"] as const;
export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export const DEMO_RESOLUTIONS = ["repair", "regenerate", "restore"] as const;
export type DemoResolution = (typeof DEMO_RESOLUTIONS)[number];

export interface ScenarioMeta {
  letter: string;
  title: string;
  targets: ViolationCode[];
  summary: string;
  /** The underlying condition the scenario creates. */
  condition: string;
  /** What the validator is expected to report, and why. */
  expected: string;
  /** Diagnostic category: an invalid assignment, not an invalid dataset. */
  category: string;
  remediation: string;
  afterCorrection: string;
}

export const SCENARIO_META: Record<DemoScenario, ScenarioMeta> = {
  STUDENT_OVERLAP: {
    letter: "A", title: "Shared-student overlap", targets: ["STUDENT_OVERLAP"],
    summary: "Move one exam into the slot of another exam that shares enrolled students.",
    condition: "Two exams joined by a conflict-graph edge (at least one student sits both) are placed in overlapping slots.",
    expected: "Rule 2 fails with STUDENT_OVERLAP, reporting the number of affected students, never their identities.",
    category: "Invalid assignment (scheduling conflict); the source data is fine.",
    remediation: "Move one of the two exams to a permitted slot where none of its students has another exam.",
    afterCorrection: "Both exams sit in non-overlapping slots; the validator passes all 10 rules.",
  },
  BACKLOG_CONFLICT: {
    letter: "B", title: "Backlog / cross-semester conflict", targets: ["STUDENT_OVERLAP"],
    summary: "Overlap two exams from different cohorts that are linked only because some students carry a backlog.",
    condition: "Exams from different programs or semesters normally never clash. A student repeating an earlier exam (backlog) or taking a bridge course sits both, so the graph gains a cross-cohort edge.",
    expected: "Rule 2 fails with STUDENT_OVERLAP, although the two exams belong to different cohorts.",
    category: "Invalid assignment; the backlog enrollment itself is legitimate data.",
    remediation: "Move one exam to a slot that does not overlap the other.",
    afterCorrection: "The backlog students can sit both exams; the validator passes.",
  },
  ROOM_DOUBLE_BOOKED: {
    letter: "C", title: "Room double-booking", targets: ["ROOM_DOUBLE_BOOKED"],
    summary: "Put two exams with no shared students in the same room at the same time.",
    condition: "Two exams with no common students occupy one room in overlapping slots.",
    expected: "Rule 3 fails with ROOM_DOUBLE_BOOKED, naming the room and both exams. No student rule breaks.",
    category: "Invalid assignment (room conflict).",
    remediation: "Move one exam to another free room of the right type and size, or to another slot.",
    afterCorrection: "Each room hosts at most one exam per slot; the validator passes.",
  },
  ROOM_CAPACITY_EXCEEDED: {
    letter: "D", title: "Capacity overflow", targets: ["ROOM_CAPACITY_EXCEEDED"],
    summary: "Move an exam into a free room of the right type that has fewer seats than its enrolled students.",
    condition: "An exam's enrolled students outnumber the seats of its assigned room.",
    expected: "Rule 4 fails with ROOM_CAPACITY_EXCEEDED, stating students and seats.",
    category: "Invalid assignment (room capacity).",
    remediation: "Choose a free room of the same type with enough seats (best fit).",
    afterCorrection: "The exam sits in a room with at least as many seats as students.",
  },
  ROOM_TYPE_MISMATCH: {
    letter: "E", title: "Laboratory mismatch", targets: ["ROOM_TYPE_MISMATCH"],
    summary: "Move a practical exam into a free theory room large enough for it (or a theory exam into a laboratory).",
    condition: "A practical exam that needs a laboratory is placed in a lecture room (capacity is fine).",
    expected: "Rule 5 fails with ROOM_TYPE_MISMATCH, stating the requirement and the room type.",
    category: "Invalid assignment (room type).",
    remediation: "Move the exam into a free laboratory with enough seats.",
    afterCorrection: "The practical exam is in a laboratory; the validator passes.",
  },
  SLOT_RULE_VIOLATED: {
    letter: "F", title: "Fixed / unavailable slot", targets: ["FIXED_SLOT_VIOLATED", "EXAM_SLOT_UNAVAILABLE", "ROOM_SLOT_UNAVAILABLE"],
    summary: "Move a fixed-slot exam out of its slot, or an exam into a slot where it or its room is unavailable.",
    condition: "An administrative timing rule is broken: an exam pinned to a slot is moved, or an exam is put in a blocked slot.",
    expected: "Rule 6 (FIXED_SLOT_VIOLATED) or rule 7 (EXAM_SLOT_UNAVAILABLE) fails, naming the rule's slot.",
    category: "Invalid assignment (timing rule).",
    remediation: "Return the exam to its fixed slot, or to a slot it is permitted to use.",
    afterCorrection: "The timing rule holds; the validator passes.",
  },
  COMBINED: {
    letter: "G", title: "Combined failure", targets: ["STUDENT_OVERLAP", "ROOM_CAPACITY_EXCEEDED", "ROOM_TYPE_MISMATCH", "ROOM_DOUBLE_BOOKED", "DUPLICATE_ASSIGNMENT"],
    summary: "Several independent violations in one candidate, to show the validator reports every one of them.",
    condition: "Several independent changes on different exams.",
    expected: "The validator reports each violated rule separately; one finding does not hide or imply another.",
    category: "Several invalid assignments.",
    remediation: "Fix each tampered exam; the targeted repair re-places all of them.",
    afterCorrection: "All findings are cleared together, or the remaining ones stay listed.",
  },
};

export interface DemoTargets {
  examId?: string;
  otherExamId?: string;
}

export class DemoScenarioError extends Error {
  constructor(public readonly code: "SCENARIO_UNAVAILABLE" | "INVALID_TARGET" | "BASELINE_NOT_FEASIBLE", message: string) {
    super(message);
  }
}

/** Deep copy: whatever the demo does to its candidate can never reach the loaded dataset. */
export function cloneInput(input: SchedulingInput): SchedulingInput {
  return structuredClone(input);
}

const plain = (a: Assignment): Assignment => ({ examId: a.examId, slotId: a.slotId, roomId: a.roomId });
const place = (a: Assignment | undefined) => (a ? { slotId: a.slotId, roomId: a.roomId } : null);

// ---------------------------------------------------------------------------
// Algorithm arena
// ---------------------------------------------------------------------------

export interface ArenaEntry {
  /** The measured run. Its decisions were recorded while it executed, so the trace is this run's trace. */
  result: RunResult;
  trace: ExecutionTrace;
  /**
   * A separate measurement with tracing off, for a fair timing comparison.
   * Null when not requested. `sameResult` checks that tracing changed nothing.
   */
  benchmark: { durationMs: number; sameResult: boolean } | null;
}

/**
 * Runs each algorithm once, traced, on its own freshly built copy of the input
 * (so no solver can see another's state). The reported result and the trace come
 * from that single execution. Optionally a second, untraced run is timed and
 * compared, and labelled as a separate benchmark.
 */
export function runArena(input: SchedulingInput, algorithms: AlgorithmId[], config: EngineConfig, options: { traceLimit?: number; benchmark?: boolean } = {}) {
  const key = (r: RunResult) => JSON.stringify(r.assignments.map(plain)) + r.outcome;
  const entries: ArenaEntry[] = algorithms.map((id) => {
    const recorder = new TraceRecorder(options.traceLimit);
    const result = runAlgorithm(prepareDataset(cloneInput(input)), id, config, { trace: recorder });
    let benchmark: ArenaEntry["benchmark"] = null;
    if (options.benchmark) {
      const untraced = runAlgorithm(prepareDataset(cloneInput(input)), id, config);
      benchmark = { durationMs: untraced.durationMs, sameResult: key(untraced) === key(result) };
    }
    return { result, trace: recorder.result(), benchmark };
  });
  const ranked = [...entries].sort((a, b) => compareRunResults(row(a.result), row(b.result)));
  return { entries, ranking: ranked.map((e) => e.result.algorithm) };
}

function row(r: RunResult) {
  return { outcome: r.outcome, unscheduled: r.unscheduledExamIds.length, softPenalty: r.metrics?.softPenalty.total ?? null, durationMs: r.durationMs };
}

// ---------------------------------------------------------------------------
// Scenario injection
// ---------------------------------------------------------------------------

export interface InjectedChange {
  examId: string;
  kind: "moved" | "added";
  from: { slotId: string; roomId: string } | null;
  to: { slotId: string; roomId: string };
  note: string;
}

export interface DemoInjection {
  scenario: DemoScenario;
  title: string;
  /** Where the tampering recipe came from: chosen from this dataset, or the Test Lab's fixture tamper. */
  origin: "derived-from-data" | "test-lab-fixture";
  description: string;
  changes: InjectedChange[];
  facts: { label: string; value: string }[];
  targetCodes: ViolationCode[];
}

interface Ctx {
  model: SchedulingModel;
  candidate: Assignment[];
  /** Exams already tampered with (combined scenario) or otherwise off limits. */
  exclude: Set<string>;
}

/** Occupancy of the candidate with the listed exams lifted out, so "free" means free for them. */
function occupancyWithout(model: SchedulingModel, candidate: Assignment[], without: string[]) {
  const occ = new Occupancy(model);
  for (const a of candidate) {
    if (without.includes(a.examId)) continue;
    const e = model.examIndex.get(a.examId), s = model.slotIndex.get(a.slotId), r = model.roomIndex.get(a.roomId);
    if (e !== undefined && s !== undefined && r !== undefined) occ.assign(e, s, r);
  }
  return occ;
}

function indexOf(model: SchedulingModel, candidate: Assignment[], examId: string) {
  const a = candidate.find((x) => x.examId === examId);
  if (!a) return null;
  return { e: model.examIndex.get(a.examId)!, s: model.slotIndex.get(a.slotId)!, r: model.roomIndex.get(a.roomId)!, a };
}

function requireExam(model: SchedulingModel, candidate: Assignment[], id: string | undefined, label: string) {
  if (id === undefined) return null;
  if (!model.examIndex.has(id)) throw new DemoScenarioError("INVALID_TARGET", `${label} ${id} is not an examination in this dataset.`);
  const found = indexOf(model, candidate, id);
  if (!found) throw new DemoScenarioError("INVALID_TARGET", `${label} ${id} has no assignment in the source schedule.`);
  return found;
}

function move(ctx: Ctx, examId: string, slotId: string, roomId: string, note: string): InjectedChange {
  const a = ctx.candidate.find((x) => x.examId === examId)!;
  const from = place(a);
  a.slotId = slotId; a.roomId = roomId;
  ctx.exclude.add(examId);
  return { examId, kind: "moved", from, to: { slotId, roomId }, note };
}

const assigned = (ctx: Ctx) => ctx.model.exams.map((_, e) => e).filter((e) => !ctx.exclude.has(ctx.model.exams[e].id) && ctx.candidate.some((a) => a.examId === ctx.model.exams[e].id));

/** Exams sharing students with `e` (other than `except`) already in a slot overlapping `s`. */
function clashCount(ctx: Ctx, e: number, s: number, except: number) {
  const { model } = ctx;
  return model.graph.adjacency[e].filter((u) => u !== except && ctx.candidate.some((a) => a.examId === model.exams[u].id && model.slotOverlap[s][model.slotIndex.get(a.slotId)!])).length;
}

type Injected = Omit<DemoInjection, "scenario" | "title" | "origin" | "targetCodes"> | null;

const cohortOf = (model: SchedulingModel, e: number) => `${model.exams[e].program} semester ${model.exams[e].semester}`;

function injectOverlap(ctx: Ctx, targets: DemoTargets, backlogOnly = false): Injected {
  const { model } = ctx;
  const explicit = targets.examId !== undefined || targets.otherExamId !== undefined;
  let pairs: [number, number][];
  if (explicit) {
    const a = requireExam(model, ctx.candidate, targets.examId, "Exam");
    const b = requireExam(model, ctx.candidate, targets.otherExamId, "Second exam");
    if (!a || !b) throw new DemoScenarioError("INVALID_TARGET", "Choose two examinations for a shared-student overlap.");
    if (model.graph.shared[a.e][b.e] === 0) throw new DemoScenarioError("INVALID_TARGET", `${a.a.examId} and ${b.a.examId} share no enrolled students, so overlapping them breaks no student rule.`);
    if (backlogOnly && model.graph.backlogShared[a.e][b.e] === 0) throw new DemoScenarioError("INVALID_TARGET", `${a.a.examId} and ${b.a.examId} are not linked through a backlog or bridge enrollment.`);
    pairs = [[a.e, b.e], [b.e, a.e]];
  } else {
    const crossCohort = (a: number, b: number) => model.exams[a].program !== model.exams[b].program || model.exams[a].semester !== model.exams[b].semester;
    const edges = backlogOnly
      // Cross-cohort edges carried by backlog students, the purest (all shared students are backlog) first.
      ? model.graph.edges.filter((e) => e.backlogShared > 0 && crossCohort(e.a, e.b)).sort((x, y) => Number(y.backlogShared === y.shared) - Number(x.backlogShared === x.shared) || y.backlogShared - x.backlogShared || x.a - y.a || x.b - y.b)
      : [...model.graph.edges].sort((x, y) => y.shared - x.shared || x.a - y.a || x.b - y.b);
    pairs = edges.flatMap(({ a, b }) => [[a, b], [b, a]] as [number, number][]);
  }
  const usable = new Set(assigned(ctx));
  let fallback: { stay: number; mover: number; s: number; r: number } | null = null;
  for (const [stay, mover] of pairs) {
    if (!explicit && (!usable.has(stay) || !usable.has(mover))) continue;
    const s = indexOf(model, ctx.candidate, model.exams[stay].id)!.s;
    if (!model.candidateSlots[mover].includes(s)) continue; // keep the move inside the mover's permitted slots
    const occ = occupancyWithout(model, ctx.candidate, [model.exams[mover].id]);
    const r = occ.bestFitRoom(mover, s);
    if (r === -1) continue;
    const pick = { stay, mover, s, r };
    if (clashCount(ctx, mover, s, stay) === 0) { fallback = pick; break; }
    fallback ??= pick;
  }
  if (!fallback && explicit) throw new DemoScenarioError("INVALID_TARGET", `Neither ${targets.examId} nor ${targets.otherExamId} can be moved into the other's slot without also breaking a slot or room rule, so the overlap would not be isolated.`);
  if (!fallback) return null;
  const { stay, mover, s, r } = fallback;
  const stayId = model.exams[stay].id, moverId = model.exams[mover].id, slotId = model.slots[s].id;
  const shared = model.graph.shared[stay][mover];
  const change = move(ctx, moverId, slotId, model.rooms[r].id, `Moved into ${slotId}, where ${stayId} already sits.`);
  if (backlogOnly) {
    const backlog = model.graph.backlogShared[stay][mover];
    return {
      description: `${moverId} (${cohortOf(model, mover)}) was moved into ${slotId}, the slot of ${stayId} (${cohortOf(model, stay)}). The exams belong to different cohorts, yet ${shared} student${shared === 1 ? "" : "s"} must sit both: ${backlog} of them through a backlog or bridge enrollment. The conflict graph knows this because it is built from actual enrollments, not from the timetable of each cohort.`,
      changes: [change],
      facts: [
        { label: "Exam A (stays)", value: `${stayId} · ${cohortOf(model, stay)}` },
        { label: "Exam B (moved)", value: `${moverId} · ${cohortOf(model, mover)}` },
        { label: "Shared students", value: String(shared) },
        { label: "Via backlog / bridge", value: String(backlog) },
        { label: "Conflicting slot", value: slotId },
      ],
    };
  }
  return {
    description: `${moverId} was moved into ${slotId}, the slot of ${stayId}. The two exams share ${shared} enrolled student${shared === 1 ? "" : "s"}, so those students would be expected in two rooms at once. ${moverId} got a free, suitable room (${model.rooms[r].id}) so that only the student rule breaks.`,
    changes: [change],
    facts: [
      { label: "Exam A (stays)", value: `${stayId} · ${model.exams[stay].name}` },
      { label: "Exam B (moved)", value: `${moverId} · ${model.exams[mover].name}` },
      { label: "Shared students", value: String(shared) },
      { label: "Conflicting slot", value: slotId },
      { label: "B's original slot", value: change.from?.slotId ?? "—" },
    ],
  };
}

function injectDoubleBooking(ctx: Ctx, targets: DemoTargets): Injected {
  const { model } = ctx;
  const explicitStay = requireExam(model, ctx.candidate, targets.examId, "Exam");
  const explicitMover = requireExam(model, ctx.candidate, targets.otherExamId, "Second exam");
  const exams = assigned(ctx);
  for (const stay of explicitStay ? [explicitStay.e] : exams) {
    const { s, r } = indexOf(model, ctx.candidate, model.exams[stay].id)!;
    for (const mover of explicitMover ? [explicitMover.e] : exams) {
      if (mover === stay || model.graph.shared[stay][mover] > 0) continue;
      const fits = model.suitableRooms[mover].includes(r) && model.candidateSlots[mover].includes(s);
      if (!fits) { if (explicitMover) throw new DemoScenarioError("INVALID_TARGET", `${model.exams[mover].id} cannot legally use ${model.rooms[r].id} in ${model.slots[s].id} apart from the double booking (room type, capacity or slot rule), so it would not isolate the room rule.`); continue; }
      // The mover must not clash with any student already in that slot.
      const occMover = occupancyWithout(model, ctx.candidate, [model.exams[mover].id]);
      if (!occMover.studentsFree(mover, s)) continue;
      const stayId = model.exams[stay].id, moverId = model.exams[mover].id, roomId = model.rooms[r].id, slotId = model.slots[s].id;
      const change = move(ctx, moverId, slotId, roomId, `Placed in ${roomId} during ${slotId}, which ${stayId} already occupies.`);
      return {
        description: `${moverId} was put in ${roomId} during ${slotId}, where ${stayId} is already sitting. The two exams share no students and the room suits both, so only the room rule breaks.`,
        changes: [change],
        facts: [
          { label: "Room", value: `${roomId} · ${model.rooms[r].capacity} seats` },
          { label: "Slot", value: slotId },
          { label: "Exams in the room", value: `${stayId} (${model.graph.studentCount[stay]}) + ${moverId} (${model.graph.studentCount[mover]})` },
          { label: "Shared students", value: "0" },
        ],
      };
    }
    if (explicitStay) break;
  }
  if (explicitStay || explicitMover) throw new DemoScenarioError("INVALID_TARGET", "Those two exams cannot be double-booked without also breaking another rule (they share students, or the room or slot does not suit the second exam).");
  return null;
}

function injectCapacity(ctx: Ctx, targets: DemoTargets): Injected {
  const { model } = ctx;
  const explicit = requireExam(model, ctx.candidate, targets.examId, "Exam");
  const order = explicit ? [explicit.e] : assigned(ctx).sort((a, b) => model.graph.studentCount[b] - model.graph.studentCount[a] || a - b);
  for (const e of order) {
    const exam = model.exams[e];
    const { s: current, r: original } = indexOf(model, ctx.candidate, exam.id)!;
    const occ = occupancyWithout(model, ctx.candidate, [exam.id]);
    const students = model.graph.studentCount[e];
    // Rooms of the right type that are too small, largest first: the realistic "almost fits" mistake.
    const smaller = model.rooms.map((room, r) => ({ room, r }))
      .filter(({ room }) => room.roomType === exam.requiredRoomType && room.capacity < students)
      .sort((a, b) => b.room.capacity - a.room.capacity || a.room.id.localeCompare(b.room.id));
    // Same slot first; otherwise another permitted slot with no student clash, so nothing but capacity breaks.
    const slots = [current, ...model.candidateSlots[e].filter((s) => s !== current && occ.studentsFree(e, s))];
    let pick: { r: number; s: number } | null = null;
    for (const s of slots) {
      const hit = smaller.find(({ r }) => occ.roomFree(r, s));
      if (hit) { pick = { r: hit.r, s }; break; }
    }
    if (!pick) { if (explicit) throw new DemoScenarioError("INVALID_TARGET", `No ${exam.requiredRoomType === "LAB" ? "laboratory" : "theory room"} with fewer than ${students} seats is free in a slot ${exam.id} could otherwise use.`); continue; }
    const room = model.rooms[pick.r], slotId = model.slots[pick.s].id;
    const sameSlot = pick.s === current;
    const change = move(ctx, exam.id, slotId, room.id, `Moved from ${model.rooms[original].id} (${model.rooms[original].capacity} seats) to ${room.id} (${room.capacity} seats)${sameSlot ? "" : `, in ${slotId}`}.`);
    return {
      description: `${exam.id} has ${students} enrolled students. It was moved to ${room.id}, a free ${room.roomType === "LAB" ? "laboratory" : "theory room"} with ${room.capacity} seats${sameSlot ? " in the same slot" : ` in ${slotId}, a permitted slot where none of its students has another exam`}, so only the capacity rule breaks.`,
      changes: [change],
      facts: [
        { label: "Exam", value: `${exam.id} · ${exam.name}` },
        { label: "Enrolled students", value: String(students) },
        { label: "Assigned room", value: `${room.id} · ${room.capacity} seats` },
        { label: "Overflow", value: `${students - room.capacity} students without a seat` },
        { label: "Original room", value: `${model.rooms[original].id} · ${model.rooms[original].capacity} seats` },
      ],
    };
  }
  return null;
}

function injectRoomType(ctx: Ctx, targets: DemoTargets): Injected {
  const { model } = ctx;
  const explicit = requireExam(model, ctx.candidate, targets.examId, "Exam");
  const pool = assigned(ctx);
  // Practical exams first: "a lab exam in a lecture room" is the case the rule exists for.
  const order = explicit ? [explicit.e] : [...pool.filter((e) => model.exams[e].requiredRoomType === "LAB"), ...pool.filter((e) => model.exams[e].requiredRoomType !== "LAB")];
  for (const e of order) {
    const exam = model.exams[e];
    const { s, r: original } = indexOf(model, ctx.candidate, exam.id)!;
    const occ = occupancyWithout(model, ctx.candidate, [exam.id]);
    const students = model.graph.studentCount[e];
    const wrong = model.rooms.map((room, r) => ({ room, r }))
      .filter(({ room, r }) => room.roomType !== exam.requiredRoomType && room.capacity >= students && occ.roomFree(r, s))
      .sort((a, b) => a.room.capacity - b.room.capacity || a.room.id.localeCompare(b.room.id));
    if (!wrong.length) { if (explicit) throw new DemoScenarioError("INVALID_TARGET", `No free room of the other type with ${students}+ seats exists in ${model.slots[s].id}.`); continue; }
    const { room } = wrong[0];
    const change = move(ctx, exam.id, model.slots[s].id, room.id, `Moved from ${model.rooms[original].id} (${model.rooms[original].roomType}) to ${room.id} (${room.roomType}).`);
    return {
      description: exam.requiredRoomType === "LAB"
        ? `${exam.id} is a practical exam that requires a laboratory. It was moved to ${room.id}, a theory room with enough seats (${room.capacity}) that is free in the same slot, so only the room-type rule breaks.`
        : `${exam.id} is a theory exam. It was moved into laboratory ${room.id}, which has enough seats and is free in the same slot; laboratories are reserved for practical exams.`,
      changes: [change],
      facts: [
        { label: "Exam", value: `${exam.id} · ${exam.name}` },
        { label: "Required room type", value: exam.requiredRoomType },
        { label: "Assigned room", value: `${room.id} · ${room.roomType}, ${room.capacity} seats` },
        { label: "Original room", value: `${model.rooms[original].id} · ${model.rooms[original].roomType}` },
      ],
    };
  }
  return null;
}

function injectSlotRule(ctx: Ctx, targets: DemoTargets): Injected {
  const { model } = ctx;
  const explicit = requireExam(model, ctx.candidate, targets.examId, "Exam");
  const pool = explicit ? [explicit.e] : assigned(ctx);
  const tryMove = (e: number, slots: number[], label: (slotId: string) => string, rule: "fixed" | "exam-unavailable") => {
    const exam = model.exams[e];
    const { s: current } = indexOf(model, ctx.candidate, exam.id)!;
    const occ = occupancyWithout(model, ctx.candidate, [exam.id]);
    for (const s of slots) {
      if (s === current || !occ.studentsFree(e, s)) continue;
      const slot = model.slots[s];
      if (exam.durationMinutes > slot.endMinutes - slot.startMinutes) continue;
      if (rule === "fixed" && exam.unavailableSlotIds.includes(slot.id)) continue;
      const r = occ.bestFitRoom(e, s);
      if (r === -1) continue;
      const change = move(ctx, exam.id, slot.id, model.rooms[r].id, label(slot.id));
      return { change, slotId: slot.id, roomId: model.rooms[r].id };
    }
    return null;
  };
  // 1. A fixed-slot exam moved out of its fixed slot.
  for (const e of pool.filter((x) => model.exams[x].fixedSlotId)) {
    const exam = model.exams[e];
    const done = tryMove(e, model.slots.map((_, s) => s), (slotId) => `Moved out of its fixed slot ${exam.fixedSlotId} into ${slotId}.`, "fixed");
    if (done) return {
      description: `${exam.id} must be held in ${exam.fixedSlotId}. It was moved to ${done.slotId} (room ${done.roomId}), where no enrolled student has another exam and a suitable room is free, so only the fixed-slot rule breaks.`,
      changes: [done.change],
      facts: [
        { label: "Rule", value: "Fixed time slot (rule 6)" },
        { label: "Exam", value: `${exam.id} · ${exam.name}` },
        { label: "Required slot", value: exam.fixedSlotId! },
        { label: "Assigned slot", value: done.slotId },
      ],
    };
  }
  // 2. An exam moved into a slot it is marked unavailable for.
  for (const e of pool.filter((x) => model.exams[x].unavailableSlotIds.length)) {
    const exam = model.exams[e];
    const blocked = exam.unavailableSlotIds.map((id) => model.slotIndex.get(id)).filter((s): s is number => s !== undefined);
    const done = tryMove(e, blocked, (slotId) => `Moved into ${slotId}, which is on its unavailable list.`, "exam-unavailable");
    if (done) return {
      description: `${exam.id} is marked unavailable in ${exam.unavailableSlotIds.join(", ")}. It was moved into ${done.slotId} (room ${done.roomId}) where no student clashes and the room is free, so only the unavailable-slot rule breaks.`,
      changes: [done.change],
      facts: [
        { label: "Rule", value: "Unavailable slots (rule 7)" },
        { label: "Exam", value: `${exam.id} · ${exam.name}` },
        { label: "Unavailable slots", value: exam.unavailableSlotIds.join(", ") },
        { label: "Assigned slot", value: done.slotId },
      ],
    };
  }
  if (explicit) throw new DemoScenarioError("INVALID_TARGET", `${model.exams[explicit.e].id} has neither a fixed slot nor an unavailable slot it could be moved into without breaking another rule.`);
  return null;
}

const INJECTORS: Record<Exclude<DemoScenario, "COMBINED">, (ctx: Ctx, targets: DemoTargets) => Injected> = {
  STUDENT_OVERLAP: (ctx, targets) => injectOverlap(ctx, targets),
  BACKLOG_CONFLICT: (ctx, targets) => injectOverlap(ctx, targets, true),
  ROOM_DOUBLE_BOOKED: injectDoubleBooking,
  ROOM_CAPACITY_EXCEEDED: injectCapacity,
  ROOM_TYPE_MISMATCH: injectRoomType,
  SLOT_RULE_VIOLATED: injectSlotRule,
};

/**
 * Builds a tampered copy of `baseline`. The baseline array is never modified.
 * On the Test Lab fixture the combined scenario is the Test Lab's own tamper;
 * elsewhere it chains three single injections on different exams.
 */
export function injectScenario(model: SchedulingModel, baseline: Assignment[], scenario: DemoScenario, targets: DemoTargets, source: DemoSource): { candidate: Assignment[]; injection: DemoInjection } {
  const candidate = baseline.map(plain);
  const ctx: Ctx = { model, candidate, exclude: new Set() };
  const meta = SCENARIO_META[scenario];

  if (scenario === "COMBINED" && source === "fixture") {
    const tampered = tamperCampusMiniSchedule(baseline);
    const before = new Map(baseline.map((a) => [a.examId, a]));
    const changes: InjectedChange[] = tampered.flatMap((a, i): InjectedChange[] => {
      if (i >= baseline.length) return [{ examId: a.examId, kind: "added", from: null, to: place(a)!, note: "A second assignment for an exam that is already placed." }];
      const b = before.get(a.examId)!;
      return b.slotId === a.slotId && b.roomId === a.roomId ? [] : [{ examId: a.examId, kind: "moved", from: place(b), to: place(a)!, note: a.examId === "BCA-102" ? "Moved onto BCA-101's slot and room." : "Moved into LAB-50." }];
    });
    const model40 = model.graph.shared[model.examIndex.get("BCA-101")!][model.examIndex.get("BCA-102")!];
    return {
      candidate: tampered,
      injection: {
        scenario, title: meta.title, origin: "test-lab-fixture", targetCodes: meta.targets, changes,
        description: "The Test Lab's independent-validation tamper, applied to this run's schedule: BCA-102 moved onto BCA-101's slot and room, MCA-102P moved into the 50-seat LAB-50, and a duplicate assignment added for BCA-301.",
        facts: [
          { label: "BCA-101 ↔ BCA-102 shared students", value: String(model40) },
          { label: "MCA-102P enrolled", value: String(model.graph.studentCount[model.examIndex.get("MCA-102P")!]) },
          { label: "LAB-50 capacity", value: String(model.rooms[model.roomIndex.get("LAB-50")!].capacity) },
          { label: "Duplicate assignment", value: "BCA-301 → D3-E, R-120" },
        ],
      },
    };
  }

  if (scenario === "COMBINED") {
    const parts = (["STUDENT_OVERLAP", "ROOM_CAPACITY_EXCEEDED", "ROOM_TYPE_MISMATCH"] as const).map((s) => ({ s, part: INJECTORS[s](ctx, {}) })).filter((p) => p.part);
    if (parts.length < 2) throw new DemoScenarioError("SCENARIO_UNAVAILABLE", "This dataset does not offer two independent violations to combine.");
    return {
      candidate,
      injection: {
        scenario, title: meta.title, origin: "derived-from-data", targetCodes: parts.flatMap((p) => SCENARIO_META[p.s].targets),
        description: `${parts.length} independent injections on different exams: ${parts.map((p) => SCENARIO_META[p.s].title.toLowerCase()).join(", ")}. ${parts.map((p) => p.part!.description).join(" ")}`,
        changes: parts.flatMap((p) => p.part!.changes),
        facts: parts.flatMap((p) => p.part!.facts.slice(0, 3).map((f) => ({ ...f, label: `${SCENARIO_META[p.s].title}: ${f.label}` }))),
      },
    };
  }

  const part = INJECTORS[scenario](ctx, targets);
  if (!part) throw new DemoScenarioError("SCENARIO_UNAVAILABLE", `This dataset and schedule offer no way to inject a ${meta.title.toLowerCase()} on its own.`);
  return { candidate, injection: { scenario, title: meta.title, origin: "derived-from-data", targetCodes: meta.targets, ...part } };
}

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

const EXPLANATION: Record<ViolationCode, string> = {
  MISSING_ASSIGNMENT: "Every examination must have a slot and a room before the timetable can be published.",
  STUDENT_OVERLAP: "These two examinations share enrolled students and overlap in the same time period. Assign them to different compatible time slots.",
  ROOM_DOUBLE_BOOKED: "One room cannot host two examinations at overlapping times. Move one of them to another free room or slot.",
  ROOM_CAPACITY_EXCEEDED: "This examination exceeds the selected room's capacity. Choose a room with sufficient seats or review the underlying enrollment requirements.",
  ROOM_TYPE_MISMATCH: "This examination's room-type requirement is not met: practical exams need a laboratory and theory exams use lecture rooms.",
  FIXED_SLOT_VIOLATED: "This examination is fixed to a specific slot by an administrative rule and must be held there.",
  EXAM_SLOT_UNAVAILABLE: "This examination is marked unavailable in the assigned slot.",
  ROOM_SLOT_UNAVAILABLE: "The assigned room is blocked in this slot.",
  DURATION_EXCEEDS_SLOT: "The examination is longer than the slot it was placed in.",
  UNKNOWN_REFERENCE: "The assignment points at an exam, room or slot that does not exist in the current data.",
  DUPLICATE_ASSIGNMENT: "An examination may hold exactly one (slot, room) assignment.",
};

export interface ExplainedViolation extends Violation {
  ruleLabel: string;
  explanation: string;
  /** Hard constraints block publication; the validator has no softer severity. */
  severity: "hard";
  facts: { label: string; value: string }[];
  /** Concrete alternatives computed from the candidate, e.g. rooms that are free and large enough in that slot. */
  alternatives: string[];
}

export function explainViolations(model: SchedulingModel, candidate: Assignment[], report: ValidationReport): ExplainedViolation[] {
  return report.violations.map((v) => {
    const facts: { label: string; value: string }[] = [];
    const alternatives: string[] = [];
    const e = v.examIds[0] !== undefined ? model.examIndex.get(v.examIds[0]) : undefined;
    const room = v.roomIds[0] !== undefined ? model.rooms[model.roomIndex.get(v.roomIds[0]) ?? -1] : undefined;
    const slotIdx = v.slotIds[0] !== undefined ? model.slotIndex.get(v.slotIds[0]) : undefined;
    const freeRooms = (exam: number, s: number) => {
      const occ = occupancyWithout(model, candidate, [model.exams[exam].id]);
      return model.suitableRooms[exam].filter((r) => occ.roomFree(r, s)).slice(0, 4).map((r) => `${model.rooms[r].id} (${model.rooms[r].capacity} seats, ${model.rooms[r].roomType})`);
    };
    switch (v.code) {
      case "STUDENT_OVERLAP": {
        facts.push({ label: "Shared students", value: String(v.studentCount ?? "—") }, { label: "Exams", value: v.examIds.join(" and ") }, { label: "Slots", value: v.slotIds.join(", ") });
        const b = v.examIds[1] !== undefined ? model.examIndex.get(v.examIds[1]) : undefined;
        if (b !== undefined) {
          const occ = occupancyWithout(model, candidate, [v.examIds[1]]);
          for (const s of model.candidateSlots[b]) if (occ.studentsFree(b, s) && occ.bestFitRoom(b, s) !== -1) alternatives.push(`${v.examIds[1]} → ${model.slots[s].id}`);
        }
        break;
      }
      case "ROOM_CAPACITY_EXCEEDED":
        if (e !== undefined && room) {
          facts.push({ label: "Enrolled students", value: String(model.graph.studentCount[e]) }, { label: "Room capacity", value: `${room.id}: ${room.capacity} seats` }, { label: "Overflow", value: String(model.graph.studentCount[e] - room.capacity) });
          if (slotIdx !== undefined) alternatives.push(...freeRooms(e, slotIdx));
        }
        break;
      case "ROOM_TYPE_MISMATCH":
        if (e !== undefined && room) {
          facts.push({ label: "Required", value: model.exams[e].requiredRoomType }, { label: "Assigned room", value: `${room.id} (${room.roomType})` }, { label: "Students", value: String(model.graph.studentCount[e]) });
          if (slotIdx !== undefined) alternatives.push(...freeRooms(e, slotIdx));
        }
        break;
      case "ROOM_DOUBLE_BOOKED": {
        if (room) facts.push({ label: "Room", value: `${room.id} (${room.capacity} seats)` }, { label: "Exams", value: v.examIds.join(" and ") }, { label: "Slots", value: v.slotIds.join(", ") });
        const b = v.examIds[1] !== undefined ? model.examIndex.get(v.examIds[1]) : undefined;
        const bSlot = candidate.find((a) => a.examId === v.examIds[1])?.slotId;
        const bs = bSlot !== undefined ? model.slotIndex.get(bSlot) : undefined;
        if (b !== undefined && bs !== undefined) alternatives.push(...freeRooms(b, bs).map((label) => `${v.examIds[1]} → ${label}`));
        break;
      }
      case "FIXED_SLOT_VIOLATED":
        if (e !== undefined) facts.push({ label: "Fixed slot", value: model.exams[e].fixedSlotId ?? "—" }, { label: "Assigned slot", value: v.slotIds[0] });
        break;
      case "EXAM_SLOT_UNAVAILABLE":
        if (e !== undefined) facts.push({ label: "Unavailable slots", value: model.exams[e].unavailableSlotIds.join(", ") }, { label: "Assigned slot", value: v.slotIds[0] });
        break;
      case "ROOM_SLOT_UNAVAILABLE":
        if (room) facts.push({ label: "Room", value: room.id }, { label: "Room unavailable in", value: room.unavailableSlotIds.join(", ") });
        break;
      case "DUPLICATE_ASSIGNMENT":
        facts.push({ label: "Assignments for this exam", value: String(candidate.filter((a) => a.examId === v.examIds[0]).length) });
        break;
      default:
        break;
    }
    return { ...v, ruleLabel: VALIDATION_RULES.find((r) => r.rule === v.rule)!.label, explanation: EXPLANATION[v.code], severity: "hard" as const, facts, alternatives };
  });
}

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

/**
 * Re-places only the tampered exams, with every other assignment pinned. Each
 * exam keeps its current slot if that slot is permitted, student-free and has
 * a suitable free room (so a room problem is fixed by a room change); otherwise
 * it takes the earliest permitted slot that works. The checks are the model's
 * own (`Occupancy`), the same ones the solvers use; the validator judges the
 * result independently afterwards. An exam that cannot be placed is left out
 * and reported, never forced.
 */
export function repairCandidate(model: SchedulingModel, candidate: Assignment[], examIds: string[]) {
  const touched = [...new Set(examIds)];
  const kept = candidate.filter((a) => !touched.includes(a.examId)).map(plain);
  const occ = occupancyWithout(model, kept, []);
  const steps: { examId: string; to: { slotId: string; roomId: string } | null; note: string }[] = [];
  for (const examId of touched) {
    const e = model.examIndex.get(examId);
    if (e === undefined) { steps.push({ examId, to: null, note: "Not an examination in this dataset; dropped." }); continue; }
    const current = candidate.find((a) => a.examId === examId);
    const currentSlot = current ? model.slotIndex.get(current.slotId) : undefined;
    const order = [...(currentSlot !== undefined && model.candidateSlots[e].includes(currentSlot) ? [currentSlot] : []), ...model.candidateSlots[e].filter((s) => s !== currentSlot)];
    let placed = false;
    for (const s of order) {
      if (!occ.studentsFree(e, s)) continue;
      const r = occ.bestFitRoom(e, s);
      if (r === -1) continue;
      occ.assign(e, s, r);
      const to = { slotId: model.slots[s].id, roomId: model.rooms[r].id };
      kept.push({ examId, ...to });
      steps.push({ examId, to, note: s === currentSlot ? `Kept ${to.slotId}; best-fit room ${to.roomId} (${model.rooms[r].capacity} seats for ${model.graph.studentCount[e]}).` : `Moved to ${to.slotId}, the earliest permitted slot with no student clash; best-fit room ${to.roomId}.` });
      placed = true;
      break;
    }
    if (!placed) steps.push({ examId, to: null, note: "No permitted slot has both no student clash and a free suitable room with the other exams pinned; left unscheduled." });
  }
  return { assignments: kept, steps };
}

export interface AssignmentDiff {
  examId: string;
  before: string[];
  after: string[];
}

/** Per-exam differences between two assignment lists, as "slot / room" labels. */
export function diffAssignments(before: Assignment[], after: Assignment[]): AssignmentDiff[] {
  const group = (list: Assignment[]) => {
    const map = new Map<string, string[]>();
    for (const a of list) map.set(a.examId, [...(map.get(a.examId) ?? []), `${a.slotId} / ${a.roomId}`]);
    return map;
  };
  const b = group(before), a = group(after);
  return [...new Set([...b.keys(), ...a.keys()])].sort()
    .map((examId) => ({ examId, before: b.get(examId) ?? [], after: a.get(examId) ?? [] }))
    .filter((d) => d.before.join("|") !== d.after.join("|"));
}

// ---------------------------------------------------------------------------
// Full simulation
// ---------------------------------------------------------------------------

export interface SimulationRequest {
  scenario: DemoScenario;
  baselineAlgorithm: AlgorithmId;
  targets?: DemoTargets;
  resolution?: { strategy: DemoResolution; algorithm?: AlgorithmId };
}

function candidateStatus(dataset: PreparedDataset, assignments: Assignment[]) {
  const validation = validateSchedule(dataset.input, assignments);
  const placedIds = new Set(assignments.map((a) => a.examId));
  const unscheduled = dataset.model.exams.filter((exam) => !placedIds.has(exam.id)).map((exam) => exam.id);
  const { outcome } = classifyOutcome(validation, { unscheduledExamIds: unscheduled, stop: unscheduled.length ? "heuristic-gave-up" : "complete" });
  return { assignments, validation, unscheduled, outcome, explained: explainViolations(dataset.model, assignments, validation) };
}

/** The real publication gate applied to a sandbox candidate, plus the reason no sandbox candidate is ever publishable. */
function publication(status: ReturnType<typeof candidateStatus>, source: DemoSource) {
  const gate = publishGate({
    source: "engine", outcome: status.outcome, storedValid: status.validation.valid,
    liveValidation: { valid: status.validation.valid, violationCount: status.validation.violationCount },
    invigilation: null, isActivePublication: false,
  });
  return {
    gate,
    publishable: false as const,
    sandboxReason: `Sandbox candidates are never saved, so they cannot be published. ${gate.allowed ? "This candidate would satisfy the publication gate's schedule checks" : "This candidate would also be refused by the publication gate"}${source === "fixture" ? " (judged against the Test Lab fixture, not the live data)" : ""}. To publish, generate and save a run in the Optimization Lab, then publish it from the Timetable, where the gate is re-evaluated on fresh data.`,
  };
}

/**
 * Baseline → injected candidate → validation → optional correction → revalidation.
 * Deterministic for a given input and request, and stateless: "reset" is simply
 * running it again without the injection.
 */
export function simulate(input: SchedulingInput, request: SimulationRequest, config: EngineConfig, source: DemoSource) {
  const dataset = prepareDataset(cloneInput(input));
  const baseline = runAlgorithm(dataset, request.baselineAlgorithm, config);
  const base = { assignments: baseline.assignments.map(plain), outcome: baseline.outcome, validation: baseline.validation, algorithm: baseline.algorithm, durationMs: baseline.durationMs, searchNodes: baseline.searchNodes };
  if (baseline.outcome !== "FEASIBLE") {
    throw new DemoScenarioError("BASELINE_NOT_FEASIBLE", `${baseline.algorithmName} did not produce a validator-approved schedule on this dataset (${baseline.outcome}), so there is no valid source schedule to tamper with. Choose another baseline algorithm.`);
  }

  const { candidate, injection } = injectScenario(dataset.model, base.assignments, request.scenario, request.targets ?? {}, source);
  const injected = candidateStatus(dataset, candidate);
  const hitTarget = injected.validation.violations.some((v) => injection.targetCodes.includes(v.code));

  let resolution = null;
  if (request.resolution) {
    const { strategy } = request.resolution;
    let after: Assignment[], steps: { examId: string; to: { slotId: string; roomId: string } | null; note: string }[] = [], summary: string;
    let regenerated: { algorithm: AlgorithmId; outcome: string; durationMs: number; searchNodes: number | null } | null = null;
    const touched = injection.changes.map((c) => c.examId);
    if (strategy === "restore") {
      const restored = candidate.filter((a, i, all) => all.findIndex((x) => x.examId === a.examId) === i).map((a) => touched.includes(a.examId) ? base.assignments.find((b) => b.examId === a.examId)! : a);
      after = restored.map(plain);
      summary = `Restored the source placement of ${touched.length === 1 ? touched[0] : `${new Set(touched).size} exams`} and dropped any extra assignments.`;
    } else if (strategy === "repair") {
      const repaired = repairCandidate(dataset.model, candidate, touched);
      after = repaired.assignments; steps = repaired.steps;
      summary = `Re-placed only the tampered exam${new Set(touched).size === 1 ? "" : "s"} (${[...new Set(touched)].join(", ")}) with every other assignment pinned, using the scheduler's own clash and best-fit room checks.`;
    } else {
      const algorithm = request.resolution.algorithm ?? request.baselineAlgorithm;
      const run = runAlgorithm(prepareDataset(cloneInput(input)), algorithm, config);
      after = run.assignments.map(plain);
      regenerated = { algorithm, outcome: run.outcome, durationMs: run.durationMs, searchNodes: run.searchNodes };
      summary = `Discarded the candidate and re-ran ${run.algorithmName} on the clean sandbox input (${run.outcome}).`;
    }
    const corrected = candidateStatus(dataset, after);
    resolution = {
      strategy, summary, steps, regenerated, corrected,
      changedFromInjected: diffAssignments(candidate, after),
      changedFromSource: diffAssignments(base.assignments, after),
      resolved: corrected.validation.valid,
      publication: publication(corrected, source),
    };
  }

  return {
    fingerprint: dataset.fingerprint,
    baseline: base,
    injection,
    injected: { ...injected, hitTarget, changedFromSource: diffAssignments(base.assignments, candidate), publication: publication(injected, source) },
    resolution,
  };
}

// ---------------------------------------------------------------------------
// Scenario H: a genuine bottleneck, proven by preflight
// ---------------------------------------------------------------------------

/**
 * Builds an in-memory variant of the input with fewer time slots than the
 * largest clique of mutually conflicting exams, keeping every fixed slot and
 * dropping references to removed slots. Preflight must then prove
 * infeasibility by a necessary condition, without running any solver. For
 * contrast, backtracking on the unchanged input with a tiny node budget stops
 * at SEARCH_LIMIT, which proves nothing. Restoring the slots is the correction.
 */
export function bottleneckScenario(input: SchedulingInput, config: EngineConfig) {
  const clean = prepareDataset(cloneInput(input));
  const clique = clean.graph.cliqueExamIds;
  const keep = clique.length - 1;
  const ordered = [...clean.input.slots].sort(compareSlots);
  const fixed = new Set(clean.input.exams.map((e) => e.fixedSlotId).filter((id): id is string => Boolean(id)));
  if (clique.length < 2 || fixed.size > keep) throw new DemoScenarioError("SCENARIO_UNAVAILABLE", "This dataset's conflict structure cannot be squeezed into a bottleneck without also breaking its fixed-slot rules.");
  const kept = new Set([...fixed, ...ordered.filter((slot) => !fixed.has(slot.id)).slice(0, keep - fixed.size).map((slot) => slot.id)]);
  const removed = ordered.filter((slot) => !kept.has(slot.id)).map((slot) => slot.id);
  const variantInput = cloneInput(input);
  variantInput.slots = variantInput.slots.filter((slot) => kept.has(slot.id));
  const strip = (ids: string[]) => ids.filter((id) => kept.has(id));
  for (const e of variantInput.exams) e.unavailableSlotIds = strip(e.unavailableSlotIds);
  for (const r of variantInput.rooms) r.unavailableSlotIds = strip(r.unavailableSlotIds);
  for (const f of variantInput.invigilators ?? []) f.unavailableSlotIds = strip(f.unavailableSlotIds);
  const variant = prepareDataset(variantInput);

  const runs = ALGORITHM_IDS.map((id) => runAlgorithm(variant, id, config)).map((r) => ({
    algorithm: r.algorithm, outcome: r.outcome, evidence: r.infeasibilityEvidence, solverRan: r.solverRan, assignments: r.assignments.length,
  }));
  const limited = runAlgorithm(prepareDataset(cloneInput(input)), "BACKTRACKING", mergeConfig({ ...config, maxNodes: 5 }));
  const corrected = runAlgorithm(prepareDataset(cloneInput(input)), "BACKTRACKING", config);
  return {
    clique: { size: clique.length, examIds: clique },
    slots: { original: clean.input.slots.length, kept: [...kept].sort(), removed, disjointBefore: maxDisjointSlots(clean.model), disjointAfter: maxDisjointSlots(variant.model) },
    description: `The largest group of exams that all share students pairwise has ${clique.length} members, so any timetable needs at least ${clique.length} non-overlapping slots. This in-memory variant keeps only ${kept.size} slot${kept.size === 1 ? "" : "s"} (every fixed slot included). Nothing in the database changes.`,
    preflight: variant.preflight.diagnostics,
    provenInfeasible: variant.preflight.provenInfeasible,
    runs,
    contrast: {
      outcome: limited.outcome, evidence: limited.infeasibilityEvidence, nodes: limited.searchNodes,
      message: "Same backtracking on the original input with a 5-node budget: it stops early and reports SEARCH_LIMIT. That says nothing about whether a timetable exists.",
    },
    corrected: {
      outcome: corrected.outcome, placed: corrected.assignments.length, total: corrected.totalExams, valid: corrected.validation?.valid ?? false, searchNodes: corrected.searchNodes,
      message: `With all ${clean.input.slots.length} slots restored, backtracking finds a schedule and the validator ${corrected.validation?.valid ? "passes it" : "rejects it"}.`,
    },
  };
}
