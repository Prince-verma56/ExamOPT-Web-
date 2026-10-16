"use client";

import { useMemo, useState } from "react";
import { Crosshair, FlaskConical, List, Network, Pin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ARC_LABEL_R, ARC_R, CENTER, LABEL_R, polar, ringLayout, SIZE } from "../graph-layout";
import { Segmented } from "../segmented";
import type { DemoSlot, GraphEdge, GraphNode, PlacedAssignment } from "./types";

/** Day d of n as a cobalt shade: darker for earlier days. Shades group slots without implying any ranking. */
const dayShade = (d: number, n: number) => `color-mix(in oklch, var(--primary), white ${Math.round(8 + (n > 1 ? (d / (n - 1)) * 52 : 0))}%)`;

export function DemoGraph({ nodes, edges, slots, assignments, errorExams, warningExams, overlapPairs, selected, onSelect, focusExamId, assignmentLabel }: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  slots: DemoSlot[];
  /** Candidate placements to colour by; omit to show the bare input graph. */
  assignments?: PlacedAssignment[];
  /** Exams in an actual validator violation (red). */
  errorExams?: Set<string>;
  /** Exams to watch (amber), e.g. the blockers of a rejected candidate. */
  warningExams?: Set<string>;
  /** Exam pairs the validator reports as an actual student overlap (red edge). */
  overlapPairs?: [string, string][];
  selected: string | null;
  onSelect: (id: string | null) => void;
  focusExamId?: string | null;
  assignmentLabel?: string;
}) {
  const [view, setView] = useState<"graph" | "list">("graph");
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  const { positions, arcs } = useMemo(() => ringLayout(nodes), [nodes]);
  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const neighbours = useMemo(() => {
    const map = new Map<string, GraphEdge[]>();
    for (const e of edges) {
      map.set(e.source, [...(map.get(e.source) ?? []), e]);
      map.set(e.target, [...(map.get(e.target) ?? []), e]);
    }
    return map;
  }, [edges]);
  const dates = useMemo(() => [...new Set(slots.map((s) => s.date))].sort(), [slots]);
  const slotById = useMemo(() => new Map(slots.map((s) => [s.id, s])), [slots]);
  const placed = useMemo(() => {
    const map = new Map<string, PlacedAssignment[]>();
    for (const a of assignments ?? []) map.set(a.examId, [...(map.get(a.examId) ?? []), a]);
    return map;
  }, [assignments]);
  const overlapKey = useMemo(() => new Set((overlapPairs ?? []).map(([a, b]) => [a, b].sort().join("|"))), [overlapPairs]);

  const active = hovered ?? selected ?? focusExamId ?? null;
  const activeSet = useMemo(() => {
    if (!active) return null;
    const set = new Set([active]);
    for (const e of neighbours.get(active) ?? []) { set.add(e.source); set.add(e.target); }
    return set;
  }, [active, neighbours]);
  const maxShared = Math.max(1, ...edges.map((e) => e.shared));
  const maxStudents = Math.max(1, ...nodes.map((n) => n.students));
  const q = query.trim().toLowerCase();
  const matches = q ? nodes.filter((n) => `${n.id} ${n.name}`.toLowerCase().includes(q)) : nodes;
  const sel = selected ? nodeById.get(selected) ?? null : null;

  const fillOf = (id: string) => {
    if (errorExams?.has(id)) return "var(--destructive)";
    const a = placed.get(id)?.[0];
    if (!a) return assignments ? "var(--muted-foreground)" : "color-mix(in oklch, var(--foreground), white 55%)";
    const slot = slotById.get(a.slotId);
    return slot ? dayShade(dates.indexOf(slot.date), dates.length) : "var(--primary)";
  };

  return (
    // Container query: lay out by the space this graph actually gets (it is also embedded in narrower panels).
    <div className="@container"><div className="grid gap-4 @3xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="overflow-hidden rounded-xl border bg-card" aria-label="Examination conflict graph">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
          <div className="relative w-full sm:w-60">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter exams" aria-label="Filter exams" className="h-8 pl-8"
              onKeyDown={(e) => { if (e.key === "Enter" && matches[0]) onSelect(matches[0].id); }} />
          </div>
          <div className="flex items-center gap-2">
            {assignmentLabel && <span className="hidden text-[11px] text-muted-foreground lg:inline">Colour: {assignmentLabel}</span>}
            <Segmented label="Graph view" value={view} onChange={setView} options={[{ value: "graph", label: "Graph", icon: Network }, { value: "list", label: "List", icon: List }]} />
          </div>
        </div>

        {view === "graph" ? (
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block aspect-square w-full max-w-170 select-none" role="group" aria-label={`${nodes.length} examinations and ${edges.length} shared-student relationships`} onClick={() => onSelect(null)}>
            {arcs.map((arc) => {
              const a = polar(ARC_R, arc.start), b = polar(ARC_R, arc.end - 0.02);
              const label = polar(ARC_LABEL_R, (arc.start + arc.end) / 2);
              return (
                <g key={arc.label} aria-hidden>
                  <path d={`M ${a.x} ${a.y} A ${ARC_R} ${ARC_R} 0 ${arc.end - arc.start > Math.PI ? 1 : 0} 1 ${b.x} ${b.y}`} fill="none" stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
                  <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[11px] font-medium">{arc.label}</text>
                </g>
              );
            })}
            <g aria-hidden>
              {edges.map((e) => {
                const p = positions.get(e.source), r = positions.get(e.target);
                if (!p || !r) return null;
                const violated = overlapKey.has([e.source, e.target].sort().join("|"));
                const lit = active && (e.source === active || e.target === active);
                const dim = (active && !lit && !violated) || (q && !matches.some((m) => m.id === e.source || m.id === e.target));
                const cx = CENTER + (p.x + r.x - 2 * CENTER) * 0.18, cy = CENTER + (p.y + r.y - 2 * CENTER) * 0.18;
                return (
                  <path key={`${e.source}-${e.target}`} d={`M ${p.x} ${p.y} Q ${cx} ${cy} ${r.x} ${r.y}`} fill="none"
                    stroke={violated ? "var(--destructive)" : lit ? "var(--primary)" : "var(--foreground)"}
                    strokeOpacity={violated ? 0.95 : lit ? 0.8 : dim ? 0.04 : 0.14}
                    strokeWidth={violated ? 4 : 0.75 + (e.shared / maxShared) * 3}
                    strokeDasharray={!violated && (e.crossCohort || e.backlogShared) ? "5 4" : undefined}
                    className="transition-[stroke-opacity,stroke] duration-300 motion-reduce:transition-none" />
                );
              })}
            </g>
            {nodes.map((n) => {
              const p = positions.get(n.id)!;
              const r = 6 + (n.students / maxStudents) * 8;
              const dim = (activeSet && !activeSet.has(n.id)) || (q && !matches.some((m) => m.id === n.id));
              const labelPos = polar(LABEL_R, p.angle);
              const flip = Math.cos(p.angle) < 0;
              const deg = (p.angle * 180) / Math.PI + (flip ? 180 : 0);
              const warn = warningExams?.has(n.id) && !errorExams?.has(n.id);
              const focus = focusExamId === n.id;
              return (
                <g key={n.id} role="button" tabIndex={0} aria-pressed={selected === n.id}
                  aria-label={`${n.id}, ${n.name}: ${n.students} students, shares students with ${n.degree} exams${placed.get(n.id) ? `, placed in ${placed.get(n.id)![0].slotId}` : ""}${errorExams?.has(n.id) ? ", in a violation" : ""}`}
                  className={cn("cursor-pointer outline-none transition-opacity duration-200 motion-reduce:transition-none [&:focus-visible>circle:first-child]:stroke-ring", dim && "opacity-20")}
                  onMouseEnter={() => setHovered(n.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(n.id)} onBlur={() => setHovered(null)}
                  onClick={(e) => { e.stopPropagation(); onSelect(selected === n.id ? null : n.id); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(selected === n.id ? null : n.id); } }}>
                  <circle cx={p.x} cy={p.y} r={r + 5} fill="transparent" stroke={focus ? "var(--primary)" : "transparent"} strokeWidth={2.5} />
                  {warn && <circle cx={p.x} cy={p.y} r={r + 3.5} fill="none" stroke="var(--examopt-warning)" strokeWidth={2.5} />}
                  <circle cx={p.x} cy={p.y} r={r} fill={fillOf(n.id)} stroke={selected === n.id ? "var(--foreground)" : "var(--card)"} strokeWidth={selected === n.id ? 2.5 : 2} className="transition-[fill] duration-300 motion-reduce:transition-none" />
                  {n.requiresLab && <circle cx={p.x} cy={p.y} r={r * 0.38} fill="var(--card)" />}
                  <text x={labelPos.x} y={labelPos.y} transform={`rotate(${deg} ${labelPos.x} ${labelPos.y})`} textAnchor={flip ? "end" : "start"} dominantBaseline="middle"
                    className={cn("fill-foreground font-mono text-[10.5px]", (selected === n.id || focus) && "font-semibold", errorExams?.has(n.id) && "fill-destructive")}>{n.id}{n.fixedSlotId ? " •" : ""}</text>
                </g>
              );
            })}
          </svg>
        ) : (
          <div className="max-h-120 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card"><TableRow><TableHead className="pl-3">Exam</TableHead><TableHead className="text-right">Students</TableHead><TableHead className="text-right">Degree</TableHead><TableHead className="pr-3">Placed</TableHead></TableRow></TableHeader>
              <TableBody>
                {[...matches].sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id)).map((n) => (
                  <TableRow key={n.id} className={cn("cursor-pointer", selected === n.id && "bg-primary/5", errorExams?.has(n.id) && "text-destructive")} onClick={() => onSelect(n.id)}>
                    <TableCell className="pl-3"><span className="font-mono text-xs font-semibold">{n.id}</span><span className="block max-w-56 truncate text-xs text-muted-foreground">{n.name}</span></TableCell>
                    <TableCell className="text-right tabular-nums">{n.students}</TableCell>
                    <TableCell className="text-right tabular-nums">{n.degree}</TableCell>
                    <TableCell className="pr-3 font-mono text-xs">{placed.get(n.id)?.map((a) => `${a.slotId} / ${a.roomId}`).join(", ") ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t px-3 py-2.5 text-[11px] text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-1.5"><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="5" fill={assignments ? "var(--muted-foreground)" : "color-mix(in oklch, var(--foreground), white 55%)"} /></svg>{assignments ? "Unassigned" : "Exam (no schedule shown)"}</li>
          {assignments && <li className="flex items-center gap-1.5"><span className="flex" aria-hidden>{[0, 1, 2].map((d) => <svg key={d} width="9" height="10"><circle cx="4.5" cy="5" r="4.5" fill={dayShade(d, 3)} /></svg>)}</span>Assigned (shade = day)</li>}
          <li className="flex items-center gap-1.5"><svg width="10" height="10" aria-hidden><circle cx="5" cy="5" r="5" fill="var(--destructive)" /></svg>In a validator violation</li>
          <li className="flex items-center gap-1.5"><svg width="14" height="14" aria-hidden><circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--examopt-warning)" strokeWidth="2" /></svg>Warning / blocker</li>
          <li className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2" /></svg>Shared students: must not overlap (not an error)</li>
          <li className="flex items-center gap-1.5"><svg width="22" height="6" aria-hidden><line x1="0" y1="3" x2="22" y2="3" stroke="var(--destructive)" strokeWidth="3" /></svg>Actual overlap in this candidate</li>
          <li>• fixed slot · hollow centre: lab</li>
        </ul>
      </section>

      <aside className="rounded-xl border bg-card" aria-live="polite">
        {sel ? (
          <>
            <div className="flex items-start justify-between gap-2 border-b p-4">
              <div className="min-w-0">
                <p className="font-mono text-xs text-muted-foreground">{sel.id}</p>
                <h3 className="font-display text-xl leading-tight">{sel.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{sel.program} · Semester {sel.semester}</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => onSelect(null)} aria-label="Clear selection"><X /></Button>
            </div>
            <dl className="grid grid-cols-3 gap-px bg-border text-sm">
              <div className="bg-card p-3"><dt className="text-[11px] text-muted-foreground">Students</dt><dd className="font-semibold tabular-nums">{sel.students}</dd></div>
              <div className="bg-card p-3"><dt className="text-[11px] text-muted-foreground">Degree</dt><dd className="font-semibold tabular-nums">{sel.degree}</dd></div>
              <div className="bg-card p-3"><dt className="text-[11px] text-muted-foreground">Placed</dt><dd className="truncate font-mono text-xs font-semibold">{placed.get(sel.id)?.[0]?.slotId ?? "—"}</dd></div>
            </dl>
            <div className="border-t p-4">
              <h4 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Time slots for this exam</h4>
              <div className="flex flex-wrap gap-1">
                {slots.map((s) => {
                  const permitted = sel.permittedSlotIds.includes(s.id);
                  const here = placed.get(sel.id)?.some((a) => a.slotId === s.id);
                  return (
                    <span key={s.id} title={permitted ? "Permitted" : sel.fixedSlotId ? `Fixed to ${sel.fixedSlotId}` : sel.unavailableSlotIds.includes(s.id) ? "Marked unavailable" : "Too short"}
                      className={cn("rounded border px-1.5 py-0.5 font-mono text-[10.5px]", here ? "border-primary bg-primary text-primary-foreground" : permitted ? "border-border" : "border-dashed text-muted-foreground line-through")}>{s.id}</span>
                  );
                })}
              </div>
              <p className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                {sel.requiresLab && <span className="inline-flex items-center gap-1"><FlaskConical className="size-3" />Laboratory</span>}
                {sel.fixedSlotId && <span className="inline-flex items-center gap-1"><Pin className="size-3 text-primary" />Fixed to {sel.fixedSlotId}</span>}
                <span>{sel.permittedSlotIds.length} of {slots.length} slots permitted before any conflict</span>
              </p>
            </div>
            <div className="border-t p-4">
              <h4 className="mb-2 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Shares students with</h4>
              <ul className="max-h-64 space-y-2 overflow-auto pr-1">
                {(neighbours.get(sel.id) ?? []).map((e) => ({ e, other: e.source === sel.id ? e.target : e.source })).sort((a, b) => b.e.shared - a.e.shared).map(({ e, other }) => {
                  const violated = overlapKey.has([sel.id, other].sort().join("|"));
                  return (
                    <li key={other}>
                      <button type="button" className="group w-full text-left" onClick={() => onSelect(other)}>
                        <span className="flex items-baseline justify-between gap-2 text-sm">
                          <span className={cn("font-mono text-xs font-semibold group-hover:text-primary", violated && "text-destructive")}>{other}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">{e.shared} student{e.shared > 1 ? "s" : ""}{e.backlogShared ? ` · ${e.backlogShared} backlog` : ""}{placed.get(other) ? ` · ${placed.get(other)![0].slotId}` : ""}</span>
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", violated ? "bg-destructive" : "bg-primary/70")} style={{ width: `${(e.shared / maxShared) * 100}%` }} /></span>
                      </button>
                    </li>
                  );
                })}
                {sel.degree === 0 && <li className="text-sm text-muted-foreground">No shared students: this exam may share a slot with any other.</li>}
              </ul>
            </div>
          </>
        ) : (
          <div className="space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><Crosshair className="size-4 text-primary" />Select an exam</p>
            <p className="text-sm leading-6 text-muted-foreground">An edge means the two exams share enrolled students, so they must not overlap. It is a constraint, not an error. Red appears only when the validator finds an actual overlap in the schedule shown.</p>
            <div className="flex flex-wrap gap-1.5">
              {[...nodes].sort((a, b) => b.degree - a.degree || b.students - a.students).slice(0, 8).map((n) => (
                <button key={n.id} type="button" onClick={() => onSelect(n.id)} className="rounded-md border px-2 py-1 font-mono text-xs hover:border-primary/50 hover:text-primary">{n.id} <span className="text-muted-foreground">{n.degree}</span></button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Most constrained exams by degree. Counts are aggregated; no student is identified.</p>
          </div>
        )}
      </aside>
    </div></div>
  );
}
