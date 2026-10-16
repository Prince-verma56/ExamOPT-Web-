import { buildConflictGraph, type ConflictGraph } from "./conflict-graph";
import type { Exam, Room, SchedulingInput, Slot } from "./domain";

/**
 * Indexed form of a scheduling input, built once and shared by every
 * algorithm and by preflight. Duplicate ids keep their first occurrence, and
 * enrollments that reference unknown exams are dropped; preflight reports both.
 */
export interface SchedulingModel {
  exams: Exam[];
  rooms: Room[];
  /** Chronological: date, start time, then id. */
  slots: Slot[];
  examIndex: Map<string, number>;
  roomIndex: Map<string, number>;
  slotIndex: Map<string, number>;
  graph: ConflictGraph;
  /** slotOverlap[s][t] is true when the two slots share any time (always true for s === t). */
  slotOverlap: boolean[][];
  /** Day number (0-based) of each slot. */
  slotDay: number[];
  /** Slots each exam may use, from fixed slot, unavailability and duration alone. */
  candidateSlots: number[][];
  /** Rooms of the required type with enough seats, smallest capacity first. Availability is checked per slot. */
  suitableRooms: number[][];
  roomUnavailable: boolean[][];
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

export function compareSlots(a: Slot, b: Slot) {
  return a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes || a.id.localeCompare(b.id);
}

export function slotsOverlap(a: Slot, b: Slot) {
  return a.id === b.id || (a.date === b.date && a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes);
}

export function buildModel(input: SchedulingInput): SchedulingModel {
  const exams = dedupeById(input.exams).sort((a, b) => a.id.localeCompare(b.id));
  const rooms = dedupeById(input.rooms).sort((a, b) => a.id.localeCompare(b.id));
  const slots = dedupeById(input.slots).sort(compareSlots);
  const examIndex = new Map(exams.map((exam, i) => [exam.id, i]));
  const roomIndex = new Map(rooms.map((room, i) => [room.id, i]));
  const slotIndex = new Map(slots.map((slot, i) => [slot.id, i]));
  const graph = buildConflictGraph(exams, input.enrollments);

  const slotOverlap = slots.map((a) => slots.map((b) => slotsOverlap(a, b)));
  const dates = [...new Set(slots.map((slot) => slot.date))].sort();
  const slotDay = slots.map((slot) => dates.indexOf(slot.date));
  const roomUnavailable = rooms.map((room) => slots.map((slot) => room.unavailableSlotIds.includes(slot.id)));

  const candidateSlots = exams.map((exam) =>
    slots
      .map((slot, s) => ({ slot, s }))
      .filter(({ slot }) =>
        (exam.fixedSlotId === null || exam.fixedSlotId === slot.id) &&
        !exam.unavailableSlotIds.includes(slot.id) &&
        exam.durationMinutes <= slot.endMinutes - slot.startMinutes,
      )
      .map(({ s }) => s),
  );

  const suitableRooms = exams.map((exam, e) =>
    rooms
      .map((room, r) => ({ room, r }))
      .filter(({ room }) => room.roomType === exam.requiredRoomType && room.capacity >= graph.studentCount[e])
      .sort((a, b) => a.room.capacity - b.room.capacity || a.room.id.localeCompare(b.room.id))
      .map(({ r }) => r),
  );

  return { exams, rooms, slots, examIndex, roomIndex, slotIndex, graph, slotOverlap, slotDay, candidateSlots, suitableRooms, roomUnavailable };
}

/**
 * Tracks which (room, slot) pairs and which exam-slot placements are taken
 * while an algorithm builds a schedule.
 */
export class Occupancy {
  /** roomBusy[r][s] counts assignments in room r during slots overlapping s. */
  private roomBusy: number[][];
  readonly slotOf: number[];
  readonly roomOf: number[];

  constructor(private readonly model: SchedulingModel) {
    this.roomBusy = model.rooms.map(() => new Array<number>(model.slots.length).fill(0));
    this.slotOf = new Array<number>(model.exams.length).fill(-1);
    this.roomOf = new Array<number>(model.exams.length).fill(-1);
  }

  roomFree(r: number, s: number) {
    return !this.model.roomUnavailable[r][s] && this.roomBusy[r][s] === 0;
  }

  /** True when no conflicting (student-sharing) exam already sits in an overlapping slot. */
  studentsFree(e: number, s: number) {
    const overlap = this.model.slotOverlap[s];
    return this.model.graph.adjacency[e].every((u) => this.slotOf[u] === -1 || !overlap[this.slotOf[u]]);
  }

  assign(e: number, s: number, r: number) {
    this.slotOf[e] = s;
    this.roomOf[e] = r;
    this.model.slotOverlap[s].forEach((overlaps, t) => { if (overlaps) this.roomBusy[r][t]++; });
  }

  unassign(e: number) {
    const s = this.slotOf[e], r = this.roomOf[e];
    if (s === -1) return;
    this.model.slotOverlap[s].forEach((overlaps, t) => { if (overlaps) this.roomBusy[r][t]--; });
    this.slotOf[e] = -1;
    this.roomOf[e] = -1;
  }

  /** Smallest suitable room that is free for this slot (best fit), or -1. */
  bestFitRoom(e: number, s: number) {
    return this.model.suitableRooms[e].find((r) => this.roomFree(r, s)) ?? -1;
  }

  /** First suitable free room in room-id order, ignoring fit quality. Used by the baseline. */
  firstFitRoom(e: number, s: number) {
    let best = -1;
    for (const r of this.model.suitableRooms[e]) if (this.roomFree(r, s) && (best === -1 || r < best)) best = r;
    return best;
  }
}
