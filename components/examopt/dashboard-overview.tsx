"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, Building2, CalendarDays, Database, KeyRound, Mail, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Metrics = { rooms: { total: number; labs: number; seats: number }; timeSlots: { total: number; available: number }; subjects: { total: number }; studentGroups: { total: number }; students: { total: number; backlogs: number; enrollments: number }; scheduleRuns: { total: number; published: number; activeVersion: number | null }; constraints: { roomBlackouts: number; subjectBlackouts: number }; dataQuality: { status: string; warnings: string[] } };
type DashboardError = { code: string | null; message: string };
type AccessSummary = {
  userId: string | null;
  email: string | null;
  role: "admin" | "user" | "guest";
  permissions: string[];
  canManageWorkspace: boolean;
  profileAvailable: boolean;
};

const cards = [
  { key: "subjects", title: "Subjects", icon: BookOpen, href: "/admin/data/subjects", get: (data: Metrics) => data.subjects.total },
  { key: "rooms", title: "Active rooms", icon: Building2, href: "/admin/data/rooms", get: (data: Metrics) => data.rooms.total, detail: (data: Metrics) => `${data.rooms.labs} laboratories · ${data.rooms.seats} seats` },
  { key: "groups", title: "Student groups", icon: Users, href: "/admin/data/student-groups", get: (data: Metrics) => data.studentGroups.total },
  { key: "slots", title: "Available slots", icon: CalendarDays, href: "/admin/data/time-slots", get: (data: Metrics) => data.timeSlots.available, detail: (data: Metrics) => `${data.timeSlots.total} total` },
];

