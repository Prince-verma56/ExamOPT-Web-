/**
 * ScheduleDashboard — native, illustrative mockup of the ExamOpt timetable view.
 * Rendered entirely with HTML/CSS/SVG so it stays crisp at every size.
 * All content comes from sample-data.ts and is labelled as a sample.
 */

import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Check,
  Database,
  FlaskConical,
  GitCompareArrows,
  LayoutGrid,
  Lock,
  Settings2,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PreviewTag } from "../primitives";
import {
  PREVIEW_DAYS,
  PREVIEW_ROOM_LOAD,
  PREVIEW_SESSIONS,
  PREVIEW_TIMETABLE,
  type PreviewExam,
  type Program,
} from "./sample-data";

const programTone: Record<Program, string> = {
  BCA: "border-[#d6dff5] bg-[#eef2fc] text-[#1f46a8]",
  "BCA-DS": "border-[#cfe6dc] bg-[#ecf6f1] text-[#0f6b4d]",
  MCA: "border-[#e8dfcf] bg-[#f8f3ea] text-[#7a5a22]",
};

const navItems = [
  { label: "Overview", icon: LayoutGrid },
  { label: "Data", icon: Database },
  { label: "Constraints", icon: Settings2 },
  { label: "Timetable", icon: CalendarDays, active: true },
  { label: "Conflicts", icon: Waypoints },
  { label: "Compare", icon: GitCompareArrows },
  { label: "Rooms", icon: BarChart3 },
];

const checks = [
  { label: "Room capacity", state: "ok" as const },
  { label: "Lab requirements", state: "ok" as const },
  { label: "Fixed slots", state: "ok" as const },
  { label: "Shared students", state: "review" as const, note: "1 pair" },
];

function ExamBlock({ exam }: { exam: PreviewExam }) {
  return (
    <div
      className={cn(
        "relative rounded-[5px] border px-1.5 py-1 leading-tight",
        programTone[exam.program],
        exam.flagged && "ring-1 ring-warning ring-offset-1 ring-offset-white"
      )}
    >
      <div className="flex items-center gap-1 text-[10px] font-semibold tracking-tight">
        <span className="truncate">{exam.code}</span>
        {exam.practical && !exam.fixed && <FlaskConical className="size-2.5 shrink-0 opacity-70" aria-label="Practical" />}
        {exam.fixed && <Lock className="size-2.5 shrink-0 opacity-70" aria-label="Fixed slot" />}
      </div>
      <div className="truncate text-[9px] opacity-70">{exam.room}</div>
    </div>
  );
}

function UtilisationRing({ pct }: { pct: number }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="size-11 -rotate-90" aria-hidden>
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-[#e8ecf5]" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        className="stroke-primary"
      />
    </svg>
  );
}

