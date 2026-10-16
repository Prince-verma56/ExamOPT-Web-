/**
 * ExamOpt Studio — Marketing primitives
 * Shared layout and typography building blocks for the public homepage.
 * Display headings use Instrument Serif; everything else uses Geist Sans.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1240px] px-4 sm:px-8 lg:px-10", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground",
        className
      )}
    >
      <span aria-hidden className="h-px w-6 bg-foreground/25" />
      {children}
    </p>
  );
}

const headingSizes = {
  hero: "text-[3.25rem] leading-[0.98] sm:text-[4.5rem] lg:text-[5.25rem] xl:text-[6rem]",
  section: "text-[2.5rem] leading-[1.02] sm:text-5xl lg:text-[3.5rem]",
  panel: "text-[2.125rem] leading-[1.04] sm:text-[2.5rem]",
} as const;

export function DisplayHeading({
  as: Tag = "h2",
  size = "section",
  id,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  id?: string;
  size?: keyof typeof headingSizes;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag id={id} className={cn("font-display text-balance text-foreground", headingSizes[size], className)}>
      {children}
    </Tag>
  );
}

/** Italic editorial emphasis — use for one meaningful phrase per heading. */
export function Em({ className, children }: { className?: string; children: React.ReactNode }) {
  return <em className={cn("italic text-primary", className)}>{children}</em>;
}

export function Lede({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p className={cn("text-pretty text-base leading-7 text-muted-foreground sm:text-[17px] sm:leading-[1.7]", className)}>
      {children}
    </p>
  );
}

export function ArrowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        className
      )}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** Small pill used to mark preview / sample content honestly. */
export function PreviewTag({ className, children = "Sample preview" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground",
        className
      )}
    >
      <span aria-hidden className="size-1 rounded-full bg-warning" />
      {children}
    </span>
  );
}

/** ExamOpt wordmark glyph: a 3x3 timetable grid with one placed exam. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={cn("size-7", className)}>
      <rect width="28" height="28" rx="7" className="fill-primary" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={6 + c * 6}
            y={6 + r * 6}
            width="4"
            height="4"
            rx="1"
            fill="white"
            opacity={r === 1 && c === 1 ? 1 : 0.38}
          />
        ))
      )}
    </svg>
  );
}
