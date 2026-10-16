"use client";

import { useMemo, useRef } from "react";
import { useGsap } from "@/animations/hooks/use-gsap";
import { cn } from "@/lib/utils";
import { clock, shortDate } from "../format";
import type { DemoRoom, DemoSlot, Highlight, PlacedAssignment } from "./types";

/**
 * Compact timetable: days across, sessions down, one chip per exam placement.
 * Below `md` it becomes a list grouped by slot so nothing scrolls sideways.
 * Assignments render exactly as given; duplicates and clashes stay visible.
 */
export function ScheduleGrid({ slots, rooms, assignments, highlight = {}, caption, onSelectExam, emptyLabel = "No exams placed yet.", examNames }: {
  slots: DemoSlot[];
  rooms: DemoRoom[];
  assignments: PlacedAssignment[];
  highlight?: Highlight;
  caption?: string;
  onSelectExam?: (examId: string) => void;
  emptyLabel?: string;
  /** Exam id to subject name, shown as a tooltip and read by screen readers. */
  examNames?: Map<string, string>;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const roomById = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))].sort(), [slots]);
  const starts = useMemo(() => [...new Set(slots.map((s) => s.startMinutes))].sort((a, b) => a - b), [slots]);
  const bySlot = useMemo(() => {
    const map = new Map<string, PlacedAssignment[]>();
    for (const a of assignments) map.set(a.slotId, [...(map.get(a.slotId) ?? []), a]);
    for (const list of map.values()) list.sort((x, y) => x.examId.localeCompare(y.examId));
    return map;
  }, [assignments]);
  const slotAt = (date: string, start: number) => slots.find((s) => s.date === date && s.startMinutes === start);
  const changedKey = [...(highlight.changed ?? [])].sort().join(",");

  // Flash placements that changed, so a before/after transition is visible. Skipped under reduced motion.
  useGsap((gsap) => {
    if (!changedKey) return;
    gsap.fromTo("[data-changed='true']", { scale: 0.92, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.45, ease: "power2.out", stagger: 0.04 });
  }, [changedKey], { scope });

  const chip = (a: PlacedAssignment, i: number) => {
    const room = roomById.get(a.roomId);
    const tone = highlight.error?.has(a.examId) ? "error" : highlight.focus?.has(a.examId) ? "focus" : highlight.warning?.has(a.examId) ? "warning" : highlight.changed?.has(a.examId) ? "changed" : "default";
    const Tag = onSelectExam ? "button" : "div";
    return (
      <Tag
        key={`${a.examId}-${a.roomId}-${i}`}
        {...(onSelectExam ? { type: "button" as const, onClick: () => onSelectExam(a.examId) } : {})}
        data-changed={highlight.changed?.has(a.examId) ? "true" : undefined}
        className={cn(
          "block w-full min-w-0 rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight transition-colors duration-200 motion-reduce:transition-none",
          tone === "default" && "border-border bg-[color-mix(in_oklch,var(--primary),white_92%)]",
          tone === "focus" && "border-primary bg-primary text-primary-foreground shadow-sm",
          tone === "error" && "border-destructive/60 bg-destructive/8 text-destructive",
          tone === "warning" && "border-[color-mix(in_oklch,var(--examopt-warning),transparent_40%)] bg-[color-mix(in_oklch,var(--examopt-warning),transparent_88%)]",
          tone === "changed" && "border-success/50 bg-[color-mix(in_oklch,var(--examopt-success),transparent_88%)]",
          onSelectExam && "outline-none hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40",
        )}
        title={`${a.examId}${examNames?.get(a.examId) ? ` · ${examNames.get(a.examId)}` : ""} · room ${a.roomId}${room ? ` (${room.roomType === "LAB" ? "laboratory" : "theory"}, ${room.capacity} seats)` : ""}`}
        aria-label={`${a.examId}${examNames?.get(a.examId) ? `, ${examNames.get(a.examId)}` : ""}, in ${a.slotId}, room ${a.roomId}`}
      >
        <span className="block font-mono font-semibold break-all">{a.examId}</span>
        <span className={cn("block font-mono text-[10px] opacity-70", tone === "focus" && "opacity-90")}>{a.roomId}{room && room.roomType === "LAB" ? " · lab" : ""}</span>
      </Tag>
    );
  };

  const ghost = highlight.ghost;
  const cellBody = (slotId: string) => {
    const list = bySlot.get(slotId) ?? [];
    return (
      <div className="space-y-1">
        {list.map(chip)}
        {ghost && ghost.slotId === slotId && !list.some((a) => a.examId === ghost.examId) && (
          <div className="rounded-md border border-dashed border-primary/60 px-1.5 py-1 font-mono text-[11px] leading-tight text-primary">
            <span className="block font-semibold break-all">{ghost.examId}?</span><span className="block text-[10px] opacity-70">{ghost.roomId || "trying this slot"}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={scope} className="rounded-xl border bg-card">
      {caption && <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">{caption}</p>}
      {assignments.length === 0 && !ghost && <p className="px-3 py-2 text-xs text-muted-foreground">{emptyLabel}</p>}

      {/* Grid: md and up */}
      <div className="hidden p-2 md:block">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `4.5rem repeat(${dates.length}, minmax(0, 1fr))` }}>
          <div />
          {dates.map((d, i) => <div key={d} className="px-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">Day {i + 1}<span className="block normal-case tracking-normal text-foreground/80">{shortDate(d, { weekday: "short", day: "numeric", month: "short" })}</span></div>)}
          {starts.map((start) => (
            <div key={start} className="contents">
              <div className="px-1 pt-1 text-[10px] text-muted-foreground tabular-nums">{clock(start)}</div>
              {dates.map((date) => {
                const slot = slotAt(date, start);
                if (!slot) return <div key={date} className="rounded-lg bg-muted/30" />;
                const outlined = highlight.slotId === slot.id;
                return (
                  <div key={date} className={cn("min-h-14 rounded-lg border border-dashed border-border/80 p-1 transition-colors duration-200 motion-reduce:transition-none", outlined && "border-solid border-primary bg-primary/4")}>
                    <p className="mb-1 px-0.5 font-mono text-[9.5px] text-muted-foreground">{slot.id}</p>
                    {cellBody(slot.id)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* List: below md */}
      <ul className="divide-y md:hidden">
        {slots.map((slot) => {
          const list = bySlot.get(slot.id) ?? [];
          if (!list.length && !(ghost && ghost.slotId === slot.id) && highlight.slotId !== slot.id) return null;
          return (
            <li key={slot.id} className={cn("px-3 py-2", highlight.slotId === slot.id && "bg-primary/4")}>
              <p className="mb-1 text-[11px] text-muted-foreground"><span className="font-mono text-foreground">{slot.id}</span> · {shortDate(slot.date)} · {clock(slot.startMinutes)}</p>
              {cellBody(slot.id)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