export function ScheduleDashboard({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e3e1da] bg-white text-foreground shadow-[0_1px_2px_rgba(23,32,51,0.04),0_24px_60px_-28px_rgba(23,32,51,0.28)]",
        className
      )}
      aria-label="Illustrative ExamOpt timetable preview using sample data"
    >
      {/* Window bar */}
      <div className="flex items-center justify-between gap-3 border-b border-border/80 bg-[#fbfbf9] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">ExamOpt</span>
          <span aria-hidden>/</span>
          <span className="truncate">Examination timetable</span>
        </div>
        <PreviewTag>Sample data</PreviewTag>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <nav aria-hidden className="hidden w-[46px] shrink-0 border-r border-border/70 bg-[#fbfbf9] px-1.5 py-3 xl:block 2xl:w-[118px] 2xl:px-2">
          <ul className="space-y-0.5">
            {navItems.map(({ label, icon: Icon, active }) => (
              <li
                key={label}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-md px-2 py-1.5 text-[10.5px] 2xl:justify-start",
                  active ? "bg-primary/[0.08] font-medium text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-3 shrink-0" />
                <span className="hidden 2xl:inline">{label}</span>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main timetable */}
        <div className="min-w-0 flex-1 p-3 sm:p-4">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-[13px] font-semibold tracking-tight">Week 1 · Odd semester</p>
              <p className="text-[10.5px] text-muted-foreground">10 exams · 2 sessions per day</p>
            </div>
            <span className="rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground">
              Draft
            </span>
          </div>

          <div
            role="table"
            aria-label="Sample examination timetable"
            className="grid grid-cols-[40px_repeat(3,minmax(0,1fr))] gap-1 sm:grid-cols-[44px_repeat(5,minmax(0,1fr))]"
          >
            <div role="row" className="contents">
              <div role="columnheader">
                <span className="sr-only">Session</span>
              </div>
              {PREVIEW_DAYS.map((d, i) => (
                <div
                  role="columnheader"
                  key={d.key}
                  className={cn("pb-1 text-center leading-tight", i > 2 && "hidden sm:block")}
                >
                  <div className="text-[10.5px] font-medium">{d.weekday}</div>
                  <div className="text-[9.5px] text-muted-foreground">{d.date}</div>
                </div>
              ))}
            </div>
            {PREVIEW_SESSIONS.map((s) => (
              <div role="row" key={s.key} className="contents">
                <div role="rowheader" className="pt-1.5 text-[9.5px] leading-tight text-muted-foreground">
                  <div className="font-medium text-foreground/80">{s.time}</div>
                  {s.label}
                </div>
                {PREVIEW_DAYS.map((d, i) => (
                  <div
                    role="cell"
                    key={d.key}
                    className={cn(
                      "flex min-h-[78px] flex-col gap-1 rounded-md border border-dashed border-border/90 bg-[#fcfcfb] p-1",
                      i > 2 && "hidden sm:flex"
                    )}
                  >
                    {(PREVIEW_TIMETABLE[`${d.key}-${s.key}`] ?? []).map((exam) => (
                      <ExamBlock key={exam.code} exam={exam} />
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-muted-foreground">
            {(["BCA", "BCA-DS", "MCA"] as const).map((p) => (
              <span key={p} className="inline-flex items-center gap-1">
                <span className={cn("size-2 rounded-[2px] border", programTone[p])} />
                {p}
              </span>
            ))}
            <span className="inline-flex items-center gap-1">
              <FlaskConical className="size-2.5" /> Practical
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="size-2.5" /> Fixed slot
            </span>
          </div>
        </div>

        {/* Insight rail */}
        <aside className="hidden w-[168px] shrink-0 border-l border-border/70 bg-[#fbfbf9] p-3 md:block">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">Checks</p>
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.label} className="flex items-center gap-1.5 text-[10.5px]">
                {c.state === "ok" ? (
                  <span className="grid size-3.5 place-items-center rounded-full bg-success/12 text-success">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="grid size-3.5 place-items-center rounded-full bg-warning/15 text-warning">
                    <AlertTriangle className="size-2.5" strokeWidth={2.5} />
                  </span>
                )}
                <span className="flex-1 truncate">{c.label}</span>
                {c.note && <span className="text-[9.5px] text-warning">{c.note}</span>}
              </li>
            ))}
          </ul>

          <div className="my-3 h-px bg-border/80" />

          <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Room utilisation
          </p>
          <div className="mb-2.5 flex items-center gap-2.5">
            <UtilisationRing pct={74} />
            <div className="leading-tight">
              <div className="text-lg font-semibold tracking-tight tabular-nums">74%</div>
              <div className="text-[9.5px] text-muted-foreground">avg. seat fill</div>
            </div>
          </div>
          <ul className="space-y-1.5">
            {PREVIEW_ROOM_LOAD.map((r) => (
              <li key={r.room} className="grid grid-cols-[52px_1fr_26px] items-center gap-1.5 text-[9.5px]">
                <span className="truncate text-muted-foreground">{r.room}</span>
                <span className="h-1 overflow-hidden rounded-full bg-[#e8ecf5]">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
                </span>
                <span className="text-right tabular-nums text-muted-foreground">{r.pct}%</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Mobile-only compact check summary (rail is hidden below md) */}
      <div className="flex items-center justify-between gap-2 border-t border-border/80 bg-[#fbfbf9] px-3.5 py-2 text-[10.5px] md:hidden">
        <span className="inline-flex items-center gap-1.5 text-success">
          <Check className="size-3" strokeWidth={3} /> 3 checks passing
        </span>
        <span className="inline-flex items-center gap-1.5 text-warning">
          <AlertTriangle className="size-3" /> 1 pair to review
        </span>
      </div>
      <figcaption className="sr-only">
        Sample timetable for one examination week with room utilisation and constraint checks. Not
        the output of a scheduling run.
      </figcaption>
    </figure>
  );
}
