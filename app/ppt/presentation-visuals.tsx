import Image from "next/image";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleAlert,
  Database,
  FileCheck2,
  GitBranch,
  Laptop,
  Layers3,
  Network,
  Server,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresentationSlide } from "./slides";

type VisualProps = {
  slide: PresentationSlide;
};

function ProductImageFrame({
  image,
  className,
  preload = false,
}: {
  image: NonNullable<PresentationSlide["image"]>;
  className?: string;
  preload?: boolean;
}) {
  return (
    <figure
      className={cn(
        "relative isolate overflow-hidden rounded-[22px] border border-[#dbe3f2] bg-[#f3f7ff] shadow-[0_28px_65px_-38px_rgba(23,32,51,0.45)]",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          preload={preload}
          sizes="(max-width: 1023px) 92vw, 58vw"
          className="object-contain"
        />
      </div>
      <figcaption className="absolute bottom-3 left-3 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#667085] shadow-sm backdrop-blur-sm">
        {image.caption}
      </figcaption>
    </figure>
  );
}

function MobilePlaceholder({ compact = false }: { compact?: boolean }) {
  const sessions = [
    ["Tue · 14 Jan", "10:00", "Data Analytics", "R-104"],
    ["Thu · 16 Jan", "12:00", "Artificial Intelligence", "Lab-1"],
    ["Fri · 17 Jan", "14:00", "Web Technology", "R-201"],
  ];

  return (
    <section
      aria-label="Portrait mobile application concept placeholder"
      className={cn(
        "relative overflow-hidden rounded-[2rem] border-[5px] border-[#172033] bg-white p-3 shadow-[0_24px_54px_-32px_rgba(23,32,51,0.65)]",
        compact ? "w-[138px]" : "w-[min(100%,244px)]",
      )}
    >
      <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-[#172033]" />
      <div className="flex items-center justify-between gap-2 border-b border-[#e5e7eb] pb-3">
        <div>
          <p className={cn("font-semibold text-[#172033]", compact ? "text-[9px]" : "text-[11px]")}>My timetable</p>
          <p className={cn("text-[#667085]", compact ? "text-[7px]" : "text-[8px]")}>Odd semester · concept</p>
        </div>
        <span className="grid size-6 place-items-center rounded-lg bg-[#eaf0ff] text-[#2855c7]">
          <CalendarDays className="size-3" />
        </span>
      </div>
      <div className={cn("space-y-2", compact ? "mt-2" : "mt-3")}>
        {sessions.map(([date, time, subject, room], index) => (
          <article key={subject} className="rounded-xl border border-[#e5e7eb] bg-[#fbfcff] p-2">
            <div className="flex items-center justify-between gap-1 text-[#667085]">
              <span className={compact ? "text-[6px]" : "text-[8px]"}>{date}</span>
              <span className={cn("font-semibold text-[#2855c7]", compact ? "text-[6px]" : "text-[8px]")}>{time}</span>
            </div>
            <p className={cn("mt-1 truncate font-semibold text-[#172033]", compact ? "text-[7px]" : "text-[9px]")}>{subject}</p>
            <p className={cn("mt-0.5 text-[#667085]", compact ? "text-[6px]" : "text-[7px]")}>{room}</p>
            {index === 0 && <span className="mt-1 block h-1 rounded-full bg-[#2855c7]" />}
          </article>
        ))}
      </div>
      {!compact && (
        <p className="mt-3 rounded-lg bg-[#fff7e8] px-2 py-1.5 text-center text-[7px] font-semibold uppercase tracking-[0.1em] text-[#9b6512]">
          Mobile concept placeholder
        </p>
      )}
    </section>
  );
}

function OpeningVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  return (
    <div className="relative" data-ppt-enter>
      <ProductImageFrame image={slide.image} preload className="rotate-[0.4deg]" />
      <div className="absolute -bottom-4 left-5 hidden max-w-[205px] rounded-2xl border border-[#dbe3f2] bg-white px-4 py-3 shadow-[0_18px_35px_-22px_rgba(23,32,51,0.45)] sm:block">
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#2855c7]">Scheduling workspace</p>
        <p className="mt-1 text-xs leading-snug text-[#667085]">Timetable, conflicts, rooms, and review in one visual workspace.</p>
      </div>
    </div>
  );
}

function ProblemVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  return (
    <div className="relative" data-ppt-enter>
      <ProductImageFrame image={slide.image} />
      <div className="absolute -bottom-3 right-4 flex items-center gap-2 rounded-xl border border-[#f3c9cf] bg-white px-3 py-2 shadow-[0_16px_34px_-24px_rgba(200,60,75,0.46)] sm:right-8 sm:px-4">
        <span className="grid size-7 place-items-center rounded-lg bg-[#fff0f2] text-[#c83c4b]">
          <CircleAlert className="size-3.5" />
        </span>
        <span className="text-[10px] font-semibold leading-tight text-[#172033]">Shared-student collision<br /><span className="font-normal text-[#667085]">needs a different assignment</span></span>
      </div>
    </div>
  );
}

function WorkflowVisual({ slide }: VisualProps) {
  const steps = [
    [Database, "Prepare", "Subjects, rooms, groups"],
    [Waypoints, "Generate", "Candidate assignments"],
    [ShieldCheck, "Validate", "Hard constraints"],
    [FileCheck2, "Review", "Publish approved result"],
  ] as const;
  return (
    <div className="rounded-[22px] border border-[#e1e6ef] bg-white p-4 shadow-[0_24px_55px_-40px_rgba(23,32,51,0.45)] sm:p-6" data-ppt-enter>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {steps.map(([Icon, label, detail], index) => (
          <div key={label} className="flex min-w-0 flex-1 items-center gap-3 sm:block">
            <div className="flex items-center gap-3 sm:flex-col sm:items-start">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#eaf0ff] text-[#2855c7]">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-[#172033]">{label}</p>
                <p className="mt-0.5 text-[10px] leading-snug text-[#667085]">{detail}</p>
              </div>
            </div>
            {index < steps.length - 1 && <ArrowRight className="ml-auto hidden size-4 text-[#9cb3e8] sm:mt-4 sm:block" />}
          </div>
        ))}
      </div>
      {slide.image && <ProductImageFrame image={slide.image} className="mt-5" />}
    </div>
  );
}

function EngineVisual() {
  const strategies = [
    ["First-Fit", "Fast baseline"],
    ["Welsh–Powell", "Graph-coloring heuristic"],
    ["Backtracking", "Alternative assignments"],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]" data-ppt-enter>
      <div className="rounded-[22px] border border-[#e1e6ef] bg-white p-4 shadow-[0_20px_48px_-40px_rgba(23,32,51,0.45)]">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#667085]">Conflict graph</p>
          <GitBranch className="size-4 text-[#2855c7]" />
        </div>
        <svg viewBox="0 0 240 160" className="mt-2 h-[165px] w-full" aria-label="Sample exam conflict graph">
          <g stroke="#b8c8ee" strokeWidth="2">
            <path d="M47 46 116 31M47 46l35 83M116 31l66 45M116 31l31 103M182 76l-35 58M82 129l65 5" />
          </g>
          {[
            [47, 46, "DBMS", "#eaf0ff", "#2855c7"],
            [116, 31, "CN", "#fff0f2", "#c83c4b"],
            [182, 76, "AI", "#eefbf7", "#12805c"],
            [82, 129, "OS", "#fff7e8", "#b7791f"],
            [147, 134, "DA", "#f2efff", "#6b4fc7"],
          ].map(([x, y, label, fill, text]) => (
            <g key={String(label)}>
              <circle cx={Number(x)} cy={Number(y)} r="22" fill={String(fill)} stroke={String(text)} strokeWidth="1.5" />
              <text x={Number(x)} y={Number(y) + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill={String(text)}>{String(label)}</text>
            </g>
          ))}
        </svg>
        <p className="text-[10px] leading-relaxed text-[#667085]">Edges represent shared-student constraints between exams.</p>
      </div>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {strategies.map(([title, body], index) => (
            <article key={title} className="rounded-2xl border border-[#e5e7eb] bg-white p-3">
              <span className="text-[10px] font-bold text-[#2855c7]">0{index + 1}</span>
              <h3 className="mt-3 text-xs font-bold text-[#172033]">{title}</h3>
              <p className="mt-1 text-[10px] leading-snug text-[#667085]">{body}</p>
            </article>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#dbe3f2] bg-[#f8faff] p-3 text-[10px] font-semibold text-[#172033]">
          <span className="rounded-lg bg-white px-2.5 py-2 shadow-sm">Scheduling</span>
          <ArrowRight className="size-3 text-[#8fa7dd]" />
          <span className="rounded-lg bg-white px-2.5 py-2 shadow-sm">Room allocation</span>
          <ArrowRight className="size-3 text-[#8fa7dd]" />
          <span className="rounded-lg bg-[#eaf0ff] px-2.5 py-2 text-[#2855c7]">Independent validation</span>
          <ArrowRight className="size-3 text-[#8fa7dd]" />
          <span className="rounded-lg bg-white px-2.5 py-2 shadow-sm">Result / diagnostic</span>
        </div>
      </div>
    </div>
  );
}

function ExperienceVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  return (
    <div className="relative grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_190px]" data-ppt-enter>
      <ProductImageFrame image={slide.image} />
      <div className="mx-auto flex flex-col items-center gap-3 sm:mx-0">
        <span className="rounded-full border border-[#dbe3f2] bg-[#eaf0ff] px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#2855c7]">Shared API</span>
        <MobilePlaceholder />
      </div>
    </div>
  );
}

function ArchitectureVisual() {
  const nodes = [
    [Database, "Input data"],
    [GitBranch, "Conflict graph"],
    [Waypoints, "Scheduling engine"],
    [Building2, "Room allocation"],
    [ShieldCheck, "Validator"],
    [Server, "Saved schedule"],
    [Laptop, "Web & mobile"],
  ] as const;
  return (
    <div className="rounded-[22px] border border-[#e1e6ef] bg-white p-4 shadow-[0_24px_55px_-40px_rgba(23,32,51,0.45)] sm:p-6" data-ppt-enter>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7 lg:items-center">
        {nodes.map(([Icon, label], index) => (
          <div key={label} className="contents lg:block">
            <div className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-[#e5e7eb] bg-[#fbfcff] p-3 text-center">
              <span className="grid size-9 place-items-center rounded-xl bg-[#eaf0ff] text-[#2855c7]"><Icon className="size-4" /></span>
              <p className="mt-2 text-[10px] font-bold leading-tight text-[#172033]">{label}</p>
            </div>
            {index < nodes.length - 1 && <ArrowRight className="mx-auto hidden size-4 text-[#9cb3e8] lg:block" />}
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-[#f8faff] px-4 py-3 text-[10px] text-[#667085]">
        <span className="inline-flex items-center gap-2"><Network className="size-3.5 text-[#2855c7]" /> Connected workflow, not a disconnected export.</span>
        <span className="hidden font-medium text-[#172033] sm:inline">Illustrative sample-data architecture</span>
      </div>
    </div>
  );
}

function VerificationVisual() {
  const checks = [
    [ShieldCheck, "Feasibility", "Does the proposed schedule respect the defined hard constraints?"],
    [FileCheck2, "Validator", "Re-check clashes, rooms, practical requirements, and slots."],
    [Layers3, "Implementation", "Keep type, lint, unit, and integration checks visible."],
    [Laptop, "Browser review", "Confirm the real workflow in the running application."],
  ] as const;
  return (
    <div className="grid gap-3 sm:grid-cols-2" data-ppt-enter>
      {checks.map(([Icon, title, detail]) => (
        <article key={title} className="rounded-[22px] border border-[#e1e6ef] bg-white p-4 shadow-[0_16px_36px_-32px_rgba(23,32,51,0.4)]">
          <span className="grid size-9 place-items-center rounded-xl bg-[#eaf0ff] text-[#2855c7]"><Icon className="size-4" /></span>
          <h3 className="mt-4 text-sm font-bold text-[#172033]">{title}</h3>
          <p className="mt-1.5 text-[11px] leading-relaxed text-[#667085]">{detail}</p>
        </article>
      ))}
      <div className="sm:col-span-2 flex items-center gap-2 rounded-2xl border border-[#f2dfb7] bg-[#fffaf0] px-4 py-3 text-[10px] leading-relaxed text-[#8a611d]">
        <CircleAlert className="size-4 shrink-0" /> Evidence should distinguish validation, implementation checks, and optimisation quality.
      </div>
    </div>
  );
}

function ClosingVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  const steps = ["Prepare", "Schedule", "Validate", "Review"];
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_170px]" data-ppt-enter>
      <div>
        <ProductImageFrame image={slide.image} />
        <div className="mt-3 flex items-center justify-between gap-1 rounded-xl border border-[#e1e6ef] bg-white p-2.5">
          {steps.map((step, index) => (
            <div key={step} className="contents">
              <span className="text-center text-[9px] font-bold text-[#172033]">{step}</span>
              {index < steps.length - 1 && <ArrowRight className="size-3 text-[#9cb3e8]" />}
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto sm:mx-0"><MobilePlaceholder compact /></div>
    </div>
  );
}

export function PresentationVisual({ slide }: VisualProps) {
  switch (slide.visual) {
    case "opening":
      return <OpeningVisual slide={slide} />;
    case "problem":
      return <ProblemVisual slide={slide} />;
    case "workflow":
      return <WorkflowVisual slide={slide} />;
    case "engine":
      return <EngineVisual />;
    case "experiences":
      return <ExperienceVisual slide={slide} />;
    case "architecture":
      return <ArchitectureVisual />;
    case "verification":
      return <VerificationVisual />;
    case "closing":
      return <ClosingVisual slide={slide} />;
  }
}
