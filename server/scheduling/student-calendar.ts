export type StudentDayStatus = "EXAMS_SCHEDULED" | "NO_EXAMS_SCHEDULED";

export interface StudentDayAvailability {
  date: string;
  examIds: string[];
  examCount: number;
  status: StudentDayStatus;
}

export function buildStudentDayAvailability(
  slots: ReadonlyArray<{ date: string }>,
  exams: ReadonlyArray<{ examId: string; date: string | null }>
): StudentDayAvailability[] {
  const examIdsByDate = new Map<string, string[]>();
  for (const exam of exams) {
    if (!exam.date) continue;
    const examIds = examIdsByDate.get(exam.date) ?? [];
    examIds.push(exam.examId);
    examIdsByDate.set(exam.date, examIds);
  }

  return [...new Set(slots.map((slot) => slot.date))]
    .sort()
    .map((date) => {
      const examIds = examIdsByDate.get(date) ?? [];
      return {
        date,
        examIds,
        examCount: examIds.length,
        status: examIds.length ? "EXAMS_SCHEDULED" : "NO_EXAMS_SCHEDULED",
      };
    });
}
