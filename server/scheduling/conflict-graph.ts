import type { Enrollment, Exam } from "./domain";

/**
 * Examination conflict graph built from actual enrollments: one vertex per
 * exam, one edge per pair of exams that share at least one student.
 * Vertices are indexed in the order of the `exams` array passed in, which the
 * model keeps sorted by id so the graph is deterministic.
 */
export interface ConflictGraph {
  n: number;
  /** Sorted neighbour indices per vertex. */
  adjacency: number[][];
  /** shared[a][b] = number of distinct students enrolled in both exams. */
  shared: number[][];
  /** Students on an edge who sit at least one of the two exams as a backlog/bridge course. */
  backlogShared: number[][];
  degree: number[];
  /** Distinct students per exam (from enrollments, not the declared count). */
  studentCount: number[];
  edges: { a: number; b: number; shared: number; backlogShared: number }[];
}

export interface GraphStats {
  examCount: number;
  edgeCount: number;
  density: number;
  maxDegree: number;
  averageDegree: number;
  isolatedExamIds: string[];
  highlyConstrainedExamIds: string[];
  /** Size of a clique found greedily. A lower bound on the slots any feasible schedule needs. */
  cliqueLowerBound: number;
  cliqueExamIds: string[];
  /** Colours used by an unconstrained Welsh-Powell colouring. An upper bound on the chromatic number. */
  welshPowellColors: number;
}

export function buildConflictGraph(exams: Exam[], enrollments: Enrollment[]): ConflictGraph {
  const n = exams.length;
  const index = new Map(exams.map((exam, i) => [exam.id, i]));
  const byStudent = new Map<string, Map<number, boolean>>();
  for (const enrollment of enrollments) {
    const examIndex = index.get(enrollment.examId);
    if (examIndex === undefined) continue;
    let examsForStudent = byStudent.get(enrollment.studentId);
    if (!examsForStudent) byStudent.set(enrollment.studentId, (examsForStudent = new Map()));
    examsForStudent.set(examIndex, (examsForStudent.get(examIndex) ?? false) || enrollment.isBacklog);
  }

  const shared = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const backlogShared = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const studentCount = new Array<number>(n).fill(0);
  for (const examsForStudent of byStudent.values()) {
    const list = [...examsForStudent.keys()].sort((a, b) => a - b);
    for (const i of list) studentCount[i]++;
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        const a = list[x], b = list[y];
        shared[a][b]++; shared[b][a]++;
        if (examsForStudent.get(a) || examsForStudent.get(b)) { backlogShared[a][b]++; backlogShared[b][a]++; }
      }
    }
  }

  const adjacency: number[][] = [];
  const edges: ConflictGraph["edges"] = [];
  for (let a = 0; a < n; a++) {
    const neighbours: number[] = [];
    for (let b = 0; b < n; b++) {
      if (a !== b && shared[a][b] > 0) {
        neighbours.push(b);
        if (a < b) edges.push({ a, b, shared: shared[a][b], backlogShared: backlogShared[a][b] });
      }
    }
    adjacency.push(neighbours);
  }

  return { n, adjacency, shared, backlogShared, degree: adjacency.map((list) => list.length), studentCount, edges };
}

/** Degree descending, then student count descending, then exam id: the Welsh-Powell vertex order. */
export function welshPowellOrder(graph: ConflictGraph, exams: Exam[]): number[] {
  return exams
    .map((_, i) => i)
    .sort((a, b) => graph.degree[b] - graph.degree[a] || graph.studentCount[b] - graph.studentCount[a] || exams[a].id.localeCompare(exams[b].id));
}

/** Plain Welsh-Powell colouring (no slot, room or fixed-slot constraints). */
export function welshPowellColoring(graph: ConflictGraph, exams: Exam[]): number[] {
  const order = welshPowellOrder(graph, exams);
  const color = new Array<number>(graph.n).fill(-1);
  let current = 0;
  let remaining = graph.n;
  while (remaining > 0) {
    for (const v of order) {
      if (color[v] !== -1) continue;
      if (graph.adjacency[v].some((u) => color[u] === current)) continue;
      color[v] = current;
      remaining--;
    }
    current++;
  }
  return color;
}

/** Greedy clique: start from each vertex, add neighbours in Welsh-Powell order while they stay adjacent to every member. */
export function greedyClique(graph: ConflictGraph, exams: Exam[]): number[] {
  const order = welshPowellOrder(graph, exams);
  let best: number[] = [];
  for (const start of order) {
    const clique = [start];
    for (const v of order) {
      if (v === start) continue;
      if (clique.every((u) => graph.shared[u][v] > 0)) clique.push(v);
    }
    if (clique.length > best.length) best = clique;
  }
  return best;
}

export function graphStats(graph: ConflictGraph, exams: Exam[]): GraphStats {
  const { n, degree } = graph;
  const edgeCount = graph.edges.length;
  const averageDegree = n ? degree.reduce((sum, d) => sum + d, 0) / n : 0;
  const variance = n ? degree.reduce((sum, d) => sum + (d - averageDegree) ** 2, 0) / n : 0;
  const threshold = averageDegree + Math.sqrt(variance);
  const clique = greedyClique(graph, exams);
  const colors = welshPowellColoring(graph, exams);
  return {
    examCount: n,
    edgeCount,
    density: n > 1 ? edgeCount / ((n * (n - 1)) / 2) : 0,
    maxDegree: n ? Math.max(...degree) : 0,
    averageDegree,
    isolatedExamIds: exams.filter((_, i) => degree[i] === 0).map((exam) => exam.id),
    highlyConstrainedExamIds: welshPowellOrder(graph, exams).filter((i) => degree[i] > 0 && degree[i] >= threshold).map((i) => exams[i].id),
    cliqueLowerBound: clique.length,
    cliqueExamIds: clique.map((i) => exams[i].id).sort(),
    welshPowellColors: n ? Math.max(...colors) + 1 : 0,
  };
}
