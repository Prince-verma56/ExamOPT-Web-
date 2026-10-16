"use client";

import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Database,
  FileCheck2,
  GitBranch,
  Layers3,
  Network,
  Server,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sliders,
  Sparkles,
  Waypoints,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PresentationSlide } from "./slides";

type VisualProps = {
  slide: PresentationSlide;
};

export type MobileScreenKey = "timetable" | "calendar" | "conflict" | "auth";

export const MOBILE_SCREEN_CONFIG: Record<
  MobileScreenKey,
  {
    title: string;
    label: string;
    badge: string;
    src: string;
    alt: string;
    caption: string;
    description: string;
  }
> = {
  timetable: {
    title: "Student Timetable",
    label: "Timetable",
    badge: "Personal Feed",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM (2).jpeg",
    alt: "Mobile student examination timetable with course codes, rooms AB-1 to AB-4, and time slots",
    caption: "Personal Timetable Feed",
    description: "Chronological schedule with hall numbers and exam timings",
  },
  calendar: {
    title: "Monthly Calendar",
    label: "Calendar",
    badge: "Monthly View",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM (1).jpeg",
    alt: "Mobile interactive monthly examination calendar for October 2026",
    caption: "Monthly Exam Calendar",
    description: "Interactive calendar highlighting scheduled exam days & rooms",
  },
  conflict: {
    title: "Conflict Alert",
    label: "Clash Alert",
    badge: "Proactive Warning",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.08 PM (1).jpeg",
    alt: "Mobile examination clash warning showing hard constraint violation between BCS0012 and BCS0014",
    caption: "Instant Conflict Alert",
    description: "Instant clash notifications preventing examination hall collisions",
  },
  auth: {
    title: "Student Sign-In",
    label: "Quick Login",
    badge: "Role Access",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM.jpeg",
    alt: "Mobile sign-in and role selection with student quick login",
    caption: "Mobile Sign-In & Roles",
    description: "Role-based student portal with roll number verification",
  },
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
        "relative isolate overflow-hidden rounded-[20px] border border-[#dbe3f2] bg-[#f3f7ff] shadow-[0_24px_55px_-32px_rgba(23,32,51,0.4)]",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          priority={preload}
          sizes="(max-width: 1023px) 92vw, 58vw"
          className="object-contain"
        />
      </div>
      <figcaption className="absolute bottom-2.5 left-2.5 rounded-full border border-white/80 bg-white/95 px-2.5 py-1 text-[8.5px] font-semibold uppercase tracking-[0.12em] text-[#667085] shadow-sm backdrop-blur-sm">
        {image.caption}
      </figcaption>
    </figure>
  );
}

/**
 * High-fidelity responsive mobile smartphone mockup.
 * Displays the real mobile screenshot inside an aspect-ratio accurate viewport.
 */
