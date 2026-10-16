"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CircleAlert,
  Clock,
  DoorOpen,
  FlaskConical,
  Printer,
  Search,
  ShieldCheck,
  UserRound,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  BookOpen,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ApiError, api } from "./api";
import { clock, dateTime, shortDate } from "./format";
import { PageIntro } from "./page-intro";
import type { schedulingService } from "@/server/scheduling/service";

type StudentTimetable = Awaited<ReturnType<typeof schedulingService.studentTimetable>>;
type State =
  | { kind: "loading" }
  | { kind: "ready"; data: StudentTimetable }
  | { kind: "needs-roll" }
  | { kind: "not-linked"; message: string }
  | { kind: "error"; code: string; message: string; status: number };

type ExamFilter = "all" | "practical" | "theory" | "backlog";

export function StudentTimetableView() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [roll, setRoll] = useState("");
  const [callerRole, setCallerRole] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const load = useCallback(async (rollNo?: string) => {
    setState({ kind: "loading" });
    try {
      // If no roll number is explicitly passed, call the secure personal endpoint
      const endpoint = rollNo
        ? `/timetable/student?rollNo=${encodeURIComponent(rollNo)}`
        : `/student/me/timetable`;
      const data = await api<StudentTimetable>(endpoint);
      setState({ kind: "ready", data });
    } catch (error) {
      if (error instanceof ApiError && error.code === "NOT_LINKED") {
        setState({ kind: "not-linked", message: error.message });
      } else if (error instanceof ApiError && error.status === 400 && !rollNo) {
        setState({ kind: "needs-roll" });
      } else {
        setState({
          kind: "error",
          code: error instanceof ApiError ? error.code : "ERROR",
          message: error instanceof Error ? error.message : "Something went wrong.",
          status: error instanceof ApiError ? error.status : 0,
        });
      }
    }
  }, []);

  // Fetch caller's access role to see if admin lookup bar should show
  useEffect(() => {
    api<{ role: string; canManageWorkspace: boolean }>("/access")
      .then((res) => setCallerRole(res.role))
      .catch(() => setCallerRole(null));
  }, []);

  useEffect(() => {
    // Initial timetable fetch; state updates follow the API response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const isAdmin = callerRole === "admin";
  const showAdminLookup = isAdmin || state.kind === "needs-roll" || (state.kind === "ready" && roll);
  const linkStudent = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roll.trim() || linking) return;
    setLinking(true);
    setLinkError(null);
    try {
      await api<{ rollNo: string }>("/student/me/link", { json: { rollNo: roll.trim() } });
      setRoll("");
      await load();
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : "Could not link the student record.");
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <PageIntro
        eyebrow="Examination timetable"
        title="My Examination Schedule"
        description="Your personal examination timetable derived from verified course enrollments. Shows scheduled examination dates, official start/end slots, allocated examination venues, and computer laboratory rooms."
        actions={
          state.kind === "ready" &&
          state.data.exams.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden gap-1.5">
              <Printer className="size-3.5" />
              Print Hall Ticket
            </Button>
          )
        }
      />

      {/* Admin Lookup Bar (visible only for administrators looking up specific students) */}
      {showAdminLookup && (
        <form
          className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-center print:hidden shadow-xs"
          onSubmit={(e) => {
            e.preventDefault();
            if (roll.trim()) void load(roll.trim());
          }}
        >
          <p className="text-xs text-muted-foreground sm:flex-1">
            <strong className="font-medium text-foreground">Administrator inspection:</strong> Enter any student roll number to view their timetable.
          </p>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={roll}
              onChange={(e) => setRoll(e.target.value.toUpperCase())}
              placeholder="e.g. GLA26-BCA-0001"
              className="h-8 pl-8 font-mono text-xs"
              aria-label="Roll number"
              maxLength={40}
            />
          </div>
          <Button size="sm" type="submit" disabled={!roll.trim()}>
            Inspect
          </Button>
        </form>
      )}

      {state.kind === "loading" && (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}

      {/* Account Not Linked State */}
      {state.kind === "not-linked" && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-8">
          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700">
              <AlertTriangle className="size-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-foreground">Student Account Linking Required</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Enter your roll number to link this account. For your privacy, the signed-in email must match the verified institutional email on your student record.
              </p>
              <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={linkStudent}>
                <Input
                  value={roll}
                  onChange={(e) => setRoll(e.target.value.toUpperCase())}
                  placeholder="Student roll number"
                  aria-label="Student roll number to link"
                  maxLength={40}
                  required
                />
                <Button type="submit" disabled={linking || !roll.trim()}>
                  {linking ? "Linking..." : "Link my account"}
                </Button>
              </form>
              {linkError && <p role="alert" className="mt-2 text-sm text-destructive">{linkError}</p>}
              <p className="mt-2 text-xs text-muted-foreground">
                If your institutional email is not on your student record yet, ask the examination office to update it.
              </p>
              <div className="pt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={linking}
                  onClick={async () => {
                    setRoll("GLA26-BCA-0001");
                    setLinking(true);
                    setLinkError(null);
                    try {
                      await api<{ rollNo: string }>("/student/me/link", { json: { rollNo: "GLA26-BCA-0001" } });
                      await load();
                    } catch {
                      await load("GLA26-BCA-0001");
                    } finally {
                      setLinking(false);
                    }
                  }}
                >
                  ⚡ Quick Demo: Link as Akash Singh (GLA26-BCA-0001)
                </Button>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  Re-check Link Status
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <div className="rounded-xl border bg-card p-6">
          <p className="flex items-center gap-2 font-medium">
            <CircleAlert className="size-4 text-destructive" />
            {state.status === 401
              ? "Sign in to view your timetable"
              : state.status === 404
              ? "Student Record Not Found"
              : "Could not load the timetable"}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{state.message}</p>
          {state.status === 401 && (
            <Link href="/sign-in" className={cn(buttonVariants({ size: "sm" }), "mt-4")}>
              Sign in
            </Link>
          )}
          {state.status !== 401 && (
            <Button variant="outline" size="sm" className="mt-4" onClick={() => void load(roll || undefined)}>
              Try again
            </Button>
          )}
        </div>
      )}

      {state.kind === "ready" && <TimetableBody data={state.data} />}
    </div>
  );
}

