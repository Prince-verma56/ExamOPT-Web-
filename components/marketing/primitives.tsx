/**
 * ExamOpt Studio — Marketing primitives
 * Shared layout and typography building blocks for the public homepage.
 * Display headings use Instrument Serif; everything else uses Geist Sans.
 * Type sizes come from the `type-*` utilities in app/globals.css.
 */

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** The page content grid: one max width and one gutter for every section. */
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
    <p className={cn("type-label flex items-center gap-3 text-muted-foreground", className)}>
      <span aria-hidden className="h-px w-6 bg-primary/50" />
      {children}
    </p>
  );
}

export const headingSizes = {
  hero: "type-hero",
  section: "type-section",
  panel: "type-panel",
} as const;

export type HeadingSize = keyof typeof headingSizes;

export function DisplayHeading({
  as: Tag = "h2",
  size = "section",
  id,
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3";
  id?: string;
  size?: HeadingSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag id={id} className={cn("text-balance text-foreground", headingSizes[size], className)}>
      {children}
    </Tag>
  );
}

/** Italic editorial emphasis — use for one meaningful phrase per heading. */
export function Em({ className, children }: { className?: string; children: React.ReactNode }) {
  return <em className={cn("italic text-primary", className)}>{children}</em>;
}

export function Lede({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("type-lede text-pretty text-muted-foreground", className)}>{children}</p>;
}

/** One button treatment for the whole homepage. Apply to <Link> / <a>. */
const ctaBase =
  "group inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium whitespace-nowrap outline-none transition-[background-color,border-color,box-shadow,transform] duration-300 ease-out active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export const ctaStyles = {
  primary: cn(
    ctaBase,
    "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_24px_-12px_rgb(40_85_199/0.7)] hover:bg-[#2249b0] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_14px_30px_-12px_rgb(40_85_199/0.8)]"
  ),
  secondary: cn(
    ctaBase,
    "border border-hairline bg-white/80 text-foreground shadow-[0_1px_2px_rgb(23_32_51/0.04)] backdrop-blur-sm hover:border-foreground/15 hover:bg-white"
  ),
  lg: "h-12 px-6 text-[15px]",
  sm: "h-10 px-4.5 text-sm",
} as const;

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
        "group inline-flex items-center gap-2 rounded-sm text-[15px] font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2",
        className
      )}
    >
      <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
        {children}
      </span>
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
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

/** Brand mark + wordmark, shared by the header and footer. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <BrandMark className="size-8" />
      <span className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">
        ExamOpt <span className="font-normal text-muted-foreground">Studio</span>
      </span>
    </span>
  );
}
