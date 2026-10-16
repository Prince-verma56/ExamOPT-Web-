"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Building2, CalendarDays, Database, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Metrics = { rooms: { total: number; labs: number; seats: number }; timeSlots: { total: number; available: number }; subjects: { total: number }; studentGroups: { total: number }; students: { total: number; backlogs: number; enrollments: number }; scheduleRuns: { total: number; published: number }; constraints: { roomBlackouts: number; subjectBlackouts: number }; dataQuality: { status: string; warnings: string[] } };

const cards = [
  { key: "subjects", title: "Subjects", icon: BookOpen, href: "/admin/data/subjects", get: (data: Metrics) => data.subjects.total },
  { key: "rooms", title: "Active rooms", icon: Building2, href: "/admin/data/rooms", get: (data: Metrics) => data.rooms.total, detail: (data: Metrics) => `${data.rooms.labs} laboratories · ${data.rooms.seats} seats` },
  { key: "groups", title: "Student groups", icon: Users, href: "/admin/data/student-groups", get: (data: Metrics) => data.studentGroups.total },
  { key: "slots", title: "Available slots", icon: CalendarDays, href: "/admin/data/time-slots", get: (data: Metrics) => data.timeSlots.available, detail: (data: Metrics) => `${data.timeSlots.total} total` },
];

export function DashboardOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/v1/metrics", { cache: "no-store" });
        const body = await response.json();
        if (!response.ok || !body.success) throw new Error(body?.error?.message ?? "Unable to load dashboard data.");
        if (active) setMetrics(body.data);
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : "Unable to load dashboard data."); }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (error) return <Card className="border-destructive/30"><CardContent className="flex items-center gap-3 p-6 text-sm text-destructive"><AlertTriangle className="size-5" />{error}</CardContent></Card>;
  if (!metrics) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border bg-muted/40" />)}</div>;
  const isReady = metrics.dataQuality.warnings.length === 0;

  return <div className="space-y-7 pb-8">
    <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div className="max-w-2xl"><Badge variant="outline" className="mb-3 text-primary">GLA HackVision 2.0 · Problem C10</Badge><h1 className="font-display text-3xl font-semibold md:text-4xl">A dependable foundation for examination scheduling.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Prepare real rooms, time slots, subjects, groups, and enrollments before submitting the data to a future optimization engine.</p></div><Button asChild><Link href="/admin/data"><Database /> Open data workspace</Link></Button></div></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card) => <Link key={card.key} href={card.href} className="group"><Card className="h-full transition-colors group-hover:border-primary/40"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{card.title}</CardDescription><card.icon className="size-4 text-primary" /></CardHeader><CardContent><p className="text-3xl font-semibold tabular-nums">{card.get(metrics)}</p><p className="mt-1 text-xs text-muted-foreground">{card.detail?.(metrics) ?? "Current database count"}</p></CardContent></Card></Link>)}</div>
    <div className="grid gap-5 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Data readiness</CardTitle><CardDescription>These checks cover foundational records only; no scheduling result is implied.</CardDescription></div><Badge variant={isReady ? "secondary" : "outline"}>{isReady ? "Input ready" : "Needs attention"}</Badge></div></CardHeader><CardContent>{isReady ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800">Core room, time-slot, subject, and student-group records are present. You can continue configuring constraints.</div> : <ul className="space-y-2">{metrics.dataQuality.warnings.map((warning) => <li key={warning} className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="size-4 text-amber-500" />{warning}</li>)}</ul>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Scheduling status</CardTitle><CardDescription>Phase 2 will introduce the solver and independent schedule validation.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Saved runs</span><strong>{metrics.scheduleRuns.total}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Published runs</span><strong>{metrics.scheduleRuns.published}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Room blackouts</span><strong>{metrics.constraints.roomBlackouts}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Subject blackouts</span><strong>{metrics.constraints.subjectBlackouts}</strong></div><Link href="/admin/constraints" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Review constraints <ArrowRight className="size-4" /></Link></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="text-base">Enrollment context</CardTitle><CardDescription>Real counts from normalized student and enrollment records.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-2xl font-semibold">{metrics.students.total}</p><p className="text-xs text-muted-foreground">Active students</p></div><div><p className="text-2xl font-semibold">{metrics.students.enrollments}</p><p className="text-xs text-muted-foreground">Subject enrollments</p></div><div><p className="text-2xl font-semibold">{metrics.students.backlogs}</p><p className="text-xs text-muted-foreground">Students with backlog enrollments</p></div></CardContent></Card>
  </div>;
}
