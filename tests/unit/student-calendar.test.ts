import { describe, expect, test } from "vitest";
import { buildStudentDayAvailability } from "@/server/scheduling/student-calendar";

describe("student day availability", () => {
  test("returns chronological unique timetable dates with the student's scheduled exams", () => {
    expect(buildStudentDayAvailability(
      [{ date: "2026-10-20" }, { date: "2026-10-19" }, { date: "2026-10-19" }],
      [
        { examId: "BCA-103", date: "2026-10-20" },
        { examId: "BCA-102", date: "2026-10-19" },
      ]
    )).toEqual([
      { date: "2026-10-19", examIds: ["BCA-102"], examCount: 1, status: "EXAMS_SCHEDULED" },
      { date: "2026-10-20", examIds: ["BCA-103"], examCount: 1, status: "EXAMS_SCHEDULED" },
    ]);
  });

  test("marks dates without a scheduled student exam without implying other commitments", () => {
    expect(buildStudentDayAvailability(
      [{ date: "2026-10-19" }, { date: "2026-10-20" }],
      [{ examId: "BCA-102", date: "2026-10-19" }]
    )[1]).toEqual({
      date: "2026-10-20",
      examIds: [],
      examCount: 0,
      status: "NO_EXAMS_SCHEDULED",
    });
  });
});
