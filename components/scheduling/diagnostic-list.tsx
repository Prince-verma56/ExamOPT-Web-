"use client";

import { AlertTriangle, CircleAlert, Info, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Diagnostic } from "@/server/scheduling/domain";

const SEVERITY = {
  error: { icon: CircleAlert, label: "Error", className: "text-destructive", rail: "bg-destructive" },
  warning: { icon: AlertTriangle, label: "Warning", className: "text-[var(--examopt-warning)]", rail: "bg-[var(--examopt-warning)]" },
  info: { icon: Info, label: "Info", className: "text-primary", rail: "bg-primary" },
} as const;

const KIND_LABEL = { data: "Data problem", constraint: "Scheduling conflict", search: "Solver" } as const;

function Chips({ label, values }: { label: string; values?: string[] }) {
  if (!values?.length) return null;
  const shown = values.slice(0, 8);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-0.5 text-[11px] text-muted-foreground">{label}</span>
      {shown.map((value) => <code key={value} className="rounded border bg-muted/50 px-1.5 py-px font-mono text-[11px] text-foreground">{value}</code>)}
      {values.length > shown.length && <span className="text-[11px] text-muted-foreground">+{values.length - shown.length} more</span>}
    </div>
  );
}

/** Structured scheduling diagnostics: what failed, which records, which constraint, and what to do next. */
export function DiagnosticList({ diagnostics, empty = "No diagnostics.", className }: { diagnostics: Diagnostic[]; empty?: string; className?: string }) {
  if (!diagnostics.length) return <p className={cn("text-sm text-muted-foreground", className)}>{empty}</p>;
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...diagnostics].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <ul className={cn("space-y-2", className)}>
      {sorted.map((d, i) => {
        const severity = SEVERITY[d.severity];
        const Icon = severity.icon;
        return (
          <li key={`${d.code}-${i}`} className="relative overflow-hidden rounded-lg border bg-card py-3 pr-3 pl-4">
            <span className={cn("absolute inset-y-0 left-0 w-[3px]", severity.rail)} aria-hidden />
            <div className="flex items-start gap-2.5">
              <Icon className={cn("mt-0.5 size-4 shrink-0", severity.className)} aria-label={severity.label} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <code className="font-mono text-[11px] font-semibold tracking-tight text-foreground">{d.code}</code>
                  <span className="text-[11px] text-muted-foreground">{KIND_LABEL[d.kind]}{d.constraint ? ` · ${d.constraint}` : ""}</span>
                  {d.provesInfeasible && <span className="rounded-full border border-destructive/30 px-1.5 text-[10px] font-medium text-destructive">Proves infeasibility</span>}
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{d.message}</p>
                <Chips label="Exams" values={d.examIds} />
                <Chips label="Rooms" values={d.roomIds} />
                <Chips label="Slots" values={d.slotIds} />
                {d.remediation && (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Lightbulb className="mt-px size-3.5 shrink-0" aria-hidden /> <span><span className="font-medium text-foreground/80">Suggested action:</span> {d.remediation}</span>
                  </p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