export function DashboardOverview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [access, setAccess] = useState<AccessSummary | null>(null);
  const [error, setError] = useState<DashboardError | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [response, accessResponse] = await Promise.all([
          fetch("/api/v1/metrics", { cache: "no-store" }),
          fetch("/api/v1/access", { cache: "no-store" }),
        ]);
        const [body, accessBody] = await Promise.all([response.json(), accessResponse.json()]);
        if (active && accessResponse.ok && accessBody.success) setAccess(accessBody.data as AccessSummary);
        if (!response.ok || !body.success) {
          const failure = new Error(body?.error?.message ?? "Unable to load dashboard data.") as Error & { code?: string };
          failure.code = body?.error?.code;
          throw failure;
        }
        if (active) {
          setMetrics(body.data);
          setError(null);
        }
      } catch (cause) {
        if (active) {
          const failure = cause as Error & { code?: string };
          setError({ code: failure.code ?? null, message: failure instanceof Error ? failure.message : "Unable to load dashboard data." });
        }
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  if (error?.code === "FORBIDDEN") return <AdminAccessRequired access={access} onRetry={() => window.location.reload()} />;
  if (error) return <Card className="border-destructive/30"><CardContent className="flex items-center gap-3 p-6 text-sm text-destructive"><AlertTriangle className="size-5" />{error.message}</CardContent></Card>;
  if (!metrics) return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-xl border bg-muted/40" />)}</div>;
  const isReady = metrics.dataQuality.warnings.length === 0;

  return <div className="space-y-7 pb-8">
    <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-start"><div className="max-w-2xl"><Badge variant="outline" className="mb-3 text-primary">GLA HackVision 2.0 · Problem C10</Badge><h1 className="font-display text-3xl font-semibold md:text-4xl">A dependable foundation for examination scheduling.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Rooms, time slots, subjects, groups and enrollments feed three scheduling strategies. Every schedule is checked by an independent validator before it can be published.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link href="/admin/data"><Database /> Data workspace</Link></Button><Button asChild><Link href="/admin/optimization">Optimization Lab</Link></Button></div></div></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{cards.map((card) => <Link key={card.key} href={card.href} className="group"><Card className="h-full transition-colors group-hover:border-primary/40"><CardHeader className="flex flex-row items-center justify-between pb-2"><CardDescription>{card.title}</CardDescription><card.icon className="size-4 text-primary" /></CardHeader><CardContent><p className="text-3xl font-semibold tabular-nums">{card.get(metrics)}</p><p className="mt-1 text-xs text-muted-foreground">{card.detail?.(metrics) ?? "Current database count"}</p></CardContent></Card></Link>)}</div>
    <div className="grid gap-5 lg:grid-cols-3"><Card className="lg:col-span-2"><CardHeader><div className="flex items-center justify-between gap-3"><div><CardTitle className="text-base">Data readiness</CardTitle><CardDescription>Presence checks on the core records. The full data quality report is in the data workspace.</CardDescription></div><Badge variant={isReady ? "secondary" : "outline"}>{isReady ? "Input ready" : "Needs attention"}</Badge></div></CardHeader><CardContent>{isReady ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800">Core room, time-slot, subject, and student-group records are present. You can continue configuring constraints.</div> : <ul className="space-y-2">{metrics.dataQuality.warnings.map((warning) => <li key={warning} className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="size-4 text-amber-500" />{warning}</li>)}</ul>}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Scheduling status</CardTitle><CardDescription>Saved runs and the published timetable.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Saved runs</span><strong>{metrics.scheduleRuns.total}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Published versions</span><strong>{metrics.scheduleRuns.published}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Active version</span><strong>{metrics.scheduleRuns.activeVersion ? `v${metrics.scheduleRuns.activeVersion}` : "none"}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Room blackouts</span><strong>{metrics.constraints.roomBlackouts}</strong></div><div className="flex justify-between"><span className="text-muted-foreground">Subject blackouts</span><strong>{metrics.constraints.subjectBlackouts}</strong></div><Link href="/admin/schedules" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Open timetable <ArrowRight className="size-4" /></Link></CardContent></Card></div>
    <Card><CardHeader><CardTitle className="text-base">Enrollment context</CardTitle><CardDescription>Real counts from normalized student and enrollment records.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div><p className="text-2xl font-semibold">{metrics.students.total}</p><p className="text-xs text-muted-foreground">Students</p></div><div><p className="text-2xl font-semibold">{metrics.students.enrollments}</p><p className="text-xs text-muted-foreground">Subject enrollments</p></div><div><p className="text-2xl font-semibold">{metrics.students.backlogs}</p><p className="text-xs text-muted-foreground">Students with backlog enrollments</p></div></CardContent></Card>
  </div>;
}

function AdminAccessRequired({ access, onRetry }: { access: AccessSummary | null; onRetry: () => void }) {
  const account = access?.email ?? access?.userId ?? "your signed-in account";

  return (
    <Card className="overflow-hidden border-amber-500/30">
      <CardHeader className="border-b bg-amber-500/5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-700"><ShieldAlert className="size-5" /></div>
          <div>
            <CardTitle>Administrator access is required</CardTitle>
            <CardDescription className="mt-1">You are signed in, but this account has not been granted access to manage ExamOpt data.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">
        <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-2">
          <div><p className="text-xs text-muted-foreground">Signed-in account</p><p className="mt-1 break-all font-mono text-sm font-medium">{account}</p></div>
          <div><p className="text-xs text-muted-foreground">Resolved role</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium capitalize"><KeyRound className="size-4 text-muted-foreground" />{access?.role ?? "checking"}</p></div>
        </div>
        <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
          <li className="flex gap-2"><span className="font-semibold text-foreground">1.</span><span>In Vercel’s Production environment, add this exact email to <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">EXAMOPT_ADMIN_EMAILS</code>. Multiple administrators can be separated by commas.</span></li>
          <li className="flex gap-2"><span className="font-semibold text-foreground">2.</span><span>Redeploy, then sign out and sign back in. Alternatively, set this user’s Clerk <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">publicMetadata.role</code> to <code className="rounded bg-muted px-1 py-0.5 text-xs text-foreground">admin</code>.</span></li>
        </ol>
        {access && !access.profileAvailable && <p className="flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-900"><Mail className="mt-0.5 size-4 shrink-0" />The deployed server could not read this Clerk profile. Add the matching <code className="mx-1 rounded bg-background px-1 text-xs">CLERK_SECRET_KEY</code> in Vercel before using email-based access.</p>}
        <Button variant="outline" onClick={onRetry}>Check access again</Button>
      </CardContent>
    </Card>
  );
}
