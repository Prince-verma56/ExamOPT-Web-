"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, CalendarDays, CircleAlert, FlaskConical, LayoutGrid, List, Lock, Pin, RefreshCw, Search, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "./api";
import { ALGORITHM_LABEL, clock, dateTime, num, shortDate } from "./format";
import { OutcomeBadge } from "./outcome-badge";
import { PageIntro, StatStrip } from "./page-intro";
import { ValidationChecklist } from "./run-views";
import { Segmented } from "./segmented";
import type { schedulingService } from "@/server/scheduling/service";
import type { RunSummary } from "@/server/scheduling/persistence";
import type { Violation } from "@/server/scheduling/validator";

type RunDetail = Awaited<ReturnType<typeof schedulingService.runDetail>>;
type Block = RunDetail["assignments"][number];
type View = "calendar" | "rooms" | "list";

const PROGRAM_STYLE: Record<string, string> = {
  BCA: "before:bg-(--chart-1)",
  "BCA-DS": "before:bg-(--chart-2)",
  MCA: "before:bg-(--chart-3)",
};

export function Timetable() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = params.get("run");
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [detail, setDetail] = useState<RunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("calendar");
  const [program, setProgram] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Block | null>(null);

  const runId = requested ?? runs?.find((r) => r.published?.isActive)?.runId ?? runs?.find((r) => r.outcome === "FEASIBLE")?.runId ?? null;

  useEffect(() => {
    api<{ runs: RunSummary[] }>("/scheduling/runs?limit=100").then((data) => setRuns(data.runs.filter((r) => r.scheduledExams > 0))).catch((e) => { setError(errorMessage(e)); setLoading(false); });
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setLoading(true); setError(null);
    try { setDetail(await api<RunDetail>(`/scheduling/runs/${encodeURIComponent(id)}`)); }
    catch (e) { setError(errorMessage(e)); setDetail(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    // Fetch the selected run; state is set once the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (runId) void loadDetail(runId);
    else if (runs) setLoading(false);
  }, [runId, runs, loadDetail]);

  const violationsByExam = useMemo(() => {
    const map = new Map<string, Violation[]>();
    for (const v of detail?.liveValidation.violations ?? []) for (const id of v.examIds) map.set(id, [...(map.get(id) ?? []), v]);
    return map;
  }, [detail]);

  const programs = useMemo(() => [...new Set((detail?.assignments ?? []).map((a) => a.program).filter((p): p is string => Boolean(p)))].sort(), [detail]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (detail?.assignments ?? []).filter((a) =>
      (program === "all" || a.program === program) &&
      (!needle || a.examId.toLowerCase().includes(needle) || a.examName?.toLowerCase().includes(needle) || a.roomId.toLowerCase().includes(needle)));
  }, [detail, program, query]);

  const selectRun = (id: string) => router.replace(`${pathname}?run=${encodeURIComponent(id)}`, { scroll: false });
  const summary = detail?.summary;
  const validation = detail?.liveValidation;
  const days = useMemo(() => [...new Set((detail?.slots ?? []).map((s) => s.date))], [detail]);
  const sessions = useMemo(() => [...new Set((detail?.slots ?? []).map((s) => s.session))], [detail]);

  return (
    <div className="space-y-8 pb-8">
      <PageIntro
        eyebrow="Saved schedules"
        title="Timetable"
        description="Saved assignments for a scheduling run, re-checked live by the independent validator against today's data. This view is read-only."
        actions={runs && runs.length > 0 && (
          <Select value={runId ?? ""} onValueChange={(value) => value && selectRun(String(value))}>
            <SelectTrigger className="h-9 min-w-72 bg-card" aria-label="Scheduling run">
              <SelectValue>{(value: string) => {
                const run = runs.find((r) => r.runId === value);
                return run ? `${ALGORITHM_LABEL[run.algorithm]} · ${dateTime(run.createdAt)}${run.published?.isActive ? " · published" : ""}` : "Choose a run";
              }}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-80 min-w-96">
              {runs.map((run) => (
                <SelectItem key={run.runId} value={run.runId}>
                  <span className="w-24 font-medium">{ALGORITHM_LABEL[run.algorithm]}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">{run.runId.replace(/^RUN-/, "")}</span>
                  {run.published && <span className="text-[11px] text-primary">v{run.published.version}{run.published.isActive ? " active" : ""}</span>}
                  {run.source === "legacy" && <span className="text-[11px] text-muted-foreground">legacy</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm">
          <span className="flex items-center gap-2 text-destructive"><CircleAlert className="size-4" />{error}</span>
          {runId && <Button variant="outline" size="sm" onClick={() => void loadDetail(runId)}><RefreshCw />Retry</Button>}
        </div>
      )}

      {!loading && !error && runs && !runId && (
        <div className="rounded-xl border border-dashed bg-card/60 px-6 py-16 text-center">
          <p className="font-display text-3xl">No schedule to show yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Run a strategy in the Optimization Lab. Feasible runs are saved and appear here.</p>
          <Link href="/admin/optimization" className={cn(buttonVariants(), "mt-5")}>Open Optimization Lab</Link>
        </div>
      )}

      {loading && !error && <div className="space-y-4"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-120 rounded-xl" /></div>}

      {detail && summary && validation && !loading && (
        <>
          <section className={cn("flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between", validation.valid ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/4")} aria-live="polite">
            <div className="flex items-start gap-3">
              {validation.valid ? <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" /> : <ShieldX className="mt-0.5 size-5 shrink-0 text-destructive" />}
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {validation.valid ? "Valid against current data" : `${validation.violationCount} hard-constraint violation${validation.violationCount > 1 ? "s" : ""} against current data`}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  {validation.checks.filter((c) => c.passed).length} of {validation.checks.length} rules passed · {validation.checkedAssignments} assignments · {num(validation.checkedStudents)} students checked
                  {detail.dataChangedSinceRun === true && " · the dataset has changed since this run was generated"}
                  {summary.source === "legacy" && " · this run predates the Phase 2 engine, so this live check is its first independent validation"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <OutcomeBadge outcome={summary.outcome} evidence={summary.infeasibilityEvidence} legacy={summary.source === "legacy"} />
              {summary.published && <span className="rounded-full border bg-card px-2.5 py-0.5 text-xs whitespace-nowrap">Published v{summary.published.version}{summary.published.isActive ? " · active" : ""}</span>}
            </div>
          </section>

          <StatStrip items={[
            { label: "Algorithm", value: ALGORITHM_LABEL[summary.algorithm], hint: summary.runId },
            { label: "Scheduled", value: `${summary.scheduledExams}/${summary.totalExams}`, hint: detail.unscheduled.length ? `${detail.unscheduled.length} not placed` : "all exams placed", tone: detail.unscheduled.length ? "warning" : "default" },
            { label: "Days used", value: `${detail.liveMetrics.daysUsed} of ${detail.liveMetrics.totalDays}`, hint: `${detail.liveMetrics.slotsUsed} slots` },
            { label: "Seat fill", value: `${num(detail.liveMetrics.seatFillPct, 1)}%`, hint: `${num(detail.liveMetrics.capacityWasteSeats)} empty seats` },
            { label: "Extra same-day", value: num(detail.liveMetrics.sameDayExtraExams), hint: `${num(detail.liveMetrics.studentsWithSameDayExams)} students affected` },
            { label: "Generated", value: dateTime(summary.createdAt), hint: summary.source === "engine" ? `engine v${summary.engineVersion}` : "legacy run" },
          ]} />

          {!validation.valid && (
            <details className="group rounded-xl border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium">
                <span className="flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" />Validation details</span>
                <span className="text-xs text-muted-foreground group-open:hidden">Show</span>
              </summary>
              <div className="grid gap-4 border-t p-4 lg:grid-cols-2">
                <ValidationChecklist checks={validation.checks} />
                <ul className="space-y-2 text-sm">{validation.violations.slice(0, 30).map((v, i) => <li key={i} className="rounded-lg border p-2.5"><code className="font-mono text-[11px] font-semibold">{v.code}</code><p className="mt-0.5 text-muted-foreground">{v.message}</p></li>)}</ul>
              </div>
            </details>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented label="Layout" value={view} onChange={setView} options={[{ value: "calendar", label: "Calendar", icon: CalendarDays }, { value: "rooms", label: "Rooms", icon: LayoutGrid }, { value: "list", label: "List", icon: List }]} />
              <Segmented label="Program" value={program} onChange={setProgram} options={[{ value: "all", label: "All programs" }, ...programs.map((p) => ({ value: p, label: p }))]} />
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find exam or room" className="h-8 bg-card pl-8" aria-label="Find exam or room" />
            </div>
          </div>

          {view === "calendar" && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <div className="grid min-w-220" style={{ gridTemplateColumns: `88px repeat(${days.length}, minmax(0, 1fr))` }}>
                <div className="border-b bg-muted/30" />
                {days.map((day, i) => (
                  <div key={day} className="border-b border-l bg-muted/30 px-3 py-2.5">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Day {i + 1}</p>
                    <p className="text-sm font-medium">{shortDate(day)}</p>
                  </div>
                ))}
                {sessions.map((session) => (
                  <div key={session} className="contents">
                    <div className="border-b px-3 py-3">
                      <p className="text-sm font-medium capitalize">{session}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{clock(detail.slots.find((s) => s.session === session)?.startMinutes)}</p>
                    </div>
                    {days.map((day) => {
                      const slot = detail.slots.find((s) => s.date === day && s.session === session);
                      const blocks = slot ? visible.filter((a) => a.slotId === slot.id) : [];
                      return (
                        <div key={day} className="min-h-32 space-y-1.5 border-b border-l p-2">
                          {slot && <p className="px-0.5 font-mono text-[10px] text-muted-foreground">{slot.id}</p>}
                          {blocks.map((block) => <ExamBlock key={block.id} block={block} issues={violationsByExam.get(block.examId)} onOpen={() => setOpen(block)} />)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t px-3 py-2 text-xs text-muted-foreground">
                {Object.entries(PROGRAM_STYLE).map(([name, style]) => <li key={name} className={cn("relative pl-3 before:absolute before:inset-y-0.5 before:left-0 before:w-0.75 before:rounded-full", style)}>{name}</li>)}
                <li className="flex items-center gap-1"><FlaskConical className="size-3" />Laboratory exam</li>
                <li className="flex items-center gap-1"><Pin className="size-3 text-primary" />Fixed slot</li>
                <li className="flex items-center gap-1"><AlertTriangle className="size-3 text-destructive" />Validation issue</li>
                <li>Bar: students ÷ seats</li>
              </ul>
            </div>
          )}

          {view === "rooms" && (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-240 border-collapse text-xs">
                <thead>
                  <tr className="bg-muted/30">
                    <th scope="col" className="sticky left-0 z-10 border-b bg-muted/60 px-3 py-2 text-left font-medium backdrop-blur">Room</th>
                    {detail.slots.map((slot) => <th key={slot.id} scope="col" className="border-b border-l px-2 py-2 text-left font-medium"><span className="block font-mono">{slot.id}</span><span className="font-normal text-muted-foreground">{shortDate(slot.date, { day: "numeric", month: "short" })}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {detail.rooms.map((room) => (
                    <tr key={room.id}>
                      <th scope="row" className="sticky left-0 z-10 border-b bg-card/95 px-3 py-2 text-left font-normal backdrop-blur">
                        <span className="flex items-center gap-1.5 font-mono font-medium">{room.roomType === "LAB" && <FlaskConical className="size-3 text-muted-foreground" aria-label="Laboratory" />}{room.id}</span>
                        <span className="text-muted-foreground">{room.capacity} seats</span>
                      </th>
                      {detail.slots.map((slot) => {
                        const block = visible.find((a) => a.roomId === room.id && a.slotId === slot.id);
                        const unavailable = room.unavailableSlotIds.includes(slot.id);
                        return (
                          <td key={slot.id} className={cn("h-12 border-b border-l p-1 align-top", unavailable && "bg-[repeating-linear-gradient(135deg,transparent_0_5px,var(--border)_5px_6px)]")}>
                            {unavailable && !block && <span className="sr-only">Unavailable</span>}
                            {unavailable && <Lock className="ml-auto size-3 text-muted-foreground" aria-hidden />}
                            {block && (
                              <button type="button" onClick={() => setOpen(block)} className={cn("w-full rounded-md border bg-background px-1.5 py-1 text-left font-mono font-medium outline-none hover:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/40", violationsByExam.has(block.examId) && "border-destructive/60 text-destructive")}>
                                {block.examId}
                                <span className="block font-sans font-normal text-muted-foreground tabular-nums">{block.students}/{block.roomCapacity}</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="flex items-center gap-2 border-t px-3 py-2 text-xs text-muted-foreground"><span className="inline-block size-3 rounded-sm border bg-[repeating-linear-gradient(135deg,transparent_0_3px,var(--border)_3px_4px)]" />Hatched cells with a lock: room unavailable in that slot</p>
            </div>
          )}

          {view === "list" && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <Table>
                <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">Exam</TableHead><TableHead>Program</TableHead><TableHead>Slot</TableHead><TableHead>Time</TableHead><TableHead>Room</TableHead><TableHead className="text-right">Students / seats</TableHead><TableHead className="pr-4">Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {[...visible].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "") || (a.startMinutes ?? 0) - (b.startMinutes ?? 0) || a.examId.localeCompare(b.examId)).map((a) => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => setOpen(a)}>
                      <TableCell className="pl-4"><span className="font-mono text-xs font-semibold">{a.examId}</span><span className="block max-w-64 truncate text-xs text-muted-foreground">{a.examName}</span></TableCell>
                      <TableCell className="text-xs">{a.program} · S{a.semester}</TableCell>
                      <TableCell className="font-mono text-xs">{a.slotId}</TableCell>
                      <TableCell className="text-xs tabular-nums">{shortDate(a.date)} · {clock(a.startMinutes)}–{clock(a.endMinutes)}</TableCell>
                      <TableCell className="font-mono text-xs">{a.roomId}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">{a.students}/{a.roomCapacity}</TableCell>
                      <TableCell className="pr-4 text-xs">{violationsByExam.has(a.examId) ? <span className="inline-flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" />{violationsByExam.get(a.examId)!.length} issue(s)</span> : <span className="text-success">Valid</span>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!visible.length && <p className="text-center text-sm text-muted-foreground">No assignments match these filters.</p>}

          {detail.unscheduled.length > 0 && (
            <section className="rounded-xl border border-dashed p-4">
              <h2 className="text-sm font-semibold">Not scheduled in this run</h2>
              <p className="mt-1 text-xs text-muted-foreground">These exams have no assignment. Open the run in the Optimization Lab to see why.</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">{detail.unscheduled.map((u) => <li key={u.examId} className="rounded-md border bg-card px-2 py-1 font-mono text-xs">{u.examId}</li>)}</ul>
            </section>
          )}

          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Lock className="mt-0.5 size-3.5 shrink-0" />Read-only. Manual edits are deferred to Phase 3: any change will have to pass the same independent validator before it can be saved or published.</p>
        </>
      )}

      <Sheet open={open !== null} onOpenChange={(value) => { if (!value) setOpen(null); }}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-md">
          {open && (
            <>
              <SheetHeader className="border-b p-6 pr-12">
                <p className="font-mono text-xs text-muted-foreground">{open.examId}</p>
                <SheetTitle className="font-display text-2xl leading-tight font-normal">{open.examName}</SheetTitle>
                <SheetDescription>{open.program} · Semester {open.semester} · {open.durationMinutes} minutes{open.requiresLab ? " · practical (laboratory)" : ""}</SheetDescription>
              </SheetHeader>
              <dl className="grid grid-cols-2 gap-px bg-border text-sm">
                {[
                  ["Slot", `${open.slotId} · ${open.session}`], ["When", `${shortDate(open.date)}, ${clock(open.startMinutes)}–${clock(open.endMinutes)}`],
                  ["Room", `${open.roomId} (${open.roomType === "LAB" ? "lab" : "theory"})`], ["Seats", `${open.students} of ${open.roomCapacity} (${open.roomCapacity ? Math.round(((open.students ?? 0) / open.roomCapacity) * 100) : 0}%)`],
                  ["Fixed slot", open.fixedSlotId ?? "None"], ["Stored head-count", open.storedStudents ?? "—"],
                ].map(([label, value]) => <div key={label as string} className="bg-card px-6 py-3"><dt className="text-[11px] text-muted-foreground">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>)}
              </dl>
              <div className="space-y-3 p-6">
                <h3 className="text-sm font-semibold">Validation</h3>
                {violationsByExam.get(open.examId)?.length
                  ? <ul className="space-y-2">{violationsByExam.get(open.examId)!.map((v, i) => <li key={i} className="rounded-lg border border-destructive/30 p-3 text-sm"><code className="font-mono text-[11px] font-semibold text-destructive">{v.code}</code><p className="mt-1">{v.message}</p><p className="mt-1 text-xs text-muted-foreground">Suggested action: {v.remediation}</p></li>)}</ul>
                  : <p className="flex items-center gap-2 text-sm text-success"><ShieldCheck className="size-4" />No hard-constraint violations involve this exam.</p>}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ExamBlock({ block, issues, onOpen }: { block: Block; issues?: Violation[]; onOpen: () => void }) {
  const fill = block.roomCapacity ? Math.min(100, ((block.students ?? 0) / block.roomCapacity) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "relative block w-full overflow-hidden rounded-lg border bg-background py-1.5 pr-2 pl-3 text-left outline-none transition-colors before:absolute before:inset-y-0 before:left-0 before:w-0.75 hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/40",
        PROGRAM_STYLE[block.program ?? ""] ?? "before:bg-muted-foreground",
        issues?.length && "border-destructive/50 bg-destructive/3",
      )}
    >
      <span className="flex items-center gap-1">
        <span className="font-mono text-xs font-semibold">{block.examId}</span>
        {block.requiresLab && <FlaskConical className="size-3 text-muted-foreground" aria-label="Laboratory exam" />}
        {block.fixedSlotId && <Pin className="size-3 text-primary" aria-label="Fixed slot" />}
        {issues?.length ? <AlertTriangle className="ml-auto size-3.5 text-destructive" aria-label={`${issues.length} validation issue(s)`} /> : null}
      </span>
      <span className="block truncate text-[11px] text-muted-foreground">{block.examName}</span>
      <span className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground tabular-nums">
        <span className="font-mono">{block.roomId}</span>
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/30" style={{ width: `${fill}%` }} /></span>
        {block.students}/{block.roomCapacity}
      </span>
      <span className="sr-only">{block.program}</span>
    </button>
  );
}
