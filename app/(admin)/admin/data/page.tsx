import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EXAMOPT_SYSTEM_METADATA } from "@/lib/examopt-data";
import {
  BookOpen,
  DoorOpen,
  Clock,
  Users,
  GraduationCap,
  UserCheck,
  ArrowRight,
  Database,
  Building2,
} from "lucide-react";

export const metadata = {
  title: "Data Management Hub | ExamOpt Studio",
  description: "Manage campus physical venues, curriculums, cohorts, and examinees.",
};

export default function DataManagementHubPage() {
  const meta = EXAMOPT_SYSTEM_METADATA;

  const dataCards = [
    {
      title: "Subjects & Examinations",
      href: "/admin/data/subjects",
      icon: BookOpen,
      count: `${meta.counts.subjects} Courses`,
      detail: "BCA, BCA-DS, MCA (20 Theory + 4 Practical Labs)",
      color: "text-blue-500",
    },
    {
      title: "Rooms & Specialized Labs",
      href: "/admin/data/rooms",
      icon: DoorOpen,
      count: `${meta.counts.rooms} Venues`,
      detail: "1,040 Theory Seats + 440 Specialized Lab Workstations",
      color: "text-purple-500",
    },
    {
      title: "Examination Time Slots",
      href: "/admin/data/time-slots",
      icon: Clock,
      count: `${meta.counts.timeslots} Slots`,
      detail: "5 Examination Days · Morning & Evening Sessions",
      color: "text-indigo-500",
    },
    {
      title: "Student Cohort Groups",
      href: "/admin/data/student-groups",
      icon: Users,
      count: `${meta.counts.student_groups} Sections`,
      detail: "355 Candidates partitioned by academic program",
      color: "text-amber-500",
    },
    {
      title: "Students & Backlog Enrollments",
      href: "/admin/data/students",
      icon: GraduationCap,
      count: `${meta.counts.student_enrollments} Students`,
      detail: `${meta.counts.backlog_students} Backlog students cross-scheduled with zero clashes`,
      color: "text-emerald-500",
    },
    {
      title: "Faculty & Invigilators",
      href: "/admin/data/faculty",
      icon: UserCheck,
      count: `${meta.counts.faculty} Faculty`,
      detail: "Department invigilation duty balancing roster",
      color: "text-rose-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Data Management Workspace
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              GLA University CSED AB-XI
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure foundational datasets for intelligent graph coloring timetable generation.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {dataCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <Card className="h-full hover:border-primary/50 transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {card.count}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold pt-2 group-hover:text-primary transition-colors">
                    {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{card.detail}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                    <span>Manage Dataset</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