export function MobileDeviceFrame({
  activeScreen = "timetable",
  onSelectScreen,
  compact = false,
  showTabs = true,
  className,
}: {
  activeScreen?: MobileScreenKey;
  onSelectScreen?: (screen: MobileScreenKey) => void;
  compact?: boolean;
  showTabs?: boolean;
  className?: string;
}) {
  const [internalScreen, setInternalScreen] = useState<MobileScreenKey>(activeScreen);
  const currentKey = onSelectScreen ? activeScreen : internalScreen;
  const current = MOBILE_SCREEN_CONFIG[currentKey];

  const handleSelect = (key: MobileScreenKey) => {
    if (onSelectScreen) {
      onSelectScreen(key);
    } else {
      setInternalScreen(key);
    }
  };

  return (
    <figure
      aria-label={`Mobile application preview: ${current.title}`}
      className={cn("flex flex-col items-center", className)}
    >
      {/* Smartphone Bezel */}
      <div
        className={cn(
          "relative overflow-hidden rounded-[2.2rem] border-[5px] border-[#131927] bg-[#0c101a] p-1 shadow-[0_28px_60px_-22px_rgba(15,23,42,0.6)] ring-1 ring-white/10 transition-all",
          compact ? "w-[130px] sm:w-[145px]" : "w-[195px] sm:w-[215px]"
        )}
      >
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2">
          <div className="flex h-3 w-12 items-center justify-center gap-1.5 rounded-full bg-[#131927] px-2 shadow-inner">
            <span className="size-1 rounded-full bg-[#273248]" />
            <span className="h-0.5 w-4 rounded-full bg-[#273248]" />
          </div>
        </div>

        {/* Screen Viewport with strict 9:19 portrait ratio */}
        <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[1.85rem] bg-[#0c101a]">
          <Image
            src={current.src}
            alt={current.alt}
            fill
            sizes={compact ? "145px" : "215px"}
            className="object-cover object-top transition-transform duration-300"
            priority={compact ? false : true}
          />
          {/* Subtle gradient vignette at top for notch contrast */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/45 to-transparent" />
        </div>

        {/* Home Bar Indicator */}
        <div className="mx-auto my-1 h-0.5 w-8 rounded-full bg-white/30" />
      </div>

      {/* Screen selector tabs */}
      {showTabs && !compact && (
        <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1">
          {(["timetable", "calendar", "conflict", "auth"] as MobileScreenKey[]).map((key) => {
            const isSelected = key === currentKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-semibold transition-all",
                  isSelected
                    ? "bg-[#2855c7] text-white shadow-sm"
                    : "bg-[#eaf0ff] text-[#2855c7] hover:bg-[#dbe7fd]"
                )}
              >
                {MOBILE_SCREEN_CONFIG[key].label}
              </button>
            );
          })}
        </div>
      )}

      {/* Caption badge */}
      <figcaption className="mt-1.5 text-center text-[8.5px] font-medium text-[#667085]">
        {current.caption}
      </figcaption>
    </figure>
  );
}

function OpeningVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  return (
    <div className="relative" data-ppt-enter>
      <ProductImageFrame image={slide.image} preload className="rotate-[0.3deg]" />
      <div className="absolute -bottom-3 left-4 hidden max-w-[215px] rounded-2xl border border-[#dbe3f2] bg-white px-3.5 py-2.5 shadow-[0_18px_35px_-22px_rgba(23,32,51,0.45)] sm:block">
        <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-[#2855c7]">
          Optimization Workspace
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-[#667085]">
          Timetables, rooms, conflicts, and verification in one unified interface.
        </p>
      </div>
    </div>
  );
}

/**
 * Slide 2: Scheduling is costly.
 * Highlights the master conflict dashboard alongside the real student Mobile Conflict Alert.
 */
function ProblemVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  return (
    <div className="relative grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_155px]" data-ppt-enter>
      <div className="relative">
        <ProductImageFrame image={slide.image} />
        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-[#f3c9cf] bg-white px-3 py-2 shadow-sm">
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-[#fff0f2] text-[#c83c4b]">
            <CircleAlert className="size-3.5" />
          </span>
          <span className="text-[10px] font-semibold text-[#172033]">
            Spreadsheets create blind spots:{" "}
            <span className="font-normal text-[#667085]">
              Course collisions & last-minute room reassignments
            </span>
          </span>
        </div>
      </div>
      <div className="mx-auto flex flex-col items-center gap-1 sm:mx-0">
        <span className="rounded-full border border-[#f3c9cf] bg-[#fff0f2] px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#c83c4b]">
          Student Impact
        </span>
        <MobileDeviceFrame activeScreen="conflict" showTabs={false} compact />
      </div>
    </div>
  );
}

/**
 * Slide 3: Greedy fails; pure ILP is slow.
 * Conflict graph and comparative analysis.
 */
function EngineVisual() {
  return (
    <div className="grid gap-3 lg:grid-cols-[0.85fr_1.15fr]" data-ppt-enter>
      <div className="rounded-[20px] border border-[#e1e6ef] bg-white p-3.5 shadow-[0_20px_48px_-40px_rgba(23,32,51,0.45)]">
        <div className="flex items-center justify-between border-b border-[#f0f3f8] pb-2">
          <p className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#667085]">
            Course Conflict Graph
          </p>
          <GitBranch className="size-3.5 text-[#2855c7]" />
        </div>
        <svg viewBox="0 0 240 150" className="mt-1 h-[145px] w-full" aria-label="Sample exam conflict graph">
          <g stroke="#b8c8ee" strokeWidth="2">
            <path d="M47 42 116 28M47 42l35 78M116 28l66 42M116 28l31 96M182 70l-35 54M82 120l65 4" />
          </g>
          {[
            [47, 42, "DBMS", "#eaf0ff", "#2855c7"],
            [116, 28, "CN", "#fff0f2", "#c83c4b"],
            [182, 70, "AI", "#eefbf7", "#12805c"],
            [82, 120, "OS", "#fff7e8", "#b7791f"],
            [147, 124, "DA", "#f2efff", "#6b4fc7"],
          ].map(([x, y, label, fill, text]) => (
            <g key={String(label)}>
              <circle cx={Number(x)} cy={Number(y)} r="20" fill={String(fill)} stroke={String(text)} strokeWidth="1.5" />
              <text x={Number(x)} y={Number(y) + 3} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={String(text)}>
                {String(label)}
              </text>
            </g>
          ))}
        </svg>
        <p className="mt-1 text-[9px] leading-relaxed text-[#667085]">
          Edges link exams sharing common enrolled students.
        </p>
      </div>

      <div className="space-y-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <article className="rounded-2xl border border-[#f5d0d6] bg-[#fffafb] p-3">
            <div className="flex items-center gap-1.5 text-[#c83c4b]">
              <ShieldAlert className="size-3.5" />
              <h3 className="text-xs font-bold">Greedy Heuristics</h3>
            </div>
            <p className="mt-1.5 text-[9.5px] leading-snug text-[#667085]">
              Places exams without global collision awareness. Frequently violates hard constraints in larger batches.
            </p>
          </article>
          <article className="rounded-2xl border border-[#f5dfb8] bg-[#fffdf9] p-3">
            <div className="flex items-center gap-1.5 text-[#b7791f]">
              <Zap className="size-3.5" />
              <h3 className="text-xs font-bold">Pure ILP Solvers</h3>
            </div>
            <p className="mt-1.5 text-[9.5px] leading-snug text-[#667085]">
              Proves optimality, but solve times explode exponentially. Impractical for timely exam turnarounds.
            </p>
          </article>
        </div>

        <div className="rounded-2xl border border-[#c8d9fa] bg-[#f4f7fe] p-3">
          <div className="flex items-center gap-1.5 text-[#2855c7]">
            <Sparkles className="size-3.5" />
            <h4 className="text-xs font-bold">ExamOpt Hybrid Strategy</h4>
          </div>
          <p className="mt-1 text-[9.5px] leading-snug text-[#4a5568]">
            Prefilters impossible states upfront, seeds feasible baselines rapidly, and runs localized swaps to refine soft penalties.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Slide 4: 5-Stage Hybrid Pipeline.
 * Directly mirrors Page 4 of the user's PDF deck.
 */
function WorkflowVisual({ slide }: VisualProps) {
  const stages = [
    { num: "01", name: "Input Parsing", desc: "CSV schema validation & conflict detection", status: "VERIFIED" },
    { num: "02", name: "Constraint Prefilter", desc: "Prune invalid slot/room domains early", status: "CONCEPTUAL" },
    { num: "03", name: "Greedy Seeded", desc: "Fast baseline respecting hard constraints", status: "QA PASS" },
    { num: "04", name: "Local Optimization", desc: "Hill-climbing & simulated annealing swaps", status: "QA PASS" },
    { num: "05", name: "Deterministic Verifier", desc: "Independent audit pass & ICS/CSV export", status: "VERIFIED" },
  ];

  return (
    <div className="rounded-[20px] border border-[#e1e6ef] bg-white p-3.5 shadow-[0_24px_55px_-40px_rgba(23,32,51,0.45)] sm:p-5" data-ppt-enter>
      <div className="grid gap-2 sm:grid-cols-5">
        {stages.map((stage) => (
          <div
            key={stage.name}
            className="flex flex-col justify-between rounded-xl border border-[#e8ecf4] bg-[#fbfcff] p-2.5"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-[#2855c7]">{stage.num}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider",
                    stage.status === "VERIFIED"
                      ? "bg-[#eaf8f0] text-[#0e8055]"
                      : stage.status === "QA PASS"
                        ? "bg-[#eaf0ff] text-[#2855c7]"
                        : "bg-[#fff7e8] text-[#b7791f]"
                  )}
                >
                  {stage.status}
                </span>
              </div>
              <p className="mt-1.5 text-[10.5px] font-bold text-[#172033]">{stage.name}</p>
              <p className="mt-1 text-[8.5px] leading-tight text-[#667085]">{stage.desc}</p>
            </div>
          </div>
        ))}
      </div>
      {slide.image && <ProductImageFrame image={slide.image} className="mt-3.5" />}
    </div>
  );
}

/**
 * Slide 5: One platform. Two experiences.
 * Interactive smartphone mockup with 4-tab switcher.
 */
function ExperienceVisual({ slide }: VisualProps) {
  const [activeScreen, setActiveScreen] = useState<MobileScreenKey>("timetable");
  if (!slide.image) return null;

  return (
    <div
      className="relative grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_215px]"
      data-ppt-enter
    >
      <div>
        <ProductImageFrame image={slide.image} />
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-[#dbe3f2] bg-[#f8faff] px-3 py-2 text-[9.5px]">
          <span className="font-semibold text-[#172033]">
            Web Administrator Workspace
          </span>
          <span className="rounded-full bg-[#eaf0ff] px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#2855c7]">
            Full Solver Control
          </span>
        </div>
      </div>

      <div className="mx-auto flex flex-col items-center gap-1.5 sm:mx-0">
        <MobileDeviceFrame
          activeScreen={activeScreen}
          onSelectScreen={setActiveScreen}
          showTabs
        />
      </div>
    </div>
  );
}

/**
 * Slide 6: Unified Workflow: Ingest to Mobile.
 * From Page 6 of the PDF deck.
 */
function ArchitectureVisual() {
  const steps = [
    { title: "Import & Configure", desc: "Admins import dataset & configure constraints", tag: "VERIFIED", icon: Database },
    { title: "Run & Monitor", desc: "Solver runs with live logs & progress monitoring", tag: "QA PASS", icon: Waypoints },
    { title: "Review & Adjust", desc: "Admins lock slots or override room allocations", tag: "VERIFIED", icon: Sliders },
    { title: "Publish Timetable", desc: "System exports ICS/CSV feeds for stakeholders", tag: "VERIFIED", icon: FileCheck2 },
    { title: "Mobile Read-Only", desc: "Students access timetable, calendar & alerts", tag: "PROTOTYPE", icon: Smartphone },
  ];

  return (
    <div className="rounded-[20px] border border-[#e1e6ef] bg-white p-3.5 shadow-[0_24px_55px_-40px_rgba(23,32,51,0.45)] sm:p-5" data-ppt-enter>
      <div className="grid gap-2 sm:grid-cols-5">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={step.title}
              className="relative flex flex-col rounded-2xl border border-[#e5e7eb] bg-[#fbfcff] p-3 text-center"
            >
              <span className="mx-auto grid size-8 place-items-center rounded-xl bg-[#eaf0ff] text-[#2855c7]">
                <Icon className="size-4" />
              </span>
              <span className="mt-1 text-[8px] font-bold text-[#2855c7]">STEP 0{idx + 1}</span>
              <p className="mt-0.5 text-[10.5px] font-bold leading-tight text-[#172033]">{step.title}</p>
              <p className="mt-1 text-[8.5px] leading-tight text-[#667085]">{step.desc}</p>
              <span className="mt-2 inline-block rounded bg-[#f0f3f8] px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wider text-[#4a5568]">
                {step.tag}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3.5 flex items-center justify-between rounded-xl border border-[#e5e7eb] bg-[#f8faff] px-3.5 py-2.5 text-[9.5px] text-[#667085]">
        <span className="inline-flex items-center gap-2">
          <Network className="size-3.5 text-[#2855c7]" />
          Connected pipeline: Ingest $\rightarrow$ Solve $\rightarrow$ Verify $\rightarrow$ Mobile Delivery.
        </span>
        <span className="font-semibold text-[#172033]">
          Zero disconnect between Web Admin & Mobile Student
        </span>
      </div>
    </div>
  );
}

/**
 * Slide 7: Timetable Metrics & Zero Violations.
 * Direct translation of Page 7 of the user's PDF deck.
 */
function VerificationVisual() {
  const metrics = [
    {
      metric: "355 / 24",
      label: "Dataset Scale",
      sub: "355 students · 24 exams · 1,735 enrollments",
      badge: "VERIFIED DATASET",
      color: "border-[#c8d9fa] bg-[#f4f7fe] text-[#2855c7]",
    },
    {
      metric: "0",
      label: "Hard-Constraint Violations",
      sub: "Zero student collisions & zero room capacity breaches",
      badge: "REPORTED BY QA",
      color: "border-[#b8eed8] bg-[#f0fbf6] text-[#0e8055]",
    },
    {
      metric: "42%",
      label: "Penalty Reduction",
      sub: "Improvement from greedy baseline after local optimization",
      badge: "REPORTED BY QA",
      color: "border-[#d8cff8] bg-[#f7f5ff] text-[#6b4fc7]",
    },
  ];

  return (
    <div className="space-y-3" data-ppt-enter>
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((item) => (
          <article
            key={item.label}
            className={cn("rounded-[20px] border p-4 shadow-sm", item.color)}
          >
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-[7.5px] font-bold uppercase tracking-wider text-[#172033]">
              {item.badge}
            </span>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#172033]">
              {item.metric}
            </p>
            <p className="mt-1 text-xs font-bold text-[#172033]">{item.label}</p>
            <p className="mt-1 text-[9px] leading-snug text-[#667085]">{item.sub}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-[#b8eed8] bg-[#f0fbf6] p-3 text-[10px] text-[#0e8055]">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          <span className="font-bold">
            Deterministic QA Pass:
          </span>
          <span className="font-normal text-[#172033]">
            All schedule candidates pass hard-constraint verification before publish approval.
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Slide 8: Prototype Ready for Validation.
 * From Page 8 & 9 of the user's PDF deck.
 */
function ClosingVisual({ slide }: VisualProps) {
  if (!slide.image) return null;
  const actions = [
    "Review prototype (web & mobile)",
    "Load institutional CSV roster",
    "Run 30-min validation project",
    "Export verified timetable & audit report",
  ];

  return (
    <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_165px]" data-ppt-enter>
      <div>
        <ProductImageFrame image={slide.image} />
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {actions.map((act, index) => (
            <div
              key={act}
              className="flex items-center gap-1.5 rounded-xl border border-[#e1e6ef] bg-white p-2 text-[9px] font-medium text-[#172033]"
            >
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#eaf0ff] text-[8px] font-bold text-[#2855c7]">
                {index + 1}
              </span>
              <span className="truncate">{act}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto sm:mx-0">
        <MobileDeviceFrame activeScreen="calendar" showTabs={false} compact />
      </div>
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
