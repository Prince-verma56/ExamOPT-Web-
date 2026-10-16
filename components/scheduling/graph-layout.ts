/** Deterministic ring layout for the examination conflict graph, shared by Conflict Analysis and the Demo Studio. */

// Node ring, then radial node labels (~75px), then cohort arcs and their labels outside both.
export const SIZE = 760, CENTER = SIZE / 2, RING = 210, LABEL_R = RING + 20, ARC_R = RING + 102, ARC_LABEL_R = RING + 122;
export const PROGRAM_FILL: Record<string, string> = { BCA: "var(--chart-1)", "BCA-DS": "var(--chart-2)", MCA: "var(--chart-3)" };

export interface LayoutNode {
  id: string;
  program: string;
  semester: number;
}

/** Cohorts (program + semester) as arcs separated by gaps; nodes sorted within each cohort by id. */
export function ringLayout(nodes: LayoutNode[]) {
  const cohorts = new Map<string, LayoutNode[]>();
  for (const node of [...nodes].sort((a, b) => a.program.localeCompare(b.program) || a.semester - b.semester || a.id.localeCompare(b.id))) {
    const key = `${node.program} · S${node.semester}`;
    cohorts.set(key, [...(cohorts.get(key) ?? []), node]);
  }
  const gap = 0.16;
  const step = (Math.PI * 2 - gap * cohorts.size) / Math.max(1, nodes.length);
  const positions = new Map<string, { x: number; y: number; angle: number }>();
  const arcs: { label: string; start: number; end: number }[] = [];
  let angle = -Math.PI / 2 + gap / 2;
  for (const [label, members] of cohorts) {
    const start = angle;
    for (const node of members) {
      const a = angle + step / 2;
      positions.set(node.id, { x: CENTER + RING * Math.cos(a), y: CENTER + RING * Math.sin(a), angle: a });
      angle += step;
    }
    arcs.push({ label, start, end: angle });
    angle += gap;
  }
  return { positions, arcs };
}

export const polar = (r: number, a: number) => ({ x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) });
