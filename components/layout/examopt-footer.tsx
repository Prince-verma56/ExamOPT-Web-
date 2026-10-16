/**
 * ExamOpt Studio — Glassmorphic Parallax Footer
 * Features:
 * • Rounded top corners (-mt-12 sm:-mt-16) floating over previous campus facade
 * • Frosted glassmorphism background (backdrop-blur-2xl bg-white/85)
 * • Top status bar with live engine operational indicator
 * • Hackathon GLA HackVision 2.0 glass spotlight card
 * • Back to top smooth navigation
 */

"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronUp,
  ShieldCheck,
  Cpu,
  Sparkles,
  Layers,
  Terminal,
} from "lucide-react";
import { BrandMark } from "@/components/marketing/primitives";

const PRODUCT_LINKS = [
  { name: "Overview", href: "/#top" },
  { name: "The Problem", href: "/#problem" },
  { name: "How It Works", href: "/#how-it-works" },
  { name: "Core Capabilities", href: "/#capabilities" },
  { name: "Validation & Transparency", href: "/#transparency" },
];

const WORKSPACE_LINKS = [
  { name: "Admin Dashboard", href: "/admin", badge: "Admin" },
  { name: "Data Workspace", href: "/admin/data" },
  { name: "Optimization Lab", href: "/admin/optimization", badge: "Arena" },
  { name: "Published Schedules", href: "/admin/schedules" },
  { name: "Student Portal", href: "/student", badge: "Public" },
];

export function ExamOptFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative z-20 -mt-12 sm:-mt-16 lg:-mt-20 rounded-t-[36px] sm:rounded-t-[48px] lg:rounded-t-[56px] overflow-hidden backdrop-blur-2xl bg-white/90 border-t border-white/95 shadow-[0_-20px_50px_rgba(15,23,42,0.07)] text-slate-800">

      {/* ── 1. Top Operational Ribbon ─────────────────────────────────── */}
      <div className="border-b border-slate-200/70 bg-slate-50/50 backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Engine Status Pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200/80 px-3.5 py-1 text-xs text-slate-700 shadow-2xs">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-semibold text-slate-800">Constraint Engine: Active</span>
            <span className="text-slate-400">·</span>
            <span className="text-[11px] text-emerald-700 font-semibold">100% Conflict-Free</span>
          </div>

          {/* Quick Metrics / Guarantees */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#1a62ff]" />
              <span>Independent Validation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="size-3.5 text-blue-600" />
              <span>Deterministic Solvers</span>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-[#1a62ff] hover:text-[#0e52e2] font-semibold transition-colors"
            >
              Launch Workspace
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

        </div>
      </div>

      {/* ── 2. Main Footer Grid ───────────────────────────────────────── */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">

          {/* Col 1: Brand & Manifesto (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-2.5 group outline-none"
              >
                <div className="relative size-8 rounded-xl bg-gradient-to-br from-[#1a62ff] to-blue-700 p-0.5 shadow-sm flex items-center justify-center">
                  <BrandMark className="size-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-[#1a62ff] transition-colors">
                    ExamOpt <span className="text-[#1a62ff] font-normal">Studio</span>
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
                    Timetable Optimization
                  </span>
                </div>
              </Link>

              <p className="mt-4 text-[13.5px] leading-relaxed text-slate-600 max-w-[340px]">
                Intelligent examination timetable optimisation for universities — feasible,
                explainable schedules built from hard institutional constraints.
              </p>

              {/* Badges / Pill Tags */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 text-[11px] font-mono text-slate-700 shadow-2xs">
                  <Layers className="size-3 text-blue-600" />
                  Prisma ORM
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 text-[11px] font-mono text-slate-700 shadow-2xs">
                  <Terminal className="size-3 text-cyan-600" />
                  Next.js 16
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 border border-slate-200/80 px-2.5 py-1 text-[11px] font-mono text-slate-700 shadow-2xs">
                  <Sparkles className="size-3 text-amber-600" />
                  GLA HackVision
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Platform Links (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900">
              Platform
            </h3>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map(({ name, href }) => (
                <li key={name}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[13.5px] text-slate-600 hover:text-[#1a62ff] transition-colors group"
                  >
                    <ArrowRight className="size-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[#1a62ff]" />
                    <span>{name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Workspace Links (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900">
              Workspace & Tools
            </h3>
            <ul className="mt-4 space-y-2.5">
              {WORKSPACE_LINKS.map(({ name, href, badge }) => (
                <li key={name}>
                  <Link
                    href={href}
                    className="inline-flex items-center justify-between w-full max-w-[220px] text-[13.5px] text-slate-600 hover:text-[#1a62ff] transition-colors group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">{name}</span>
                    {badge && (
                      <span className="text-[10px] font-mono font-medium rounded-md px-1.5 py-0.5 bg-blue-50 text-[#1a62ff] border border-blue-200/70">
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Hackathon Spotlight Card (lg:col-span-3) */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white/80 border border-slate-200/90 p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#1a62ff] font-bold">
                  Hackathon Edition
                </span>
                <span className="size-2 rounded-full bg-[#1a62ff] animate-pulse" />
              </div>

              <h4 className="mt-2.5 text-[15px] font-bold text-slate-900 tracking-tight">
                GLA HackVision 2.0
              </h4>

              <div className="mt-2 inline-block rounded-md bg-blue-50 border border-blue-200/70 px-2 py-0.5 text-[11px] font-semibold text-[#1a62ff]">
                Problem Statement C10
              </div>

              <p className="mt-2.5 text-[12px] leading-relaxed text-slate-600">
                Intelligent Examination Timetable Optimization System designed for high-density academic operations.
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11.5px] text-slate-700">
                <span>Evaluator Arena</span>
                <Link
                  href="/admin/optimization"
                  className="text-[#1a62ff] hover:text-[#0e52e2] inline-flex items-center gap-1 font-semibold group"
                >
                  Test Lab
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Bottom Bar ─────────────────────────────────────────────── */}
      <div className="border-t border-slate-200/70 bg-slate-50/70">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ExamOpt Studio. All rights reserved.</p>

          <p className="text-center sm:text-left text-slate-600">
            Scheduling engine with deterministic constraint validators · Previews use benchmark data
          </p>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200/90 px-3.5 py-1 text-xs text-slate-700 hover:text-slate-900 hover:border-slate-300 shadow-2xs transition-all active:scale-95"
          >
            <span>Back to top</span>
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
