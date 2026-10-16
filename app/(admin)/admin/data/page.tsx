import { DataHub } from "@/components/examopt/data-hub";

export const metadata = {
  title: "Data workspace | ExamOpt Studio",
  description: "Rooms, time slots, subjects, groups, students and faculty: the records the scheduler reads.",
};

export default function DataManagementHubPage() {
  return <DataHub />;
}
