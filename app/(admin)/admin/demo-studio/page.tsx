import { DemoStudio } from "@/components/scheduling/demo-studio/demo-studio";
import type { DemoStudioInitial } from "@/components/scheduling/demo-studio/use-demo-controller";
import { ALGORITHMS, SCENARIOS, STUDIO_TABS } from "@/components/scheduling/demo-studio/types";

export const metadata = {
  title: "Judge Demo Studio | ExamOpt Studio",
  description: "Observe the scheduling algorithms, inject a controlled conflict into a sandbox, and watch the independent validator catch and confirm its correction.",
};

const pick = <T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T): T =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

/**
 * Deep links (`?tab=&source=&algorithm=&scenario=&guided=1&step=`) only choose what
 * is shown first. Values outside the allow-lists fall back to defaults, and
 * access is enforced by the admin layout and every demo API route regardless.
 */
export default async function DemoStudioPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const initial: DemoStudioInitial = {
    tab: pick(query.tab, STUDIO_TABS, "readiness"),
    source: pick(query.source, ["live", "fixture"] as const, "live"),
    algorithm: pick(query.algorithm, ALGORITHMS, "BACKTRACKING"),
    scenario: pick(query.scenario, SCENARIOS.map((s) => s.id), "STUDENT_OVERLAP"),
    guided: query.guided === "1",
    step: Math.max(0, Math.min(7, Number.parseInt(typeof query.step === "string" ? query.step : "0", 10) || 0)),
  };
  return <DemoStudio initial={initial} />;
}
