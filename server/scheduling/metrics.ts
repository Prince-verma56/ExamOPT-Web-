import type { Assignment, SchedulingInput, SoftWeights } from "./domain";
import { compareSlots } from "./model";

/**
 * Soft quality metrics. These never affect validity: a schedule with hard
 * violations stays invalid whatever its soft penalty. Formulas are listed in
 * docs/examopt/PHASE_2_AUDIT.md.
 */
export interface PenaltyComponent {
  key: keyof SoftWeights;
  label: string;
  value: number;
  weight: number;
  penalty: number;
}

export interface ScheduleMetrics {
  scheduledExams: number;
  totalExams: number;
  slotsUsed: number;
  totalSlots: number;
  unusedSlots: number;
  daysUsed: number;
  totalDays: number;
  /** Enrolled students / seats in the rooms used, as a percentage. */
  seatFillPct: number;
  /** Empty seats summed over every allocated room. */
  capacityWasteSeats: number;
  /** Sum over student-days of (exams that day - 1). */
  sameDayExtraExams: number;
  studentsWithSameDayExams: number;
  /** Pairs of a student's exams in chronologically adjacent slots. */
  backToBackPairs: number;
  /** Distance, in slots, between each student's consecutive exams. */
  gapHistogram: { adjacent: number; gap2: number; gap3: number; gap4Plus: number };
  averageGapSlots: number;
  /** Slots used / span from first to last used slot. 100% means no idle slot inside the exam window. */
  compactnessPct: number;
  softPenalty: { total: number; components: PenaltyComponent[] };
}

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

export function computeMetrics(input: SchedulingInput, assignments: Assignment[], weights: SoftWeights): ScheduleMetrics {
  const slots = [...input.slots].sort(compareSlots);
  const slotPos = new Map(slots.map((slot, i) => [slot.id, i]));
  const slotDate = new Map(slots.map((slot) => [slot.id, slot.date]));
  const capacity = new Map(input.rooms.map((room) => [room.id, room.capacity]));
  const enrolled = new Map<string, Set<string>>();
  const byStudent = new Map<string, string[]>();
  for (const { studentId, examId } of input.enrollments) {
    if (!enrolled.has(examId)) enrolled.set(examId, new Set());
    enrolled.get(examId)!.add(studentId);
  }
  const slotOfExam = new Map(assignments.map((a) => [a.examId, a.slotId]));
  for (const [examId, studentIds] of enrolled) {
    if (!slotOfExam.has(examId)) continue;
    for (const studentId of studentIds) byStudent.set(studentId, [...(byStudent.get(studentId) ?? []), examId]);
  }

  let seats = 0, students = 0;
  for (const a of assignments) {
    seats += capacity.get(a.roomId) ?? 0;
    students += enrolled.get(a.examId)?.size ?? 0;
  }

  const usedPositions = [...new Set(assignments.map((a) => slotPos.get(a.slotId)).filter((p): p is number => p !== undefined))].sort((a, b) => a - b);
  const span = usedPositions.length ? usedPositions[usedPositions.length - 1] - usedPositions[0] + 1 : 0;
  const days = new Set(assignments.map((a) => slotDate.get(a.slotId)));

  let sameDayExtra = 0, studentsSameDay = 0, backToBack = 0, gapTotal = 0, gapCount = 0;
  const gapHistogram = { adjacent: 0, gap2: 0, gap3: 0, gap4Plus: 0 };
  for (const examIds of byStudent.values()) {
    const positions = examIds.map((id) => slotPos.get(slotOfExam.get(id)!)!).sort((a, b) => a - b);
    const perDay = new Map<string, number>();
    for (const id of examIds) { const date = slotDate.get(slotOfExam.get(id)!)!; perDay.set(date, (perDay.get(date) ?? 0) + 1); }
    let extra = 0;
    for (const count of perDay.values()) extra += Math.max(0, count - 1);
    sameDayExtra += extra;
    if (extra) studentsSameDay++;
    for (let i = 1; i < positions.length; i++) {
      const gap = positions[i] - positions[i - 1];
      if (gap === 1) backToBack++;
      if (gap <= 0) continue;
      gapTotal += gap; gapCount++;
      if (gap === 1) gapHistogram.adjacent++;
      else if (gap === 2) gapHistogram.gap2++;
      else if (gap === 3) gapHistogram.gap3++;
      else gapHistogram.gap4Plus++;
    }
  }

  const waste = seats - students;
  const components: PenaltyComponent[] = [
    { key: "sameDay", label: "Extra same-day exams", value: sameDayExtra, weight: weights.sameDay, penalty: 0 },
    { key: "backToBack", label: "Back-to-back exam pairs", value: backToBack, weight: weights.backToBack, penalty: 0 },
    { key: "capacityWaste", label: "Empty seats (per 100)", value: round(waste / 100), weight: weights.capacityWaste, penalty: 0 },
    { key: "daysUsed", label: "Examination days used", value: days.size, weight: weights.daysUsed, penalty: 0 },
  ].map((c) => ({ ...(c as PenaltyComponent), penalty: round(c.value * c.weight) }));

  return {
    scheduledExams: assignments.length,
    totalExams: input.exams.length,
    slotsUsed: usedPositions.length,
    totalSlots: slots.length,
    unusedSlots: slots.length - usedPositions.length,
    daysUsed: days.size,
    totalDays: new Set(slots.map((slot) => slot.date)).size,
    seatFillPct: seats ? round((students / seats) * 100) : 0,
    capacityWasteSeats: waste,
    sameDayExtraExams: sameDayExtra,
    studentsWithSameDayExams: studentsSameDay,
    backToBackPairs: backToBack,
    gapHistogram,
    averageGapSlots: gapCount ? round(gapTotal / gapCount) : 0,
    compactnessPct: span ? round((usedPositions.length / span) * 100) : 0,
    softPenalty: { total: round(components.reduce((sum, c) => sum + c.penalty, 0)), components },
  };
}
