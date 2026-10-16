import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComingSoonPanelProps {
  title: string;
  description?: string;
  phase?: string;
  features?: string[];
  icon?: LucideIcon;
  className?: string;
}

export function ComingSoonPanel({
  title,
  description,
  phase = "Phase 2",
  features = [],
  icon: Icon = Construction,
  className,
}: ComingSoonPanelProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-gradient-to-br from-muted/30 to-muted/10 p-8",
        className
      )}
    >
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2.5">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <Badge variant="secondary" className="text-xs">
                {phase}
              </Badge>
            </div>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>

        {features.length > 0 && (
          <div className="w-full">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Planned capabilities
            </p>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/40" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2 rounded-md bg-muted/40 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Phase 1 complete.</span>{" "}
            This workspace will become fully functional when the {phase} scheduling engine is implemented.
          </p>
        </div>
      </div>
    </div>
  );
}
