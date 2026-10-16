/**
 * ValidationSummaryPreview — the shape of an independent validation report,
 * filled with illustrative sample values. Not the result of a scheduling run.
 */

import { AlertTriangle, CircleX, ListChecks, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { PreviewTag } from "../primitives";

const rows = [
  { icon: ListChecks, label: "Constraint checks run", value: "312", tone: "text-foreground" },
  { icon: AlertTriangle, label: "Shared-student clashes", value: "1", tone: "text-warning" },
  { icon: CircleX, label: "Exams left unplaced", value: "1", tone: "text-destructive" },
];

export function ValidationSummaryPreview() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-foreground">Validation summary</p>
        <PreviewTag>Preview</PreviewTag>
      </div>

      <ul className="mt-4 divide-y divide-border/70">
        {rows.map(({ icon: Icon, label, value, tone }) => (
          <li key={label} data-val-row className="flex items-center gap-2.5 py-2.5 text-[12.5px]">
            <Icon className={cn("size-3.5 shrink-0", tone === "text-foreground" ? "text-muted-foreground" : tone)} aria-hidden />
            <span className="flex-1 text-foreground/85">{label}</span>
            <span className={cn("font-semibold tabular-nums", tone)}>{value}</span>
          </li>
        ))}
        <li data-val-row className="py-2.5 text-[12.5px]">
          <div className="flex items-center gap-2.5">
            <Gauge className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex-1 text-foreground/85">Average room utilisation</span>
            <span className="font-semibold tabular-nums text-foreground">74%</span>
          </div>
          <div aria-hidden className="ml-6 mt-2 h-1.5 overflow-hidden rounded-full bg-[#e8ecf5]">
            <div data-val-meter className="h-full w-[74%] rounded-full bg-primary" />
          </div>
        </li>
      </ul>

      <div data-val-note className="mt-4 rounded-lg border border-[#ecd3d6] bg-[#fdf7f7] p-3">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-destructive">Why MCA-104P was not placed</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-foreground/85">
          It needs a laboratory with at least 60 workstations, and every lab large enough is
          already booked in the remaining slots.
        </p>
      </div>
    </div>
  );
}
