import { Suspense } from "react";
import { Timetable } from "@/components/scheduling/timetable";

export const metadata = {
  title: "Timetable | ExamOpt Studio",
  description: "Saved examination schedules, independently re-validated against current data.",
};

export default function SchedulesPage() {
  return (
    <Suspense>
      <Timetable />
    </Suspense>
  );
}
