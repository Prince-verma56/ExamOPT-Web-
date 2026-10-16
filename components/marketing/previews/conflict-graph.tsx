/**
 * ConflictGraphPreview — a small, legible graph of exams linked by the
 * relationship that stops them sharing a session. Sample data only.
 */

import { PreviewTag } from "../primitives";

const nodes = {
  a: { label: "BCA-302", x: 92, y: 50, flagged: true },
  b: { label: "BCADS-302", x: 240, y: 50, flagged: true },
  c: { label: "BCA-301", x: 52, y: 148 },
  d: { label: "MCA-101", x: 160, y: 190 },
  e: { label: "BCA-304P", x: 268, y: 150 },
} as const;

type NodeKey = keyof typeof nodes;
type EdgeKind = "shared" | "group" | "backlog";

const edges: { from: NodeKey; to: NodeKey; kind: EdgeKind }[] = [
  { from: "a", to: "b", kind: "shared" },
  { from: "a", to: "c", kind: "group" },
  { from: "a", to: "e", kind: "group" },
  { from: "c", to: "e", kind: "group" },
  { from: "c", to: "d", kind: "backlog" },
];

const edgeStyle: Record<EdgeKind, { stroke: string; dash?: string; width: number }> = {
  shared: { stroke: "#c83c4b", width: 2 },
  group: { stroke: "#2855c7", width: 1.25 },
  backlog: { stroke: "#b7791f", width: 1.25, dash: "4 4" },
};

const legend: { kind: EdgeKind; label: string }[] = [
  { kind: "shared", label: "Shared students, same session" },
  { kind: "group", label: "Same student group" },
  { kind: "backlog", label: "Backlog enrolment" },
];

export function ConflictGraphPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Conflict graph</p>
        <PreviewTag>Preview</PreviewTag>
      </div>

      <svg
        viewBox="0 0 320 220"
        role="img"
        aria-label="Sample conflict graph: BCA-302 and BCADS-302 share students in the same session; other exams are linked by student group or backlog enrolment."
        className="mt-3 w-full"
      >
        {edges.map(({ from, to, kind }) => {
          const s = edgeStyle[kind];
          return (
            <line
              key={`${from}-${to}`}
              x1={nodes[from].x}
              y1={nodes[from].y}
              x2={nodes[to].x}
              y2={nodes[to].y}
              stroke={s.stroke}
              strokeWidth={s.width}
              strokeDasharray={s.dash}
              strokeOpacity={kind === "shared" ? 0.9 : 0.45}
            />
          );
        })}
        {(Object.keys(nodes) as NodeKey[]).map((key) => {
          const n = nodes[key];
          const w = n.label.length * 6.4 + 18;
          const flagged = "flagged" in n && n.flagged;
          return (
            <g key={key}>
              <rect
                x={n.x - w / 2}
                y={n.y - 12}
                width={w}
                height={24}
                rx={12}
                fill="#ffffff"
                stroke={flagged ? "#c83c4b" : "#d9dbe3"}
                strokeWidth={flagged ? 1.4 : 1}
              />
              <text
                x={n.x}
                y={n.y + 3.8}
                textAnchor="middle"
                fontSize="10.5"
                fontWeight={600}
                fill="#172033"
                style={{ fontFamily: "var(--font-geist-sans)" }}
              >
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="mt-auto space-y-1.5 pt-3 text-[11.5px] text-muted-foreground">
        {legend.map(({ kind, label }) => {
          const s = edgeStyle[kind];
          return (
            <li key={kind} className="flex items-center gap-2">
              <svg viewBox="0 0 22 6" className="h-1.5 w-5.5 shrink-0" aria-hidden>
                <line x1="0" y1="3" x2="22" y2="3" stroke={s.stroke} strokeWidth="2" strokeDasharray={s.dash} />
              </svg>
              {label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
