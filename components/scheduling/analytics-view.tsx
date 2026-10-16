"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage } from "./api";
import { ALGORITHM_LABEL, num } from "./format";
import { PageIntro } from "./page-intro";
import { ComparisonTable, rowFromSummary } from "./run-views";
import type { RunSummary } from "@/server/scheduling/persistence";
import type { schedulingService } from "@/server/scheduling/service";

type Published = Awaited<ReturnType<typeof schedulingService.publishedSchedule>>;
type Benchmarks = { runs: (RunSummary & { rank: number })[]; sameDataset: boolean };

function Bar({ label, value, max, detail }: { label: string; value: number; max: number; detail: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3 text-xs"><span>{label}</span><span className="font-mono tabular-nums text-muted-foreground">{detail}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-(--chart-1)" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} /></div>
    </div>
  );
}

/** Every figure here is computed from saved runs or the published timetable; nothing is hard-coded. */
export function AnalyticsView() {
  const [bench, setBench] = useState<Benchmarks | null>(null);
  const [published, setPublished] = useState<Published | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, p] = await Promise.all([api<Benchmarks>("/benchmarks"), api<Published>("/scheduling/published")]);
      setBench(b); setPublished(p);
    } catch (e) { setError(errorMessage(e)); }
  }, []);

  useEffect(() => {
    // Initial fetch; state is set after the responses.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const usage = useMemo(() => {
    const byType = new Map<string, { students: number; seats: number; exams: number }>();
    const byProgram = new Map<string, number>();
    for (const a of published?.assignments ?? []) {
      const type = a.roomType === "LAB" ? "Laboratories" : "Theory rooms";
      const t = byType.get(type) ?? { students: 0, seats: 0, exams: 0 };
      byType.set(type, { students: t.students + (a.students ?? 0), seats: t.seats + (a.roomCapacity ?? 0), exams: t.exams + 1 });
      byProgram.set(a.program ?? "—", (byProgram.get(a.program ?? "—") ?? 0) + (a.students ?? 0));
    }
    return { byType: [...byType], byProgram: [...byProgram].sort((a, b) => b[1] - a[1]) };
  }, [published]);
  const totalSeats = usage.byProgram.reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="space-y-10 pb-8">
      <PageIntro eyebrow="Operations" title="Analytics" description="Quality metrics of the latest engine run per strategy, and seat usage in the published timetable. All figures are computed from saved assignments and enrollments." actions={<Button variant="outline" onClick={() => void load()}><RefreshCw />Reload</Button>} />

      {error && <p className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><CircleAlert className="size-4" />{error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Latest run per strategy</h2>
        {!bench ? <Skeleton className="h-48 rounded-xl" /> : bench.runs.length ? (
          <>
            <ComparisonTable rows={bench.runs.map(rowFromSummary)} caption={bench.sameDataset ? "All three runs used the same dataset." : "These runs were generated on different datasets, so the comparison is not like-for-like."} />
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-120 text-sm">
                <caption className="px-4 pt-3 text-left text-xs text-muted-foreground">Distance in slots between each student&apos;s consecutive exams (more spread is kinder to students)</caption>
                <thead><tr className="text-left text-xs text-muted-foreground"><th className="px-4 py-2 font-medium">Strategy</th><th className="px-2 py-2 text-right font-medium">Adjacent</th><th className="px-2 py-2 text-right font-medium">2 slots</th><th className="px-2 py-2 text-right font-medium">3 slots</th><th className="px-4 py-2 text-right font-medium">4+ slots</th></tr></thead>
                <tbody>{bench.runs.map((r) => r.metrics && (
                  <tr key={r.runId} className="border-t"><td className="px-4 py-2">{ALGORITHM_LABEL[r.algorithm]}</td>{(["adjacent", "gap2", "gap3", "gap4Plus"] as const).map((k, i) => <td key={k} className={`${i === 3 ? "px-4" : "px-2"} py-2 text-right tabular-nums`}>{num(r.metrics!.gapHistogram[k])}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          </>
        ) : <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No engine runs yet. Run the strategies in the <Link href="/admin/optimization" className="text-primary hover:underline">Optimization Lab</Link>.</p>}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">Published timetable</h2>
          {published?.publication && <p className="text-xs text-muted-foreground">Version {published.publication.version} · run {published.publication.runId}</p>}
        </div>
        {!published ? <Skeleton className="h-40 rounded-xl" /> : !published.publication ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing has been published yet.</p> : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <h3 className="text-sm font-medium">Seat fill by room type</h3>
              {usage.byType.map(([type, t]) => <Bar key={type} label={`${type} · ${t.exams} exams`} value={t.students} max={t.seats} detail={`${num((t.students / Math.max(1, t.seats)) * 100, 1)}% · ${num(t.students)} of ${num(t.seats)} seats`} />)}
            </div>
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <h3 className="text-sm font-medium">Exam seats by program</h3>
              {usage.byProgram.map(([program, n]) => <Bar key={program} label={program} value={n} max={totalSeats} detail={`${num((n / Math.max(1, totalSeats)) * 100, 1)}% · ${num(n)}`} />)}
              <p className="text-xs text-muted-foreground">One seat per student per exam, so backlog students count once for each exam they sit.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
