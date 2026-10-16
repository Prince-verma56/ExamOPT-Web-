import { ConstraintsView } from "@/components/scheduling/constraints-view";

export const metadata = {
  title: "Constraints | ExamOpt Studio",
  description: "The hard rules every schedule must satisfy, the live constraint data, and the soft objectives.",
};

export default function ConstraintsPage() {
  return <ConstraintsView />;
}
