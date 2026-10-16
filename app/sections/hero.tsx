/**
 * ExamOpt Studio — Hero Section with Static Background Image
 * Background: /Images/BG Images/HeroSectionBG.png
 * Matches reference design (Image 3):
 * • Clean, top-left anchored editorial content
 * • AI-Powered Exam Scheduling pill badge
 * • "Smarter Examination Timetables" headline with blue italic accent
 * • "Get started" and "Watch overview" action buttons
 * • High-res background image with object-right-top positioning so the 3D dashboard visual is 100% visible
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeroSection() {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
      window.dispatchEvent(new CustomEvent("hero-animation-start"));
    }, 180);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative w-full min-h-[620px] lg:h-screen lg:max-h-[100dvh] overflow-hidden bg-[#eef2ff]"
    >
      {/* ── Background Image: Full Dashboard Visual ──────────────────── */}
      <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <Image
          src="/Images/BG Images/HeroSectionBG.png"
          alt="ExamOpt Studio Examination Timetable Dashboard"
          fill
          priority
          quality={95}
          className="object-cover object-right-top select-none pointer-events-none"
        />
        {/* Soft mobile fade to preserve text readability when image stacks on narrow screens */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent lg:hidden pointer-events-none" />
      </div>

      {/* ── Left-Anchored Editorial Content (Top ~35%) ────────────────── */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-14 xl:px-20 pt-28 sm:pt-32 lg:pt-36 xl:pt-40">
        <div className="max-w-[460px]">

          {/* Eyebrow Pill Badge */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity]",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: isRevealed ? "80ms" : "0ms" }}
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50/90 border border-blue-200/70 px-3.5 py-1 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a62ff] shadow-2xs backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#1a62ff] animate-pulse" />
              AI-Powered Exam Scheduling
            </div>
          </div>

          {/* Headline */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] mt-4 sm:mt-5",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: isRevealed ? "200ms" : "0ms" }}
          >
            <h1
              id="hero-heading"
              className="text-[2.4rem] sm:text-[3rem] lg:text-[3.4rem] xl:text-[3.8rem] font-bold tracking-tight text-slate-900 leading-[1.06]"
            >
              Smarter <br />
              Examination <br />
              <span className="font-normal italic text-[#1a62ff]">
                Timetables
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] mt-3.5 sm:mt-4",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: isRevealed ? "320ms" : "0ms" }}
          >
            <p className="text-sm sm:text-[14.5px] lg:text-[15px] text-slate-600 leading-relaxed font-normal">
              Design conflict-free, resource-optimized exam schedules with intelligent
              algorithms. Save time, reduce clashes, and create a better experience
              for students and administrators.
            </p>
          </div>

          {/* Action CTA Buttons */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] mt-6 sm:mt-7 flex flex-wrap items-center gap-3",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: isRevealed ? "440ms" : "0ms" }}
          >
            <Link
              href="/admin"
              className="h-11 sm:h-12 px-6 sm:px-7 rounded-full bg-[#1a62ff] hover:bg-[#0e52e2] text-white font-semibold text-sm inline-flex items-center gap-2 shadow-[0_6px_20px_rgba(26,98,255,0.35)] hover:shadow-[0_8px_28px_rgba(26,98,255,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Get started
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="#problem"
              className="h-11 sm:h-12 px-5 sm:px-6 rounded-full bg-white/90 hover:bg-white text-slate-800 font-semibold text-sm inline-flex items-center gap-2 border border-slate-200/80 shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all backdrop-blur-md"
            >
              <Play className="size-3.5 fill-[#1a62ff] text-[#1a62ff]" />
              Watch overview
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
