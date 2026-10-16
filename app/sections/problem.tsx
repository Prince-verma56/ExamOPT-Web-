/**
 * ExamOpt Studio — The Scheduling Problem Section
 * Pinned interactive 3D Orbital Wheel of Constraints:
 * • Pinned sticky viewport until all challenge images are fully scrolled
 * • Uses OrbitalImageWheel for 3D card depth, blur, and focus transitions
 * • Centered editorial header (eyebrow, title, subtitle, CTA link)
 * • Smooth automatic handoff to next section upon completion
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

export function ProblemSection() {
  return (
    <div id="problem" className="relative w-full scroll-mt-20">
      <OrbitalImageWheel
        images={CHALLENGE_IMAGES}
        turns={1.5}
        scrollLength={260}
        itemWidth={250}
        itemHeight={340}
        cropRatio={0.72}
        captionOffset={10}
        className="bg-[#faf9f5] border-t border-[#ebe7df]/60"
      >
        {/* ── Centered Pinned Header ─────────────────────────────────── */}
        <div className="mx-auto max-w-[840px] text-center">
          {/* Eyebrow */}
          <p className="inline-flex items-center gap-2 text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.25em] text-[#1a62ff]">
            <span className="w-5 h-px bg-[#1a62ff]/60 inline-block" />
            The Scheduling Problem
            <span className="w-5 h-px bg-[#1a62ff]/60 inline-block" />
          </p>

          {/* Headline */}
          <h2
            id="problem-heading"
            className="mt-3 text-[2.2rem] sm:text-[2.7rem] lg:text-[3.2rem] font-bold tracking-tight text-slate-900 leading-[1.08]"
          >
            One timetable.{" "}
            <br className="hidden sm:block" />
            <span className="font-normal italic text-[#1a62ff]">
              A hundred moving parts.
            </span>
          </h2>

          {/* Subtitle & Link */}
          <div className="mt-3 mx-auto max-w-[620px]">
            <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed font-normal">
              Students, rooms, fixed slots and practical requirements all compete for the
              same sessions. A single change can ripple through the entire timetable.
            </p>
            <div className="mt-2.5">
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold text-[#1a62ff] hover:text-[#0e52e2] transition-colors group"
              >
                See how ExamOpt resolves constraints
                <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </OrbitalImageWheel>
    </div>
  );
}
