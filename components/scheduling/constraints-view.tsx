"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert, FlaskConical, Lock, Pin, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "./api";
import { PageIntro } from "./page-intro";
import { VALIDATION_RULES } from "@/server/scheduling/validator";
import type { schedulingService } from "@/server/scheduling/service";

type Readiness = Awaited<ReturnType<typeof schedulingService.readiness>>;

const INVIGILATION_RULES = [
  "An invigilator never supervises two overlapping exams",
  "An invigilator is never used in a slot they are unavailable for",
  "An invigilator never exceeds their duty cap",
  "Every duty names a faculty member on the roster",
];

const SOFT = [
  { key: "sameDay", label: "Extra exams a student sits on the same day", unit: "per extra exam" },
  { key: "backToBack", label: "A student's exams in consecutive slots", unit: "per pair" },
  { key: "capacityWaste", label: "Empty seats in allocated rooms", unit: "per 100 seats" },
  { key: "daysUsed", label: "Examination days used", unit: "per day" },
] as const;

/** Live view of every constraint the engine enforces, read from the same data the solver loads. */
export function ConstraintsView() {
  const [data, setData] = useState<Readiness | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setData(await api<Readiness>("/scheduling/readiness")); }
    catch (e) { setError(errorMessage(e)); }
  }, []);

  useEffect(() => {
    // Initial fetch; state is set after the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const c = data?.constraints;
  return (
    <div className="space-y-10 pb-8">
      <PageIntro eyebrow="Scheduling" title="Constraints" description="Hard rules are never traded for quality: a schedule that breaks one is not feasible and cannot be published. Soft objectives only rank schedules that already satisfy every hard rule." />

      {error && <p className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><span className="flex items-center gap-2"><CircleAlert className="size-4" />{error}</span><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw />Retry</Button></p>}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Hard rules checked by the independent validator</h2>
          <ol className="divide-y rounded-xl border bg-card">
            {VALIDATION_RULES.map((rule) => (
              <li key={rule.rule} className="flex items-start gap-3 px-4 py-2.5 text-sm">
                <span className="w-5 pt-px font-mono text-[11px] text-muted-foreground tabular-nums">{rule.rule}</span>
                <span className="flex-1">{rule.label}</span>
                <Lock className="mt-0.5 size-3.5 text-muted-foreground" aria-label="Always enforced" />
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Invigilation rules</h2>
            <ol className="divide-y rounded-xl border bg-card">{INVIGILATION_RULES.map((rule) => <li key={rule} className="flex items-start gap-3 px-4 py-2.5 text-sm"><span className="flex-1">{rule}</span><Lock className="mt-0.5 size-3.5 text-muted-foreground" aria-label="Always enforced" /></li>)}</ol>
            <p className="text-xs text-muted-foreground">An exam with no eligible invigilator is reported, not forced; it does not make the exam schedule infeasible.</p>
          </div>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Soft objectives (default weights)</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {SOFT.map((s) => <li key={s.key} className="flex items-center gap-3 px-4 py-2.5 text-sm"><span className="flex-1">{s.label}</span><span className="font-mono text-xs tabular-nums">{data ? data.defaults.weights[s.key] : "—"} <span className="text-muted-foreground">{s.unit}</span></span></li>)}
            </ul>
            <p className="text-xs text-muted-foreground">Change the weights for a run in the <Link href="/admin/optimization" className="text-primary hover:underline">Optimization Lab</Link>. Lower penalty is better.</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Constraint data in the live dataset</h2>
          <p className="text-xs text-muted-foreground">Read from the subjects, rooms and faculty tables. Fixed and unavailable slots are edited in those records.</p>
        </div>
        {!c ? <Skeleton className="h-64 rounded-xl" /> : (
          <div className="grid gap-6 xl:grid-cols-2">
            <ConstraintTable title="Examinations" empty="No exam has a fixed slot or a blackout." rows={c.exams.map((e) => ({ id: e.id, name: e.name, icon: e.requiresLab, fixed: e.fixedSlotId, slots: e.unavailableSlotIds }))} />
            <ConstraintTable title="Rooms" empty="Every room is available in every slot." rows={c.rooms.map((r) => ({ id: r.id, name: r.name, icon: r.roomType === "LAB", fixed: null, slots: r.unavailableSlotIds }))} />
            <ConstraintTable title="Faculty" empty="No faculty member has unavailable slots." rows={c.faculty.filter((f) => f.unavailableSlotIds.length).map((f) => ({ id: f.id, name: `${f.name} · cap ${f.maxDuties}`, icon: false, fixed: null, slots: f.unavailableSlotIds }))} />
          </div>
        )}
      </section>
    </div>
  );
}

function ConstraintTable({ title, rows, empty }: { title: string; empty: string; rows: { id: string; name: string; icon: boolean; fixed: string | null; slots: string[] }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="pl-4">{title}</TableHead><TableHead>Fixed slot</TableHead><TableHead className="pr-4">Unavailable in</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="pl-4"><span className="flex items-center gap-1.5 font-mono text-xs font-semibold">{row.icon && <FlaskConical className="size-3 text-muted-foreground" aria-label="Laboratory" />}{row.id}</span><span className="block max-w-64 truncate text-xs text-muted-foreground">{row.name}</span></TableCell>
              <TableCell className="font-mono text-xs">{row.fixed ? <span className="inline-flex items-center gap-1 text-primary"><Pin className="size-3" />{row.fixed}</span> : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="pr-4 font-mono text-xs">{row.slots.join(" · ") || <span className="text-muted-foreground">—</span>}</TableCell>
            </TableRow>
          ))}
          {!rows.length && <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">{empty}</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}
