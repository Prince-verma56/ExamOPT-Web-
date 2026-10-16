"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage } from "@/components/scheduling/api";
import { PageIntro, StatStrip } from "@/components/scheduling/page-intro";
import type { schedulingService } from "@/server/scheduling/service";

type Roster = Awaited<ReturnType<typeof schedulingService.facultyRoster>>;

/** Faculty roster from the `faculty` table, with duties in the active published timetable. */
export default function FacultyPage() {
  const [data, setData] = useState<Roster | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try { setData(await api<Roster>("/faculty")); }
    catch (e) { setError(errorMessage(e)); }
  }, []);

  useEffect(() => {
    // Initial fetch; state is set after the response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const duties = data?.faculty.reduce((sum, f) => sum + f.publishedDuties, 0) ?? 0;
  const capacity = data?.faculty.reduce((sum, f) => sum + f.maxDuties, 0) ?? 0;

  return (
    <div className="space-y-8 pb-8">
      <PageIntro eyebrow="Data workspace" title="Faculty & invigilation" description="Invigilators are assigned after each schedule is generated: one per exam, never in two overlapping slots, never in a slot they are unavailable for, never beyond their duty cap, preferring the program's department and then the lightest load." />

      {error && <p className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><span className="flex items-center gap-2"><CircleAlert className="size-4" />{error}</span><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw />Retry</Button></p>}

      {!data ? <Skeleton className="h-21 rounded-xl" /> : (
        <StatStrip items={[
          { label: "Faculty", value: data.faculty.length },
          { label: "Duty capacity", value: capacity, hint: "sum of duty caps" },
          { label: "Published duties", value: duties, hint: data.publication ? `version ${data.publication.version}` : "nothing published" },
          { label: "Uncovered exams", value: data.uncovered.length, hint: data.uncovered.length ? data.uncovered.join(", ") : "every exam has an invigilator", tone: data.uncovered.length ? "warning" : "default" },
        ]} />
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table className="min-w-180">
          <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Faculty</TableHead><TableHead>Department</TableHead><TableHead>Unavailable slots</TableHead><TableHead className="pr-4">Published duties / cap</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {!data && Array.from({ length: 8 }, (_, i) => <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5" /></TableCell></TableRow>)}
            {data?.faculty.map((f) => {
              const pct = f.maxDuties ? Math.min(100, (f.publishedDuties / f.maxDuties) * 100) : 0;
              return (
                <TableRow key={f.id}>
                  <TableCell className="pl-4"><span className="font-medium">{f.name}</span><span className="block font-mono text-[11px] text-muted-foreground">{f.id}</span></TableCell>
                  <TableCell className="text-xs">{f.department}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">{f.unavailableSlotIds.join(" · ") || "—"}</TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center gap-2 text-xs tabular-nums">
                      <span className="w-10">{f.publishedDuties}/{f.maxDuties}</span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", f.publishedDuties > f.maxDuties ? "bg-destructive" : "bg-foreground/40")} style={{ width: `${pct}%` }} /></span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {data && !data.faculty.length && <TableRow><TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">The faculty table is empty, so runs are generated without invigilators.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      {data && !data.publication && <p className="text-sm text-muted-foreground">Duty counts appear once a timetable is published. Generated runs already carry invigilators; see the <Link href="/admin/schedules" className="text-primary hover:underline">Timetable</Link>.</p>}
    </div>
  );
}
