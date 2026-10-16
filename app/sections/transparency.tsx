/**
 * ExamOpt Studio — Transparent by Design Section
 * Background: /Images/BG Images/Futuristic Exam Validation Dashboard.png
 * Layout matches reference design:
 * • Background shows 3D glass validation dashboard on the right
 * • Editorial text and 3 feature points anchored cleanly on the left
 */

"use client";

import Image from "next/image";
import { Lock, FileSearch, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Hard constraints are never traded away",
    body: "Capacity, labs, fixed slots and student clashes are checked independently of the strategy that built the timetable.",
  },
  {
    icon: FileSearch,
    title: "Every failure names its cause",
    body: "When a schedule is infeasible, the report points to the constraint and the exams responsible.",
  },
  {
    icon: ShieldCheck,
    title: "No claims before validation",
    body: "ExamOpt reports a timetable as conflict-free only after the validator has actually run.",
  },
];

export function TransparencySection() {
  return (
    <section
      id="transparency"
      aria-labelledby="transparency-heading"
      className="relative w-full min-h-[700px] lg:h-[860px] flex items-center overflow-hidden border-t border-[#ebe8df] bg-[#eff3fa] scroll-mt-20"
    >
      {/* ── Background: Futuristic Glass Dashboard ──────────────────────── */}
      <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <Image
          src="/Images/BG Images/Futuristic Exam Validation Dashboard.png"
          alt="ExamOpt Studio 3D Glass Validation Dashboard"
          fill
          quality={95}
          className="object-cover object-right select-none pointer-events-none"
        />
        {/* Subtle mobile fade so text remains 100% legible on small screens where image stacks */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent lg:hidden pointer-events-none" />
      </div>

      {/* ── Left-Anchored Editorial Content ────────────────────────────── */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-14 xl:px-20 py-20 lg:py-0">
        <div className="max-w-[480px]">
          <Reveal>
            {/* Eyebrow */}
            <div data-reveal>
              <p className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#1a62ff]">
                <span className="w-5 h-px bg-[#1a62ff]/60 inline-block" />
                Transparent by Design
              </p>
            </div>

            {/* Headline */}
            <div data-reveal className="mt-4">
              <h2
                id="transparency-heading"
                className="text-[2.2rem] sm:text-[2.8rem] lg:text-[3.2rem] font-bold tracking-tight text-slate-900 leading-[1.08]"
              >
                Every decision,{" "}
                <br className="hidden sm:block" />
                <span className="font-normal italic text-[#1a62ff]">
                  explained.
                </span>
              </h2>
            </div>

            {/* Description */}
            <div data-reveal className="mt-4">
              <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal">
                ExamOpt validates each timetable against your constraints and makes
                conflicts and infeasible schedules understandable.
              </p>
            </div>

            {/* 3 Principles with Icons */}
            <div data-reveal className="mt-8 sm:mt-10 space-y-6">
              {PRINCIPLES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex items-start gap-4">
                  {/* Icon circle */}
                  <div className="size-11 rounded-2xl bg-white/90 border border-blue-200/70 shadow-[0_2px_8px_rgba(26,98,255,0.08)] flex items-center justify-center shrink-0">
                    <Icon className="size-5 text-[#1a62ff]" />
                  </div>

                  {/* Text */}
                  <div>
                    <h3 className="text-[14px] sm:text-[14.5px] font-bold text-slate-900 leading-snug">
                      {title}
                    </h3>
                    <p className="mt-1 text-[12.5px] sm:text-[13px] text-slate-600 leading-relaxed">
                      {body}
                    </p>
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
