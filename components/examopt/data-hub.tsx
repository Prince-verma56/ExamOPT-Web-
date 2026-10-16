"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, CircleAlert, Clock, DoorOpen, GraduationCap, RefreshCw, UserCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "@/components/scheduling/api";
import { num } from "@/components/scheduling/format";
import { PageIntro } from "@/components/scheduling/page-intro";
import { QualityIssues, QualityScore } from "@/components/scheduling/quality-report";
import type { DataQualityReport } from "@/server/scheduling/data-quality";

type Counts = {
  rooms: { total: number; labs: number; seats: number }; timeSlots: { total: number; days: number }; subjects: { total: number; fixedSlots: number };
  studentGroups: { total: number }; students: { total: number; backlogs: number; enrollments: number }; faculty: { total: number };
};

/** Entry point to the data the scheduler reads, with live counts and the data quality report. */
export function DataHub() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [quality, setQuality] = useState<DataQualityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [c, q] = await Promise.all([api<Counts>("/metrics"), api<{ report: DataQualityReport }>("/scheduling/data-quality")]);
      setCounts(c); setQuality(q.report);
    } catch (e) { setError(errorMessage(e)); }
  }, []);

  useEffect(() => {
    // Initial fetch; state is set after the responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const cards = counts ? [
    { title: "Subjects & exams", href: "/admin/data/subjects", icon: BookOpen, value: counts.subjects.total, detail: `${counts.subjects.fixedSlots} with a fixed slot` },
    { title: "Rooms & laboratories", href: "/admin/data/rooms", icon: DoorOpen, value: counts.rooms.total, detail: `${counts.rooms.labs} laboratories · ${num(counts.rooms.seats)} seats` },
    { title: "Time slots", href: "/admin/data/time-slots", icon: Clock, value: counts.timeSlots.total, detail: `${counts.timeSlots.days} examination days` },
    { title: "Student groups", href: "/admin/data/student-groups", icon: Users, value: counts.studentGroups.total, detail: "cohorts and backlog groups" },
    { title: "Students", href: "/admin/data/students", icon: GraduationCap, value: counts.students.total, detail: `${num(counts.students.enrollments)} enrollments · ${counts.students.backlogs} with backlog` },
    { title: "Faculty", href: "/admin/data/faculty", icon: UserCheck, value: counts.faculty.total, detail: "invigilators" },
  ] : [];

  return (
    <div className="space-y-8 pb-8">
      <PageIntro eyebrow="Data workspace" title="Scheduling data" description="Every record here is read directly by the scheduler; there is no separate copy. Counts are live from the database." actions={<Button variant="outline" onClick={() => void load()}><RefreshCw />Reload</Button>} />

      {error && <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!counts && !error && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group rounded-xl border bg-card p-4 transition-colors hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
            <div className="flex items-center justify-between text-sm text-muted-foreground"><span className="flex items-center gap-2"><card.icon className="size-4" />{card.title}</span><ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" /></div>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{num(card.value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
          </Link>
        ))}
      </div>

      <section className="space-y-4 rounded-xl border bg-card p-5" aria-labelledby="quality-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <h2 id="quality-heading" className="text-sm font-semibold">Data quality</h2>
            <p className="mt-1 text-sm text-muted-foreground">Row-level checks ported from the reference validator: duplicate identifiers, invalid values, broken references, contradictory constraints, rooms too small for a course, laboratory bottlenecks and enrollment counts that disagree with the records.</p>
          </div>
          {quality && <QualityScore report={quality} />}
        </div>
        {!quality ? <Skeleton className="h-16" /> : <QualityIssues report={quality} />}
        <p className="text-xs text-muted-foreground">To check a file before importing it, use <Link href="/admin/import" className="text-primary hover:underline">Import & Export</Link>.</p>
      </section>
    </div>
  );
}
