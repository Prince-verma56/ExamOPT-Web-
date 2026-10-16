/**
 * ExamOpt Studio — The Scheduling Problem Section
 * Features:
 * • Rounded top corners with parallax sheet overlap over the hero section
 * • Centered editorial header
 * • Pinned 3D Orbital Wheel with balanced card gap, slow smooth scrolling,
 *   and automatic progression to the next section
 */

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  OrbitalImageWheel,
  type OrbitalImageWheelImage,
} from "@/components/ui/orbital-image-wheel";

const CHALLENGE_IMAGES: OrbitalImageWheelImage[] = [
  {
    src: "/Images/challenges/student-groups.jpg",
    label: "01 Shared student groups",
    subtitle:
      "Students sit papers across subjects and semesters — none of theirs may share a session.",
    badge: "No overlap",
    alt: "University students studying together in a library group",
  },
  {
    src: "/Images/challenges/limited-rooms.jpg",
    label: "02 Limited rooms & capacity",
    subtitle:
      "Every room has a seat limit, and practical papers need specialized workstations.",
    badge: "Capacity",
    alt: "Empty lecture hall with rows of wooden desks and blackboard",
  },
  {
    src: "/Images/challenges/practical-exams.jpg",
    label: "03 Practical examinations",
    subtitle:
      "Lab papers need rooms with the right equipment and enough workstations.",
    badge: "Lab required",
    alt: "Students taking practical examination in electronic and computer lab",
  },
  {
    src: "/Images/challenges/fixed-slots.jpg",
    label: "04 Fixed university slots",
    subtitle:
      "Certain exams must take place at university-mandated dates and slots.",
    badge: "Fixed",
    alt: "Calendar timetable with marked fixed dates and watch",
  },
  {
    src: "/Images/challenges/room-unavailable.jpg",
    label: "05 Unavailable rooms",
    subtitle:
      "Maintenance, graduations, and other bookings take rooms out of service.",
    badge: "Unavailable",
    alt: "Door with Room Unavailable Maintenance in Progress notice",
  },
  {
    src: "/Images/challenges/exam-hall-backlog.jpg",
    label: "06 Cross-semester backlog",
    subtitle:
      "Backlog students link multiple years and batches that cannot overlap.",
    badge: "Backlog",
    alt: "Grand examination hall with students sitting exams",
  },
];

// Duplicate items so cards are closer together with smaller, elegant gaps
const WHEEL_CARDS: OrbitalImageWheelImage[] = [
  ...CHALLENGE_IMAGES,
  ...CHALLENGE_IMAGES,
];

export function ProblemSection() {
  return (
    <section
      id="problem"
      className="relative z-20 -mt-10 sm:-mt-14 lg:-mt-16 rounded-t-[36px] sm:rounded-t-[48px] lg:rounded-t-[56px] overflow-hidden bg-[#faf9f5] border-t border-white/90 shadow-[0_-20px_50px_rgba(15,23,42,0.06)] scroll-mt-20"
    >
      {/* ── 1. Text Content at Top ─────────────────────────────────── */}
      <header
        aria-labelledby="problem-heading"
        className="mx-auto flex max-w-[840px] flex-col items-center px-5 pb-10 pt-16 text-center sm:px-8 sm:pb-12 sm:pt-20 lg:pb-14 lg:pt-24"
      >
        <p className="inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.25em] text-[#1a62ff] sm:text-[11px]">
          <span className="inline-block h-px w-5 bg-[#1a62ff]/60" />
          The Scheduling Problem
          <span className="inline-block h-px w-5 bg-[#1a62ff]/60" />
        </p>

        <h2
          id="problem-heading"
          className="mt-3.5 text-[2.2rem] font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-[2.8rem] lg:text-[3.3rem]"
        >
          One timetable. <br className="hidden sm:block" />
          <span className="font-normal italic text-[#1a62ff]">
            A hundred moving parts.
          </span>
        </h2>

        <div className="mx-auto mt-4 max-w-[620px]">
          <p className="text-sm font-normal leading-relaxed text-slate-600 sm:text-[15px]">
            Students, rooms, fixed slots and practical requirements all compete for the
            same sessions. A single change can ripple through the entire timetable.
          </p>
          <div className="mt-3">
            <Link
              href="#how-it-works"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a62ff] transition-colors hover:text-[#0e52e2] sm:text-[13px]"
            >
              See how ExamOpt resolves constraints
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── 2. Pinned Circular Gallery Animation with Smooth Scrolling ─── */}
      <OrbitalImageWheel
        images={WHEEL_CARDS}
        turns={1.2}
        scrollLength={360}
        scrollSensitivity={0.55}
        itemWidth={290}
        itemHeight={370}
        cropRatio={0.7}
        captionOffset={10}
        className="bg-transparent"
      />
    </section>
  );
}