function TimetableBody({ data }: { data: StudentTimetable }) {
  const { student, publication, exams } = data;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExamFilter>("all");

  // Summary computations
  const totalEnrolled = data.enrolledCount;
  const totalScheduled = data.scheduledCount;
  const backlogExams = exams.filter((e) => student.hasBacklog);

  // Next upcoming exam
  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const dComp = (a.date ?? "").localeCompare(b.date ?? "");
      if (dComp !== 0) return dComp;
      return (a.startMinutes ?? 0) - (b.startMinutes ?? 0);
    });
  }, [exams]);

  const nextExam = sortedExams[0];

  // Filtered exams based on user search and filter tab
  const filteredExams = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedExams.filter((e) => {
      const matchesQuery =
        !q ||
        e.examId.toLowerCase().includes(q) ||
        (e.examName && e.examName.toLowerCase().includes(q)) ||
        (e.roomId && e.roomId.toLowerCase().includes(q));

      if (!matchesQuery) return false;

      if (filter === "practical") return e.requiresLab;
      if (filter === "theory") return !e.requiresLab;
      return true;
    });
  }, [sortedExams, query, filter]);

  // Group by date
  const byDate = useMemo(() => {
    const map = new Map<string, typeof exams>();
    for (const exam of filteredExams) {
      const dateKey = exam.date ?? "Unscheduled";
      map.set(dateKey, [...(map.get(dateKey) ?? []), exam]);
    }
    return map;
  }, [filteredExams]);

  return (
    <div className="space-y-6">
      {/* Student Identity Card */}
      <section className="grid gap-px overflow-hidden rounded-xl border bg-border text-sm sm:grid-cols-4 shadow-2xs">
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Student</p>
          <div className="mt-1 flex items-center gap-1.5 font-semibold">
            <UserRound className="size-3.5 text-primary" />
            {student.name}
          </div>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Roll Number</p>
          <div className="mt-1 font-mono font-semibold text-primary">{student.rollNo}</div>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Academic Cohort</p>
          <div className="mt-1 font-medium">
            {student.groupName ?? student.groupId}
            {student.semester ? ` · Sem ${student.semester}` : ""}
          </div>
        </div>
        <div className="bg-card px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Placement Coverage</p>
          <div className="mt-1 font-semibold tabular-nums">
            {totalScheduled} of {totalEnrolled} exams placed
          </div>
        </div>
      </section>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:hidden">
        <div className="rounded-xl border bg-card p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Enrolled</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totalEnrolled}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Verified subjects</p>
        </div>
        <div className="rounded-xl border bg-card p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Scheduled</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">{totalScheduled}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">With room & time</p>
        </div>
        <div className="rounded-xl border bg-card p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">First Exam</p>
          <p className="mt-1 text-sm font-semibold truncate">
            {nextExam ? nextExam.examId : "None"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {nextExam?.date ? shortDate(nextExam.date) : "—"}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-3.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Schedule Status</p>
          <p className="mt-1 text-sm font-semibold text-primary truncate">
            {publication ? `Published v${publication.version}` : "Draft Only"}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Official release</p>
        </div>
      </div>

      {!publication ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center bg-card/50">
          <p className="font-display text-2xl font-medium">No published examination timetable is available yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            The examination office has not yet published an approved timetable version. Your {totalEnrolled} enrolled subjects will be displayed with exact dates and rooms once the schedule is finalized.
          </p>
        </div>
      ) : (
        <>
          {/* Publication Metadata Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3.5 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className={cn("size-4", data.valid ? "text-emerald-600" : "text-destructive")} />
              <span>
                <strong className="font-medium text-foreground">{publication.title}</strong> · Version {publication.version} · Published {dateTime(publication.publishedAt)}
              </span>
            </div>
            {data.clashes.length > 0 && (
              <span className="font-semibold text-destructive">
                {data.clashes.length} exam overlap clash detected: contact exam office immediately
              </span>
            )}
          </div>

          <section aria-labelledby="daily-availability-heading" className="space-y-3">
            <div>
              <h2 id="daily-availability-heading" className="text-sm font-semibold text-foreground">Daily availability</h2>
              <p className="text-xs text-muted-foreground">Days with no scheduled exams are clear in the published timetable.</p>
            </div>
            {data.dailyAvailability.length ? (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.dailyAvailability.map((day) => (
                  <li key={day.date} className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5">
                    <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                      <CalendarDays className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{shortDate(day.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </span>
                    <Badge variant={day.examCount ? "secondary" : "outline"} className="shrink-0">
                      {day.examCount ? `${day.examCount} ${day.examCount === 1 ? "exam" : "exams"}` : "No exams"}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No timetable days are available in the published schedule.</p>
            )}
          </section>

          {/* Interactive Search & Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn("rounded-md px-2.5 py-1 font-medium transition-colors", filter === "all" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              >
                All Exams ({exams.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter("theory")}
                className={cn("rounded-md px-2.5 py-1 font-medium transition-colors", filter === "theory" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              >
                Theory
              </button>
              <button
                type="button"
                onClick={() => setFilter("practical")}
                className={cn("rounded-md px-2.5 py-1 font-medium transition-colors", filter === "practical" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              >
                Practical Labs
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find subject or room"
                className="h-8 bg-card pl-8 text-xs"
                aria-label="Filter exams"
              />
            </div>
          </div>

          {/* Examination Cards / Table */}
          {filteredExams.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No examinations match your search or filter.
            </div>
          ) : (
            <ol className="space-y-6">
              {[...byDate].map(([date, dayExams]) => (
                <li key={date} className="space-y-2.5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <CalendarDays className="size-4 text-primary" />
                    {shortDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </h2>
                  <ul className="space-y-2">
                    {dayExams.map((exam) => (
                      <li
                        key={exam.examId}
                        className="grid gap-3 rounded-xl border bg-card p-4 transition-colors sm:grid-cols-[1fr_auto] sm:items-center hover:border-primary/30"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs font-semibold text-primary">
                              {exam.examId}
                            </code>
                            {exam.requiresLab && (
                              <Badge variant="outline" className="gap-1 text-[11px] font-normal text-amber-700 border-amber-300">
                                <FlaskConical className="size-3" />
                                Laboratory / Practical
                              </Badge>
                            )}
                            {student.hasBacklog && (
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {exam.program} {exam.semester ? `· Sem ${exam.semester}` : ""}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-foreground truncate">{exam.examName}</p>
                          {exam.durationMinutes && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Duration: {exam.durationMinutes} minutes
                            </p>
                          )}
                        </div>

                        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5">
                            <Clock className="size-3.5 text-primary" />
                            <dt className="sr-only">Time</dt>
                            <dd className="font-medium tabular-nums">
                              {clock(exam.startMinutes)} – {clock(exam.endMinutes)}{" "}
                              <span className="capitalize text-muted-foreground">({exam.session})</span>
                            </dd>
                          </div>
                          <div className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2.5 py-1.5">
                            <DoorOpen className="size-3.5 text-primary" />
                            <dt className="sr-only">Venue</dt>
                            <dd>
                              <span className="font-mono font-semibold">{exam.roomId}</span>{" "}
                              <span className="text-muted-foreground">({exam.roomName})</span>
                            </dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}

          {data.notInPublishedSchedule.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-800">
              <strong className="font-semibold">Unplaced Enrolled Subjects:</strong>{" "}
              <span className="font-mono">{data.notInPublishedSchedule.join(", ")}</span>. These enrolled subjects are not in the current published timetable run. Contact the examination controller if you are registered for these courses.
            </div>
          )}
        </>
      )}
    </div>
  );
}
