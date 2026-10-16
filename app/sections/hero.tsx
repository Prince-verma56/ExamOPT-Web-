/**
 * ExamOpt Studio — Hero Section with Static Background Image
 * Background: /Images/BG Images/HeroSectionBG.png
 * Left text content only — top-left anchored, ~top 35% of viewport.
 * No bottom feature bar, no metrics, no logos strip.
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
    <section className="relative w-full min-h-[580px] lg:h-screen lg:max-h-[100dvh] overflow-hidden bg-[#eef2ff]">

      {/* ── Full-bleed background image ──────────────────────────────── */}
      <div className="absolute inset-0 w-full h-full">
        <Image
          src="/Images/BG Images/HeroSectionBG.png"
          alt="ExamOpt Studio hero background"
          fill
          priority
          quality={95}
          className="object-cover object-right-top select-none pointer-events-none"
        />
      </div>

      {/*
        ── Left text block ───────────────────────────────────────────────
        Positioned in the top ~35% of the section via pt-28~pt-40.
        max-w-[440px] keeps text firmly inside the light left zone of the
        background image so the dashboard visual on the right stays clear.
      */}
      <div className="relative z-10 w-full px-4 sm:px-8 lg:px-14 xl:px-20 pt-28 sm:pt-32 lg:pt-36 xl:pt-40">
        <div className="max-w-[440px]">

          {/* Eyebrow Badge */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity]",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: isRevealed ? "80ms" : "0ms" }}
          >
            <p className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#1a62ff] bg-blue-50/90 border border-blue-200/70 rounded-full px-3 py-1">
              <span className="size-1.5 rounded-full bg-[#1a62ff] animate-pulse inline-block" />
              AI-Powered Exam Scheduling
            </p>
          </div>

          {/* Main Headline */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] mt-4",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: isRevealed ? "200ms" : "0ms" }}
          >
            <h1 className="text-[2.1rem] sm:text-[2.5rem] lg:text-[2.8rem] xl:text-[3.2rem] font-bold tracking-tight text-slate-900 leading-[1.07]">
              Smarter <br />
              Examination <br />
              <span className="italic font-normal text-[#1a62ff]">
                Timetables
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] mt-3",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: isRevealed ? "320ms" : "0ms" }}
          >
            <p className="text-sm sm:text-[14px] text-slate-600 leading-relaxed font-normal">
              Design conflict-free, resource-optimized exam schedules with intelligent
              algorithms. Save time, reduce clashes, and create a better experience
              for students and administrators.
            </p>
          </div>

          {/* CTA Buttons */}
          <div
            className={cn(
              "transform-gpu transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-[transform,opacity] mt-6 flex flex-wrap items-center gap-3",
              isRevealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: isRevealed ? "440ms" : "0ms" }}
          >
            <Link
              href="/admin"
              className="h-11 px-6 rounded-full bg-[#1a62ff] hover:bg-[#0e52e2] text-white font-semibold text-sm flex items-center gap-2 shadow-[0_6px_20px_rgba(26,98,255,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_8px_28px_rgba(26,98,255,0.45)] active:scale-[0.98]"
            >
              Get started
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#how-it-works"
              className="h-11 px-6 rounded-full bg-white/85 hover:bg-white text-slate-900 font-semibold text-sm flex items-center gap-2.5 border border-slate-200/80 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <Play className="w-3.5 h-3.5 fill-[#1a62ff] text-[#1a62ff]" />
              Watch overview
            </a>
          </div>

        </div>
      </div>

    </section>
  );
}
