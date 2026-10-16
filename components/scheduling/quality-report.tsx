"use client";

import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DataQualityReport, QualityIssue } from "@/server/scheduling/data-quality";

/** Errors then warnings, each with table, row and field. Long lists are capped with a count. */
export function QualityIssues({ report, limit = 40, className }: { report: DataQualityReport; limit?: number; className?: string }) {
  const issues: QualityIssue[] = [...report.errors, ...report.warnings];
  if (!issues.length) {
    return <p className={cn("flex items-center gap-2 text-sm text-success", className)}><CheckCircle2 className="size-4" />No errors or warnings: identifiers are unique, references resolve, values are in range and enrollment counts agree.</p>;
  }
  return (
    <div className={cn("space-y-2", className)}>
      <ul className="divide-y overflow-hidden rounded-lg border bg-card text-sm">
        {issues.slice(0, limit).map((issue, i) => (
          <li key={`${issue.code}-${issue.rowId}-${i}`} className="flex items-start gap-2.5 px-3 py-2">
            {issue.severity === "ERROR" ? <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-label="Error" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-label="Warning" />}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                <code className="font-mono font-semibold text-foreground">{issue.code}</code>
                <span>{issue.table} · {issue.rowId} · {issue.field}</span>
              </div>
              <p className="leading-relaxed text-foreground/90">{issue.message}</p>
            </div>
          </li>
        ))}
      </ul>
      {issues.length > limit && <p className="text-xs text-muted-foreground">{issues.length - limit} more not shown.</p>}
      {report.diagnostics.length > 0 && <ul className="space-y-0.5 text-xs text-muted-foreground">{report.diagnostics.map((d) => <li key={d}>{d}</li>)}</ul>}
    </div>
  );
}

export function QualityScore({ report }: { report: DataQualityReport }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className={cn("font-display text-5xl leading-none tabular-nums", report.isValid ? "text-foreground" : "text-destructive")}>{report.readinessScore}</span>
      <div className="text-xs text-muted-foreground">
        <p className={cn("font-medium", report.isValid ? "text-success" : "text-destructive")}>{report.isValid ? "Ready for optimisation" : "Validation failed"}</p>
        <p>100 − 20 per error − 5 per warning</p>
      </div>
    </div>
  );
}
