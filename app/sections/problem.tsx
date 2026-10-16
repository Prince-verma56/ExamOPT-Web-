/**
 * ExamOpt Studio — The Scheduling Problem Section
 * Matches reference design with 100% precision:
 * • Centered editorial header
 * • Full-width edge-to-edge 3-column showcase with no awkward gaps
 * • Left: Examination Hall card with "SHARED ENROLMENTS" frosted badge
 * • Center: Prominent Examination Schedule timetable card
 * • Right: Two stacked cards ("ROOM CAPACITY" and "PRACTICAL REQUIREMENTS")
 * • Bottom: 3 feature callouts with rounded icon containers and vertical dividers
 * • Centered CTA link
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { Users, Building2, Clock, FlaskConical, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

/* ─── Bottom 3 Constraint Features ───────────────────────────────────────── */
const HIGHLIGHTS = [
  {
    icon: Users,
    title: "Overlapping students",
    description: "Students sit multiple exams across subjects and semesters.",
  },
  {
    icon: Building2,
    title: "Limited rooms & labs",
    description: "Rooms and laboratories have capacity and equipment limits.",
  },
  {
    icon: Clock,
    title: "Fixed or unavailable slots",
    description: "Some exams have fixed times; some rooms are unavailable.",
  },
];

export function ProblemSection() {
  return (
    <section
      id="problem"
      aria-labelledby="problem-heading"
      className="relative w-full overflow-hidden py-16 sm:py-20 lg:py-28 bg-[#faf9f5] border-t border-[#ebe7df]/60 scroll-mt-20"
    >
      {/* ── Ambient Soft Glow ──────────────────────────────────────────── */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-blue-100/25 blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="relative z-10 w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">

        {/* ── 1. Centered Editorial Header ─────────────────────────────── */}
        <Reveal className="mx-auto max-w-[840px] text-center">
          <div data-reveal className="flex justify-center">
            <p className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#1a62ff]">
              <span className="w-5 h-px bg-[#1a62ff]/60 inline-block" />
              The Scheduling Problem
              <span className="w-5 h-px bg-[#1a62ff]/60 inline-block" />
            </p>
          </div>

          <div data-reveal className="mt-3 sm:mt-4">
            <h2
              id="problem-heading"
              className="text-[2.2rem] sm:text-[2.8rem] lg:text-[3.3rem] font-bold tracking-tight text-slate-900 leading-[1.08]"
            >
              One timetable.{" "}
              <br className="hidden sm:block" />
              <span className="font-normal italic text-[#1a62ff]">
                A hundred moving parts.
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-[640px] text-sm sm:text-[15.5px] text-slate-600 leading-relaxed font-normal">
              Students, rooms, fixed slots and practical requirements all compete for the same time.
              A single change can ripple through the entire schedule.
            </p>
          </div>
        </Reveal>

        {/* ── 2. Visual Centerpiece: Left Card | Center Timetable | Right Cards ─── */}
        <div className="mt-10 sm:mt-12 lg:mt-14">
          <Reveal className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-stretch">

            {/* ── Left Column: Examination Hall Card (lg:col-span-3) ─────── */}
            <div
              data-reveal
              className="lg:col-span-3 group relative rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-200/90 shadow-[0_8px_30px_rgba(15,23,42,0.07)] bg-white h-[360px] sm:h-[420px] lg:h-full min-h-[360px] lg:min-h-[500px] flex flex-col justify-end transition-all duration-300 hover:shadow-[0_12px_36px_rgba(15,23,42,0.12)]"
            >
              <Image
                src="/Images/challenges/exam-hall.jpg"
                alt="University examination hall with rows of student desks"
                fill
                quality={92}
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent pointer-events-none" />

              {/* Floating frosted glass badge: SHARED ENROLMENTS */}
              <div className="relative z-10 m-3 sm:m-4 rounded-2xl backdrop-blur-md bg-white/85 border border-white/80 p-3.5 shadow-lg flex items-center gap-3.5">
                <div className="size-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <Users className="size-4 text-[#1a62ff]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-900 truncate">
                    Shared Enrolments
                  </p>
                  <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                    Students can be enrolled in multiple subjects and semesters.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Center Column: Examination Schedule Timetable (lg:col-span-6) ─── */}
            <div
              data-reveal
              className="lg:col-span-6 relative rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.08)] bg-white flex items-center justify-center p-2.5 sm:p-4 lg:min-h-[500px]"
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src="/Images/challenges/timetable-card.png"
                  alt="Examination Schedule Timetable showing conflict detection for 8 overlapping students"
                  width={1290}
                  height={645}
                  priority
                  quality={95}
                  className="w-full h-auto object-contain rounded-xl select-none"
                />
              </div>
            </div>

            {/* ── Right Column: Stacked Lab Cards (lg:col-span-3) ───────── */}
            <div data-reveal className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-4 sm:gap-5 h-full lg:min-h-[500px]">

              {/* Top: ROOM CAPACITY */}
              <div className="group relative flex-1 rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-200/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)] bg-white h-[220px] sm:h-[240px] lg:h-1/2 min-h-[220px] flex flex-col justify-end transition-all duration-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.11)]">
                <Image
                  src="/Images/challenges/computer-lab.jpg"
                  alt="Modern university computer laboratory"
                  fill
                  quality={92}
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent pointer-events-none" />

                {/* Floating frosted glass badge: ROOM CAPACITY */}
                <div className="relative z-10 m-3 rounded-2xl backdrop-blur-md bg-white/85 border border-white/80 p-3 shadow-md flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <Building2 className="size-4 text-[#1a62ff]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900 truncate">
                      Room Capacity
                    </p>
                    <p className="text-[10.5px] text-slate-600 leading-snug line-clamp-2">
                      Rooms and laboratories have limited capacity and equipment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom: PRACTICAL REQUIREMENTS */}
              <div className="group relative flex-1 rounded-2xl lg:rounded-3xl overflow-hidden border border-slate-200/90 shadow-[0_6px_24px_rgba(15,23,42,0.06)] bg-white h-[220px] sm:h-[240px] lg:h-1/2 min-h-[220px] flex flex-col justify-end transition-all duration-300 hover:shadow-[0_10px_30px_rgba(15,23,42,0.11)]">
                <Image
                  src="/Images/challenges/specialised-lab.jpg"
                  alt="Specialised university science and engineering laboratory"
                  fill
                  quality={92}
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent pointer-events-none" />

                {/* Floating frosted glass badge: PRACTICAL REQUIREMENTS */}
                <div className="relative z-10 m-3 rounded-2xl backdrop-blur-md bg-white/85 border border-white/80 p-3 shadow-md flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <FlaskConical className="size-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900 truncate">
                      Practical Requirements
                    </p>
                    <p className="text-[10.5px] text-slate-600 leading-snug line-clamp-2">
                      Only labs with required equipment can be assigned for practicals.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </Reveal>
        </div>

        {/* ── 3. Bottom Row: 3 Feature Callouts with Dividers ───────────── */}
        <div className="mt-12 sm:mt-16 pt-10 border-t border-slate-200/80">
          <Reveal className="grid grid-cols-1 md:grid-cols-3 md:divide-x md:divide-slate-200/80 max-w-[1200px] mx-auto" stagger={0.08}>
            {HIGHLIGHTS.map(({ icon: Icon, title, description }, idx) => (
              <div
                key={title}
                data-reveal
                className={`flex items-start gap-4 ${idx === 0 ? "md:pr-8" : idx === 1 ? "md:px-8" : "md:pl-8"} py-3 md:py-0`}
              >
                <div className="size-12 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
                  <Icon className="size-5 text-[#1a62ff]" />
                </div>
                <div>
                  <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">
                    {title}
                  </h3>
                  <p className="mt-1 text-[13px] text-slate-500 leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </Reveal>

          {/* ── 4. Centered CTA Link ───────────────────────────────────── */}
          <div className="mt-8 sm:mt-10 text-center">
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a62ff] hover:text-[#0e52e2] transition-colors group"
            >
              See how ExamOpt resolves constraints
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
}
