"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CircleAlert, Clock, DoorOpen, FlaskConical, Printer, Search, ShieldCheck, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, api } from "./api";
import { clock, dateTime, shortDate } from "./format";
import { PageIntro } from "./page-intro";
import type { schedulingService } from "@/server/scheduling/service";

type StudentTimetable = Awaited<ReturnType<typeof schedulingService.studentTimetable>>;
type State =
  | { kind: "loading" }
  | { kind: "ready"; data: StudentTimetable }
  | { kind: "needs-roll" }
  | { kind: "error"; code: string; message: string; status: number };

/**
 * A student's own published exams. The server decides whose timetable is
 * returned: students get the roll number linked to their account, and only
 * administrators can look up another roll number.
 */
export function StudentTimetableView() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [roll, setRoll] = useState("");

  const load = useCallback(async (rollNo?: string) => {
    setState({ kind: "loading" });
    try {
      const data = await api<StudentTimetable>(`/timetable/student${rollNo ? `?rollNo=${encodeURIComponent(rollNo)}` : ""}`);
      setState({ kind: "ready", data });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400 && !rollNo) setState({ kind: "needs-roll" });
      else setState({ kind: "error", code: error instanceof ApiError ? error.code : "ERROR", message: error instanceof Error ? error.message : "Something went wrong.", status: error instanceof ApiError ? error.status : 0 });
    }
  }, []);

  useEffect(() => {
    // Initial fetch of the caller's own timetable; state is set after the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const lookup = state.kind === "needs-roll" || (state.kind === "ready" && state.data && roll) || (state.kind === "error" && state.status !== 401 && state.code !== "NOT_LINKED" && roll);

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:px-6">
      <PageIntro
        eyebrow="Examination timetable"
        title="My exams"
        description="Your examinations from the timetable the examination office has published. Rooms and times can change until the final version is published, so check again before each exam."
        actions={state.kind === "ready" && state.data.exams.length > 0 && <Button variant="outline" onClick={() => window.print()} className="print:hidden"><Printer />Print</Button>}
      />

      {lookup && (
        <form className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-center print:hidden" onSubmit={(e) => { e.preventDefault(); if (roll.trim()) void load(roll.trim()); }}>
          <p className="text-sm text-muted-foreground sm:flex-1">Administrator lookup: enter any student&apos;s roll number.</p>
          <div className="relative sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={roll} onChange={(e) => setRoll(e.target.value.toUpperCase())} placeholder="GLA26-BCA-0001" className="pl-8 font-mono" aria-label="Roll number" maxLength={40} />
          </div>
          <Button type="submit" disabled={!roll.trim()}>Look up</Button>
        </form>
      )}

      {state.kind === "loading" && <div className="space-y-3"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>}

      {state.kind === "error" && (
        <div className="rounded-xl border bg-card p-6">
          <p className="flex items-center gap-2 font-medium"><CircleAlert className="size-4 text-destructive" />
            {state.status === 401 ? "Sign in to see your timetable" : state.code === "NOT_LINKED" ? "Your account is not linked to a student record" : state.status === 404 ? "Not found" : "Could not load the timetable"}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">{state.message}</p>
          {state.status === 401 && <Link href="/sign-in" className={cn(buttonVariants(), "mt-4")}>Sign in</Link>}
          {state.status !== 401 && state.code !== "NOT_LINKED" && <Button variant="outline" className="mt-4" onClick={() => void load(roll || undefined)}>Try again</Button>}
        </div>
      )}

      {state.kind === "ready" && <TimetableBody data={state.data} />}
    </div>
  );
}

function TimetableBody({ data }: { data: StudentTimetable }) {
  const { student, publication } = data;
  const byDate = new Map<string, StudentTimetable["exams"]>();
  for (const exam of data.exams) byDate.set(exam.date ?? "", [...(byDate.get(exam.date ?? "") ?? []), exam]);

  return (
    <>
      <section className="grid gap-px overflow-hidden rounded-xl border bg-border text-sm sm:grid-cols-4">
        {[
          ["Student", <span key="s" className="flex items-center gap-1.5"><UserRound className="size-3.5 text-muted-foreground" />{student.name}</span>],
          ["Roll number", <code key="r" className="font-mono">{student.rollNo}</code>],
          ["Group", `${student.groupName ?? student.groupId}${student.semester ? ` · Sem ${student.semester}` : ""}`],
          ["Exams", `${data.scheduledCount} of ${data.enrolledCount} scheduled`],
        ].map(([label, value]) => <div key={label as string} className="bg-card px-4 py-3"><p className="text-[11px] text-muted-foreground">{label}</p><div className="mt-0.5 font-medium">{value}</div></div>)}
      </section>

      {!publication ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center">
          <p className="font-display text-2xl">No timetable published yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">The examination office has not published a timetable. Your {data.enrolledCount} enrolled subjects will appear here once it does.</p>
        </div>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <ShieldCheck className={cn("size-3.5", data.valid ? "text-success" : "text-destructive")} />
            {publication.title} · version {publication.version} · published {dateTime(publication.publishedAt)}
            {data.valid === false && <span className="text-destructive">· this version no longer passes validation against current data; check with the examination office</span>}
            {data.clashes.length > 0 && <span className="text-destructive">· {data.clashes.length} overlapping exam pair(s): contact the examination office</span>}
          </p>
          <ol className="space-y-5">
            {[...byDate].map(([date, exams]) => (
              <li key={date} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4 text-muted-foreground" />{shortDate(date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</h2>
                <ul className="space-y-2">
                  {exams.map((exam) => (
                    <li key={exam.examId} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-mono text-xs text-muted-foreground">{exam.examId}{exam.requiresLab && <span className="inline-flex items-center gap-1 font-sans"><FlaskConical className="size-3" />Practical</span>}</p>
                        <p className="mt-0.5 font-medium">{exam.examName}</p>
                      </div>
                      <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <div className="flex items-center gap-1.5"><Clock className="size-3.5 text-muted-foreground" /><dt className="sr-only">Time</dt><dd className="tabular-nums">{clock(exam.startMinutes)}–{clock(exam.endMinutes)} <span className="text-muted-foreground capitalize">{exam.session}</span></dd></div>
                        <div className="flex items-center gap-1.5"><DoorOpen className="size-3.5 text-muted-foreground" /><dt className="sr-only">Room</dt><dd><span className="font-mono">{exam.roomId}</span> <span className="text-muted-foreground">{exam.roomName}</span></dd></div>
                      </dl>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {data.notInPublishedSchedule.length > 0 && (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Not in the published timetable yet: <span className="font-mono text-foreground">{data.notInPublishedSchedule.join(", ")}</span>. Contact the examination office if you expected these exams.
            </p>
          )}
        </>
      )}
    </>
  );
}
