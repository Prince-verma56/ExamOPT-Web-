import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    label: string;
    direction: "up" | "down" | "neutral";
  };
  status?: "ok" | "warning" | "error" | "pending";
  className?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  status = "ok",
  className,
}: MetricCardProps) {
  const statusColors = {
    ok: "border-l-[var(--examopt-success)]",
    warning: "border-l-[var(--examopt-warning)]",
    error: "border-l-destructive",
    pending: "border-l-muted-foreground",
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-5 shadow-sm border-l-4",
        statusColors[status],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-2 text-xs font-medium",
                trend.direction === "up" && "text-[var(--examopt-success)]",
                trend.direction === "down" && "text-destructive",
                trend.direction === "neutral" && "text-muted-foreground"
              )}
            >
              {trend.direction === "up" && "↑ "}
              {trend.direction === "down" && "↓ "}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {Icon && (
          <div className="flex-shrink-0 rounded-md bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </div>
  );
}
