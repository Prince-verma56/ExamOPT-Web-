"use client";

import { CircleDashed, FileWarning, OctagonX, ShieldCheck, ShieldQuestion, ShieldX, Timer, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { RunOutcome } from "@/server/scheduling/domain";

type Tone = "success" | "warning" | "error" | "neutral";

export const OUTCOME_META: Record<RunOutcome, { label: string; tone: Tone; icon: LucideIcon; explain: string }> = {
  FEASIBLE: { label: "Feasible", tone: "success", icon: ShieldCheck, explain: "Every exam is assigned and the independent validator found zero hard-constraint violations." },
  PARTIAL: { label: "Partial", tone: "warning", icon: CircleDashed, explain: "A heuristic left some exams unscheduled. This does not prove that no schedule exists." },
  SEARCH_LIMIT: { label: "Search limit", tone: "warning", icon: Timer, explain: "The bounded search stopped at its node or time budget. Feasibility is unknown." },
  INFEASIBLE: { label: "Infeasible", tone: "error", icon: OctagonX, explain: "No schedule can satisfy every hard constraint." },
  INVALID: { label: "Invalid", tone: "error", icon: ShieldX, explain: "The solver's assignments failed independent validation. This schedule must not be published." },
  INVALID_INPUT: { label: "Input rejected", tone: "error", icon: FileWarning, explain: "Preflight found data errors, so no solver was run." },
};

export const TONE_CLASS: Record<Tone, string> = {
  success: "border-[color-mix(in_oklch,var(--examopt-success),transparent_70%)] bg-[color-mix(in_oklch,var(--examopt-success),transparent_92%)] text-[var(--examopt-success)]",
  warning: "border-[color-mix(in_oklch,var(--examopt-warning),transparent_65%)] bg-[color-mix(in_oklch,var(--examopt-warning),transparent_91%)] text-[color-mix(in_oklch,var(--examopt-warning),black_22%)]",
  error: "border-destructive/30 bg-destructive/[0.07] text-destructive",
  neutral: "border-border bg-muted/60 text-muted-foreground",
};

const EVIDENCE: Record<string, string> = {
  "necessary-condition": "Established by a necessary-condition check during preflight.",
  "exhaustive-search": "Established by exhausting the complete backtracking search.",
};

export function OutcomeBadge({ outcome, evidence, legacy, size = "default", className }: {
  outcome: RunOutcome;
  evidence?: string | null;
  /** Runs created before the Phase 2 engine: their stored status was never independently validated. */
  legacy?: boolean;
  size?: "default" | "lg";
  className?: string;
}) {
  const meta = legacy ? { label: "Unverified", tone: "neutral" as Tone, icon: ShieldQuestion, explain: "Created outside the Phase 2 engine. Its stored status was not independently validated; open the run to re-validate it against current data." } : OUTCOME_META[outcome];
  const Icon = meta.icon;
  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-medium whitespace-nowrap outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          size === "lg" ? "h-8 px-3 text-sm" : "h-6 px-2 text-xs",
          TONE_CLASS[meta.tone], className,
        )}
      >
        <Icon className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden />
        {meta.label}
        {outcome === "INFEASIBLE" && !legacy && evidence && <span className="font-normal opacity-80">· proven</span>}
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-xs leading-relaxed">
        {meta.explain}
        {outcome === "INFEASIBLE" && evidence && EVIDENCE[evidence] && <> {EVIDENCE[evidence]}</>}
      </TooltipContent>
    </Tooltip>
  );
}
