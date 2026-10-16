/**
 * ExamOpt Studio — Futuristic Premium Footer
 * Ultra-modern, dark obsidian command-center aesthetic:
 * • Top neon hairline and ambient mesh glows
 * • Real-time operational engine status ticker
 * • Glassmorphic Hackathon spotlight card
 * • Micro-animated links with arrow reveals
 * • Back-to-top smooth navigation
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
  { name: "Overview", href: "/#main" },
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
    <footer className="relative w-full overflow-hidden bg-[#070b14] text-slate-300 selection:bg-blue-600 selection:text-white">
      {/* ── Ambient Glows & Neon Top Accent ──────────────────────────── */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#1a62ff] to-transparent opacity-80" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[250px] bg-gradient-to-b from-[#1a62ff]/18 via-indigo-500/5 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-10 w-[450px] h-[300px] bg-blue-600/5 blur-[120px] pointer-events-none -z-10" />

      {/* ── 1. Top Operational Ribbon ─────────────────────────────────── */}
      <div className="border-b border-white/[0.07] bg-white/[0.015] backdrop-blur-md">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-4 sm:py-5 flex flex-col md:flex-row items-center justify-between gap-4">

          {/* Engine Status Pill */}
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/[0.03] border border-white/10 px-3.5 py-1.5 text-xs text-slate-300 shadow-inner">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-slate-200">Constraint Engine: Feasible & Active</span>
            <span className="text-slate-600">|</span>
            <span className="text-[11px] text-emerald-400 font-mono">100% Conflict-Free</span>
          </div>

          {/* Quick Metrics / Guarantees */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="size-3.5 text-[#1a62ff]" />
              <span>Independent Validation</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Cpu className="size-3.5 text-cyan-400" />
              <span>Deterministic Solvers</span>
            </div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1 text-[#4382ff] hover:text-blue-300 font-semibold transition-colors"
            >
              Launch Workspace
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

        </div>
      </div>

      {/* ── 2. Main Footer Grid ───────────────────────────────────────── */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-14 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">

          {/* Col 1: Brand & Manifesto (lg:col-span-4) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-3 group outline-none"
              >
                <div className="relative size-8 rounded-xl bg-gradient-to-br from-[#1a62ff] to-blue-700 p-0.5 shadow-[0_0_20px_rgba(26,98,255,0.4)] flex items-center justify-center">
                  <BrandMark className="size-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold tracking-tight text-white group-hover:text-blue-400 transition-colors">
                    ExamOpt <span className="text-blue-400 font-normal">Studio</span>
                  </span>
                  <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    Timetable Optimization
                  </span>
                </div>
              </Link>

              <p className="mt-5 text-[13.5px] leading-relaxed text-slate-400 max-w-[340px]">
                Intelligent examination timetable optimisation for universities — feasible,
                explainable schedules built from hard institutional constraints.
              </p>

              {/* Badges / Pill Tags */}
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1 text-[11px] font-mono text-slate-300">
                  <Layers className="size-3 text-blue-400" />
                  Prisma ORM
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1 text-[11px] font-mono text-slate-300">
                  <Terminal className="size-3 text-cyan-400" />
                  Next.js 16
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1 text-[11px] font-mono text-slate-300">
                  <Sparkles className="size-3 text-amber-400" />
                  GLA HackVision
                </span>
              </div>
            </div>
          </div>

          {/* Col 2: Platform Links (lg:col-span-2) */}
          <div className="lg:col-span-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
              Platform
            </h3>
            <ul className="mt-5 space-y-3">
              {PRODUCT_LINKS.map(({ name, href }) => (
                <li key={name}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 text-[13.5px] text-slate-400 hover:text-white transition-colors group"
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
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
              Workspace & Tools
            </h3>
            <ul className="mt-5 space-y-3">
              {WORKSPACE_LINKS.map(({ name, href, badge }) => (
                <li key={name}>
                  <Link
                    href={href}
                    className="inline-flex items-center justify-between w-full max-w-[220px] text-[13.5px] text-slate-400 hover:text-white transition-colors group"
                  >
                    <span className="group-hover:translate-x-0.5 transition-transform">{name}</span>
                    {badge && (
                      <span className="text-[10px] font-mono font-medium rounded-md px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20">
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
            <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 p-5 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-mono uppercase tracking-wider text-blue-400 font-semibold">
                  Hackathon Edition
                </span>
                <span className="size-2 rounded-full bg-blue-400 shadow-[0_0_8px_#3b82f6]" />
              </div>

              <h4 className="mt-3 text-[15px] font-bold text-white tracking-tight">
                GLA HackVision 2.0
              </h4>

              <div className="mt-2 inline-block rounded-md bg-[#1a62ff]/15 border border-[#1a62ff]/30 px-2 py-0.5 text-[11px] font-medium text-blue-300">
                Problem Statement C10
              </div>

              <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
                Intelligent Examination Timetable Optimization System designed for high-density academic operations.
              </p>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11.5px] text-slate-300">
                <span>Evaluator Arena</span>
                <Link
                  href="/admin/optimization"
                  className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 font-semibold group"
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
      <div className="border-t border-white/[0.07] bg-black/40">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 lg:px-14 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} ExamOpt Studio. All rights reserved.</p>

          <p className="text-center sm:text-left text-slate-400">
            Scheduling engine with deterministic constraint validators · Previews use benchmark data
          </p>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            aria-label="Scroll to top"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <span>Back to top</span>
            <ChevronUp className="size-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
}
