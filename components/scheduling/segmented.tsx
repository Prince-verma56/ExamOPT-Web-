"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

/** Single-choice segmented control with radio-group semantics and arrow-key navigation. */
export function Segmented<T extends string>({ value, onChange, options, label, className }: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }[];
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (index: number) => {
    const next = (index + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex h-8 items-center rounded-lg border bg-muted/50 p-0.5", className)}>
      {options.map((option, i) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); move(i + 1); }
              if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); move(i - 1); }
            }}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              active ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/5" : "hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-3.5" />}{option.label}
          </button>
        );
      })}
    </div>
  );
}
