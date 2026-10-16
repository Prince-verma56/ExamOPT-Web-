/**
 * ExamOpt Studio — Core Capabilities Section
 * Modern glassmorphic 10x design:
 * • Cohesive clean white canvas matching other sections
 * • Floating glassmorphic cards with subtle backdrop blur & borders
 * • Vibrant colored icon badges with soft glowing shadows
 * • Status pills (active live dot for Available, frosted pill for In Development)
 * • Elegant editorial typography with italic accents
 */

"use client";

import Link from "next/link";
import {
  Building2,
  Database,
  FileSearch,
  GitCompareArrows,
  Waypoints,
  Workflow,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/marketing/reveal";

type Status = "available" | "in-development";

interface Capability {
  icon: typeof Database;
  title: string;
  body: string;
  status: Status;
  iconBg: string;
  iconColor: string;
  glowColor: string;
}

const CAPABILITIES: Capability[] = [
  {
    icon: Database,
    title: "Data management",
    body: "Subjects, students, rooms, slots and constraints — imported, validated and kept consistent.",
    status: "available",
    iconBg: "bg-blue-500/10 border-blue-500/20",
    iconColor: "text-[#1a62ff]",
    glowColor: "group-hover:shadow-[0_0_24px_rgba(26,98,255,0.18)]",
  },
  {
    icon: Workflow,
    title: "Scheduling engine",
    body: "Deterministic generation that respects every hard constraint before any preference.",
    status: "in-development",
    iconBg: "bg-violet-500/10 border-violet-500/20",
    iconColor: "text-violet-600",
    glowColor: "group-hover:shadow-[0_0_24px_rgba(139,92,246,0.18)]",
  },
  {
    icon: Waypoints,
    title: "Conflict analysis",
    body: "Shared-student and backlog clashes surfaced as an interactive graph you can inspect.",
    status: "in-development",
    iconBg: "bg-cyan-500/10 border-cyan-500/20",
    iconColor: "text-cyan-600",
    glowColor: "group-hover:shadow-[0_0_24px_rgba(6,182,212,0.18)]",
  },
  {
    icon: GitCompareArrows,
    title: "Algorithm comparison",
    body: "Run strategies side by side and compare feasibility, spread and utilisation.",
    status: "in-development",
    iconBg: "bg-amber-500/10 border-amber-500/20",
    iconColor: "text-amber-600",
    glowColor: "group-hover:shadow-[0_0_24px_rgba(245,158,11,0.18)]",
  },
  {
    icon: Building2,
    title: "Room allocation",
    body: "Capacity- and lab-aware seating, with utilisation shown room by room.",
    status: "in-development",
    iconBg: "bg-emerald-500/10 border-emerald-500/20",
    iconColor: "text-emerald-600",
    glowColor: "group-hover:shadow-[0_0_24px_rgba(16,185,129,0.18)]",
  },
  {
    icon: FileSearch,
    title: "Explainable diagnostics",
    body: "When a timetable cannot be built, the constraint responsible is named.",
    status: "in-development",
    iconBg: "bg-rose-500/10 border-rose-500/20",
    iconColor: "text-rose-600",
    glowColor: "group-hover:shadow-[0_0_24px_rgba(244,63,94,0.18)]",
  },
];

export function CapabilitiesSection() {
  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-heading"
      className="relative w-full overflow-hidden py-20 sm:py-24 lg:py-32 bg-[#faf9f5] border-t border-[#ebe7df]/60 scroll-mt-20"
    >
      {/* ── Soft Ambient Mesh Lights ───────────────────────────────────── */}
      <div className="absolute top-1/3 left-10 w-[500px] h-[500px] bg-blue-100/30 blur-[130px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-indigo-50/40 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="relative z-10 w-full max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 xl:px-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-14 items-start">

          {/* ── Left Editorial Column ──────────────────────────────────── */}
          <Reveal className="lg:col-span-4 xl:col-span-4 lg:sticky lg:top-28">
            <div data-reveal>
              {/* Eyebrow */}
              <p className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#1a62ff]">
                <span className="w-5 h-px bg-[#1a62ff]/60 inline-block" />
                Core Capabilities
              </p>

              {/* Headline */}
              <h2
                id="capabilities-heading"
                className="mt-4 text-[2.2rem] sm:text-[2.7rem] lg:text-[3.1rem] font-bold tracking-tight text-slate-900 leading-[1.08]"
              >
                Everything you need,{" "}
                <br className="hidden sm:block" />
                <span className="font-normal italic text-[#1a62ff]">
                  thoughtfully integrated.
                </span>
              </h2>

              {/* Subtitle */}
              <p className="mt-5 text-sm sm:text-[15px] text-slate-600 leading-relaxed max-w-[420px]">
                Create, analyse and publish examination timetables in one workspace.
                Data management is ready today; the scheduling capabilities are being
                built in the next phase.
              </p>

              {/* CTA Link */}
              <div className="mt-8">
                <Link
                  href="/admin/data"
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200/80 px-4 py-2.5 text-sm font-semibold text-[#1a62ff] shadow-sm hover:border-[#1a62ff]/30 hover:shadow-md hover:bg-blue-50/50 transition-all duration-200 group"
                >
                  <Sparkles className="size-4 text-[#1a62ff] group-hover:scale-110 transition-transform" />
                  Open the data workspace
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </Reveal>

          {/* ── Right: Modern 3x2 Glassmorphic Cards Grid ──────────────── */}
          <Reveal className="lg:col-span-8 xl:col-span-8" y={24} stagger={0.06}>
            <div
              data-reveal
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
            >
              {CAPABILITIES.map(({ icon: Icon, title, body, status, iconBg, iconColor, glowColor }) => (
                <div
                  key={title}
                  className={cn(
                    "group relative flex flex-col justify-between rounded-2xl p-6",
                    "backdrop-blur-xl bg-white/80 border border-white/90",
                    "shadow-[0_4px_20px_rgba(15,23,42,0.04)] hover:shadow-[0_12px_36px_rgba(26,98,255,0.08)]",
                    "hover:-translate-y-1 hover:border-[#1a62ff]/25 transition-all duration-300",
                    "min-h-[220px]"
                  )}
                >
                  <div>
                    {/* Top Row: Icon + Status Pill */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={cn(
                          "size-11 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300",
                          iconBg,
                          glowColor
                        )}
                      >
                        <Icon className={cn("size-5 transition-transform duration-300 group-hover:scale-110", iconColor)} />
                      </div>

                      {/* Status Badge */}
                      {status === "available" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/90 border border-emerald-200/70 px-2.5 py-1 text-[10.5px] font-semibold text-emerald-700 shadow-2xs">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50/90 border border-slate-200/70 px-2.5 py-1 text-[10.5px] font-medium text-slate-500">
                          <span className="size-1.5 rounded-full bg-slate-300" />
                          In development
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="mt-5 text-[15px] sm:text-[15.5px] font-bold text-slate-900 tracking-tight group-hover:text-[#1a62ff] transition-colors">
                      {title}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed">
                      {body}
                    </p>
                  </div>

                  {/* Bottom Accent Bar on hover */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-medium text-slate-400 group-hover:text-[#1a62ff] transition-colors">
                    <span>Feature module</span>
                    <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
}
