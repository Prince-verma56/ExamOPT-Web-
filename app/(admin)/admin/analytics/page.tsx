import { AnalyticsView } from "@/components/scheduling/analytics-view";

export const metadata = {
  title: "Analytics | ExamOpt Studio",
  description: "Metrics computed from saved runs and the published timetable.",
};

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
