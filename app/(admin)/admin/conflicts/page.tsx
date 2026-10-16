import { ConflictAnalysis } from "@/components/scheduling/conflict-analysis";

export const metadata = {
  title: "Conflict Analysis | ExamOpt Studio",
  description: "The student examination conflict graph built from actual enrollments.",
};

export default function ConflictsPage() {
  return <ConflictAnalysis />;
}
