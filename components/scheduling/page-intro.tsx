import { cn } from "@/lib/utils";

/** Editorial page header used across the scheduling workspace. */
export function PageIntro({ eyebrow, title, description, actions, className }: {
  eyebrow: string;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 border-b pb-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-2xl">
        <p className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-muted-foreground uppercase">
          <span className="h-px w-6 bg-border" aria-hidden />{eyebrow}
        </p>
        <h1 className="mt-2 font-heading text-4xl leading-none font-semibold tracking-tight text-foreground md:text-[2.75rem]">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 lg:shrink-0">{actions}</div>}
    </header>
  );
}

/** Divided row of figures; reads as one instrument rather than a grid of cards. */
export function StatStrip({ items, className }: { items: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "warning" | "error" }[]; className?: string }) {
  return (
    <dl className={cn("grid grid-cols-2 overflow-hidden rounded-xl border bg-card sm:grid-cols-3 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none", className)}>
      {items.map((item) => (
        <div key={item.label} className="border-r border-b px-4 py-3.5 last:border-r-0 lg:border-b-0">
          <dt className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{item.label}</dt>
          <dd className={cn("mt-1 text-xl font-semibold tabular-nums tracking-tight", item.tone === "warning" && "text-warning", item.tone === "error" && "text-destructive")}>{item.value}</dd>
          {item.hint && <dd className="mt-0.5 truncate text-xs text-muted-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}
