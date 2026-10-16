"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, Crosshair, FlaskConical, Pin, RefreshCw, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, errorMessage } from "./api";
import { num } from "./format";
import { ARC_LABEL_R, ARC_R, CENTER, LABEL_R, polar, PROGRAM_FILL, ringLayout, SIZE } from "./graph-layout";
import { PageIntro, StatStrip } from "./page-intro";
import type { schedulingService } from "@/server/scheduling/service";

type GraphData = Awaited<ReturnType<typeof schedulingService.conflictGraph>>;
type Edge = GraphData["edges"][number];

export function ConflictAnalysis() {
  const [data, setData] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focusOnly, setFocusOnly] = useState(false);
  const [crossOnly, setCrossOnly] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try { setData(await api<GraphData>("/scheduling/conflict-graph")); } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => {
    // Initial fetch; state is set when the response arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const { positions, arcs } = useMemo(() => ringLayout(data?.nodes ?? []), [data]);
  const nodeById = useMemo(() => new Map((data?.nodes ?? []).map((n) => [n.id, n])), [data]);
  const neighbours = useMemo(() => {
    const map = new Map<string, Edge[]>();
    for (const e of data?.edges ?? []) {
      map.set(e.source, [...(map.get(e.source) ?? []), e]);
      map.set(e.target, [...(map.get(e.target) ?? []), e]);
    }
    return map;
  }, [data]);

  const active = hovered ?? selected;
  const activeSet = useMemo(() => {
    if (!active) return null;
    const set = new Set([active]);
    for (const e of neighbours.get(active) ?? []) { set.add(e.source); set.add(e.target); }
    return set;
  }, [active, neighbours]);
  const maxShared = Math.max(1, ...(data?.edges ?? []).map((e) => e.shared));
  const maxStudents = Math.max(1, ...(data?.nodes ?? []).map((n) => n.students));
  const matches = query.trim() ? (data?.nodes ?? []).filter((n) => `${n.id} ${n.name}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];

  const visibleEdges = (data?.edges ?? []).filter((e) =>
    (!crossOnly || e.crossCohort || e.backlogShared > 0) &&
    (!focusOnly || !selected || e.source === selected || e.target === selected));
  const tableEdges = [...visibleEdges].filter((e) => !selected || e.source === selected || e.target === selected).sort((a, b) => b.shared - a.shared || a.source.localeCompare(b.source));
  const sel = selected ? nodeById.get(selected) ?? null : null;
  const s = data?.stats;

  return (
    <div className="space-y-8 pb-8">
      <PageIntro
        eyebrow="Student conflict graph"
        title="Conflict Analysis"
        description="Each examination is a node; an edge joins two exams that share at least one enrolled student, so they can never run at the same time. Built from all actual enrollments, including backlog and bridge courses. Students are counted, never named."
        actions={<Button variant="outline" onClick={() => void load()}><RefreshCw />Reload</Button>}
      />

      {error && <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/4 p-4 text-sm text-destructive"><CircleAlert className="size-4" />{error}</div>}

      {!data && !error && <div className="space-y-4"><Skeleton className="h-21 rounded-xl" /><Skeleton className="h-160 rounded-xl" /></div>}

      {data && s && (
        <>
          <StatStrip items={[
            { label: "Examinations", value: s.examCount, hint: `${s.isolatedExamIds.length} isolated` },
            { label: "Conflict edges", value: s.edgeCount, hint: `${data.edges.filter((e) => e.crossCohort).length} cross-cohort` },
            { label: "Density", value: `${num(s.density * 100, 1)}%`, hint: "of all exam pairs" },
            { label: "Degree", value: `${s.maxDegree} max`, hint: `${num(s.averageDegree, 1)} average` },
            { label: "Largest clique", value: s.cliqueLowerBound, hint: "lower bound on slots" },
            { label: "WP colouring", value: s.welshPowellColors, hint: s.cliqueLowerBound === s.welshPowellColors ? "= lower bound: optimal" : "upper bound on slots" },
          ]} />

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="overflow-hidden rounded-xl border bg-card" aria-label="Conflict graph">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5">
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find an exam" aria-label="Find an exam" className="h-8 pl-8"
                    onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) { setSelected(matches[0].id); setQuery(""); } }} />
                  {matches.length > 0 && (
                    <ul className="absolute inset-x-0 top-9 z-20 overflow-hidden rounded-lg border bg-popover shadow-md">
                      {matches.map((m) => (
                        <li key={m.id}><button type="button" className="flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { setSelected(m.id); setQuery(""); }}>
                          <span className="font-mono text-xs font-semibold">{m.id}</span><span className="truncate text-xs text-muted-foreground">{m.name}</span>
                        </button></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2"><Switch checked={crossOnly} onCheckedChange={setCrossOnly} />Backlog / cross-cohort only</label>
                  <label className={cn("flex items-center gap-2", !selected && "opacity-50")}><Switch checked={focusOnly} disabled={!selected} onCheckedChange={setFocusOnly} />Focus selection</label>
                </div>
              </div>

              <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block aspect-square w-full max-w-190 select-none" role="group" aria-label={`${s.examCount} examinations and ${s.edgeCount} conflicts`} onClick={() => setSelected(null)}>
                {arcs.map((arc) => {
                  const a = polar(ARC_R, arc.start), b = polar(ARC_R, arc.end - 0.02);
                  const mid = (arc.start + arc.end) / 2, label = polar(ARC_LABEL_R, mid);
                  return (
                    <g key={arc.label} aria-hidden>
                      <path d={`M ${a.x} ${a.y} A ${ARC_R} ${ARC_R} 0 ${arc.end - arc.start > Math.PI ? 1 : 0} 1 ${b.x} ${b.y}`} fill="none" stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
                      <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[11px] font-medium">{arc.label}</text>
                    </g>
                  );
                })}

                <g aria-hidden>
                  {visibleEdges.map((e) => {
                    const p = positions.get(e.source)!, q = positions.get(e.target)!;
                    const lit = active && (e.source === active || e.target === active);
                    const dim = active && !lit;
                    const cx = CENTER + (p.x + q.x - 2 * CENTER) * 0.18, cy = CENTER + (p.y + q.y - 2 * CENTER) * 0.18;
                    return (
                      <path key={`${e.source}-${e.target}`} d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${q.x} ${q.y}`} fill="none"
                        stroke={lit ? "var(--primary)" : "var(--foreground)"} strokeOpacity={lit ? 0.85 : dim ? 0.04 : 0.16}
                        strokeWidth={0.75 + (e.shared / maxShared) * 3.25} strokeDasharray={e.crossCohort || e.backlogShared ? "5 4" : undefined}
                        className="transition-[stroke-opacity] duration-200" />
                    );
                  })}
                </g>

                {data.nodes.map((n) => {
                  const p = positions.get(n.id)!;
                  const r = 6 + (n.students / maxStudents) * 8;
                  const dim = (activeSet && !activeSet.has(n.id)) || (focusOnly && selected && !activeSet?.has(n.id));
                  const labelPos = polar(LABEL_R, p.angle);
                  const flip = Math.cos(p.angle) < 0;
                  const deg = (p.angle * 180) / Math.PI + (flip ? 180 : 0);
                  return (
                    <g key={n.id} role="button" tabIndex={0} aria-pressed={selected === n.id}
                      aria-label={`${n.id}, ${n.name}: ${n.students} students, conflicts with ${n.degree} exams`}
                      className={cn("cursor-pointer outline-none transition-opacity duration-200 [&:focus-visible>circle:first-child]:stroke-ring", dim && "opacity-20")}
                      onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(n.id)} onBlur={() => setHovered(null)}
                      onClick={(e) => { e.stopPropagation(); setSelected(selected === n.id ? null : n.id); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(selected === n.id ? null : n.id); } }}>
                      <circle cx={p.x} cy={p.y} r={r + 4} fill="transparent" stroke="transparent" strokeWidth={2} />
                      <circle cx={p.x} cy={p.y} r={r} fill={PROGRAM_FILL[n.program] ?? "var(--muted-foreground)"} stroke={selected === n.id ? "var(--foreground)" : "var(--card)"} strokeWidth={selected === n.id ? 2.5 : 2} />
                      {n.requiresLab && <circle cx={p.x} cy={p.y} r={r * 0.38} fill="var(--card)" />}
                      {n.highlyConstrained && <circle cx={p.x} cy={p.y} r={r + 3.5} fill="none" stroke="var(--foreground)" strokeWidth={1} strokeDasharray="2 2" />}
                      <text x={labelPos.x} y={labelPos.y} transform={`rotate(${deg} ${labelPos.x} ${labelPos.y})`} textAnchor={flip ? "end" : "start"} dominantBaseline="middle"
                        className={cn("fill-foreground font-mono text-[10.5px]", (selected === n.id || hovered === n.id) && "font-semibold")}>{n.id}{n.fixedSlotId ? " •" : ""}</text>
                    </g>
                  );
                })}
              </svg>

              <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t px-4 py-3 text-xs text-muted-foreground" aria-label="Legend">
                {Object.entries(PROGRAM_FILL).map(([p, c]) => <li key={p} className="flex items-center gap-1.5"><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="5" fill={c} /></svg>{p}</li>)}
                <li className="flex items-center gap-1.5"><svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="6" fill="var(--muted-foreground)" /><circle cx="6" cy="6" r="2.3" fill="var(--card)" /></svg>Practical (lab)</li>
                <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeDasharray="2 2" /></svg>Highly constrained</li>
                <li>• fixed slot</li>
                <li className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" /></svg>Backlog / cross-cohort</li>
                <li>Node size: students · line width: shared students</li>
              </ul>
            </section>

            <aside className="space-y-4">
              {sel ? (
                <div className="rounded-xl border bg-card">
                  <div className="flex items-start justify-between gap-2 border-b p-4">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{sel.id}</p>
                      <h2 className="font-display text-2xl leading-tight">{sel.name}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">{sel.program} · Semester {sel.semester}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => setSelected(null)} aria-label="Clear selection"><X /></Button>
                  </div>
                  <dl className="grid grid-cols-3 gap-px bg-border text-sm">
                    <div className="bg-card p-3"><dt className="text-[11px] text-muted-foreground">Students</dt><dd className="font-semibold tabular-nums">{sel.students}</dd></div>
                    <div className="bg-card p-3"><dt className="text-[11px] text-muted-foreground">Conflicts</dt><dd className="font-semibold tabular-nums">{sel.degree}</dd></div>
                    <div className="bg-card p-3"><dt className="text-[11px] text-muted-foreground">Shared seats</dt><dd className="font-semibold tabular-nums">{(neighbours.get(sel.id) ?? []).reduce((sum, e) => sum + e.shared, 0)}</dd></div>
                  </dl>
                  <div className="flex flex-wrap gap-1.5 border-t p-3 text-[11px]">
                    {sel.requiresLab && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"><FlaskConical className="size-3" />Laboratory</span>}
                    {sel.fixedSlotId && <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"><Pin className="size-3 text-primary" />Fixed to {sel.fixedSlotId}</span>}
                    {sel.unavailableSlotIds.length > 0 && <span className="rounded-full border px-2 py-0.5">Unavailable: {sel.unavailableSlotIds.join(", ")}</span>}
                    {sel.highlyConstrained && <span className="rounded-full border px-2 py-0.5">Highly constrained</span>}
                  </div>
                  <div className="border-t p-4">
                    <h3 className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">Cannot share a slot with</h3>
                    <ul className="space-y-2">
                      {(neighbours.get(sel.id) ?? []).map((e) => ({ e, other: nodeById.get(e.source === sel.id ? e.target : e.source)! })).sort((a, b) => b.e.shared - a.e.shared).map(({ e, other }) => (
                        <li key={other.id}>
                          <button type="button" className="group w-full text-left" onClick={() => setSelected(other.id)}>
                            <span className="flex items-baseline justify-between gap-2 text-sm">
                              <span className="font-mono text-xs font-semibold group-hover:text-primary">{other.id}</span>
                              <span className="text-xs tabular-nums text-muted-foreground">{e.shared} student{e.shared > 1 ? "s" : ""}{e.backlogShared ? ` · ${e.backlogShared} backlog` : ""}</span>
                            </span>
                            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${(e.shared / maxShared) * 100}%` }} /></span>
                          </button>
                        </li>
                      ))}
                      {sel.degree === 0 && <li className="text-sm text-muted-foreground">No conflicts: this exam can share a slot with any other.</li>}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-medium"><Crosshair className="size-4 text-primary" />Select an exam</p>
                  <p className="text-sm leading-6 text-muted-foreground">Hover or tab to a node to preview its conflicts; click or press Enter to pin it. Press Escape to clear.</p>
                  <div>
                    <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Most constrained</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {[...data.nodes].sort((a, b) => b.degree - a.degree || b.students - a.students).slice(0, 8).map((n) => (
                        <button key={n.id} type="button" onClick={() => setSelected(n.id)} className="rounded-md border px-2 py-1 font-mono text-xs hover:border-primary/50 hover:text-primary">{n.id} <span className="text-muted-foreground">{n.degree}</span></button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Largest clique · {s.cliqueLowerBound} exams</h3>
                    <p className="text-xs leading-5 text-muted-foreground">These exams share students pairwise, so each needs its own slot: <span className="font-mono text-foreground">{s.cliqueExamIds.join(", ")}</span>.</p>
                  </div>
                </div>
              )}
            </aside>
          </div>

          <Tabs defaultValue="edges">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{sel ? `Conflicts of ${sel.id}` : "All conflicts"} <span className="font-normal text-muted-foreground">· table view</span></h2>
              <TabsList><TabsTrigger value="edges">Conflict pairs · {tableEdges.length}</TabsTrigger><TabsTrigger value="exams">Exams · {data.nodes.length}</TabsTrigger></TabsList>
            </div>
            <TabsContent value="edges" className="mt-3">
              <div className="max-h-105 overflow-auto rounded-xl border bg-card">
                <Table>
                  <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead className="pl-4">Exam A</TableHead><TableHead>Exam B</TableHead><TableHead className="text-right">Shared students</TableHead><TableHead className="text-right">Via backlog</TableHead><TableHead className="pr-4">Type</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {tableEdges.map((e) => (
                      <TableRow key={`${e.source}-${e.target}`}>
                        <TableCell className="pl-4"><button type="button" className="font-mono text-xs font-semibold hover:text-primary" onClick={() => setSelected(e.source)}>{e.source}</button></TableCell>
                        <TableCell><button type="button" className="font-mono text-xs font-semibold hover:text-primary" onClick={() => setSelected(e.target)}>{e.target}</button></TableCell>
                        <TableCell className="text-right tabular-nums">{e.shared}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{e.backlogShared || "—"}</TableCell>
                        <TableCell className="pr-4 text-xs">{e.crossCohort ? "Cross-cohort" : "Same cohort"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
            <TabsContent value="exams" className="mt-3">
              <div className="max-h-105 overflow-auto rounded-xl border bg-card">
                <Table>
                  <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead className="pl-4">Exam</TableHead><TableHead>Cohort</TableHead><TableHead className="text-right">Students</TableHead><TableHead className="text-right">Conflicts</TableHead><TableHead className="pr-4">Constraints</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {[...data.nodes].sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id)).map((n) => (
                      <TableRow key={n.id} className={cn("cursor-pointer", selected === n.id && "bg-primary/5")} onClick={() => setSelected(n.id)}>
                        <TableCell className="pl-4"><span className="font-mono text-xs font-semibold">{n.id}</span><span className="block max-w-72 truncate text-xs text-muted-foreground">{n.name}</span></TableCell>
                        <TableCell className="text-xs">{n.program} · S{n.semester}</TableCell>
                        <TableCell className="text-right tabular-nums">{n.students}</TableCell>
                        <TableCell className="text-right tabular-nums">{n.degree}</TableCell>
                        <TableCell className="pr-4 text-xs text-muted-foreground">{[n.requiresLab && "Lab", n.fixedSlotId && `Fixed ${n.fixedSlotId}`, n.unavailableSlotIds.length && `Not ${n.unavailableSlotIds.join(", ")}`].filter(Boolean).join(" · ") || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
