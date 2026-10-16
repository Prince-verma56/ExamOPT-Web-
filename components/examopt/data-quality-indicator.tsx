import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";

type QualityStatus = "good" | "warning" | "error" | "pending";

interface DataQualityItem {
  label: string;
  status: QualityStatus;
  detail?: string;
}

interface DataQualityIndicatorProps {
  items: DataQualityItem[];
  title?: string;
  className?: string;
}

const statusConfig: Record<
  QualityStatus,
  { icon: typeof CheckCircle; color: string; bg: string }
> = {
  good: {
    icon: CheckCircle,
    color: "text-[var(--examopt-success)]",
    bg: "bg-[var(--examopt-success)]/10",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-[var(--examopt-warning)]",
    bg: "bg-[var(--examopt-warning)]/10",
  },
  error: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
  },
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

export function DataQualityIndicator({
  items,
  title = "Data Quality",
  className,
}: DataQualityIndicatorProps) {
  const overallStatus: QualityStatus = items.some((i) => i.status === "error")
    ? "error"
    : items.some((i) => i.status === "warning")
    ? "warning"
    : items.some((i) => i.status === "pending")
    ? "pending"
    : "good";

  const { icon: OverallIcon, color: overallColor } = statusConfig[overallStatus];

  return (
    <div className={cn("rounded-lg border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center gap-2 mb-3">
        <OverallIcon className={cn("h-4 w-4", overallColor)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item, i) => {
          const { icon: StatusIcon, color, bg } = statusConfig[item.status];
          return (
            <li key={i} className="flex items-start gap-2">
              <div className={cn("mt-0.5 rounded-full p-0.5", bg)}>
                <StatusIcon className={cn("h-3 w-3", color)} />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-medium text-foreground">{item.label}</span>
                {item.detail && (
                  <span className="ml-1 text-xs text-muted-foreground">— {item.detail}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
