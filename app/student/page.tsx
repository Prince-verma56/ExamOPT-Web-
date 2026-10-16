import { StudentTimetableView } from "@/components/scheduling/student-timetable";

export const metadata = {
  title: "My exams | ExamOpt Studio",
  description: "Your examinations from the published timetable.",
};

export default function StudentPortalPage() {
  return <StudentTimetableView />;
}
