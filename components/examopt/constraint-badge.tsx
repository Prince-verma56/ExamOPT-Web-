import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type ConstraintType =
  | "fixed_slot"
  | "unavailable_slot"
  | "requires_lab"
  | "requires_room"
  | "min_capacity"
  | "room_type";

interface ConstraintBadgeProps {
  type: ConstraintType;
  label?: string;
  className?: string;
}

const constraintConfig: Record<
  ConstraintType,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  fixed_slot: {
    label: "Fixed Slot",
    variant: "default",
    className: "bg-primary/15 text-primary border-primary/20 hover:bg-primary/20",
  },
  unavailable_slot: {
    label: "Unavailable",
    variant: "secondary",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  requires_lab: {
    label: "Lab Required",
    variant: "secondary",
    className: "bg-[var(--examopt-warning)]/10 text-[var(--examopt-warning)] border-[var(--examopt-warning)]/20",
  },
  requires_room: {
    label: "Room Req.",
    variant: "secondary",
    className: "bg-[var(--examopt-info)]/10 text-[var(--examopt-info)] border-[var(--examopt-info)]/20",
  },
  min_capacity: {
    label: "Min. Capacity",
    variant: "outline",
    className: "",
  },
  room_type: {
    label: "Room Type",
    variant: "outline",
    className: "",
  },
};

export function ConstraintBadge({ type, label, className }: ConstraintBadgeProps) {
  const config = constraintConfig[type];
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-medium", config.className, className)}
    >
      {label ?? config.label}
    </Badge>
  );
}
