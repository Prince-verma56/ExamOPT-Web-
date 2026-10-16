"use client";

/**
 * Two connected experiences — the administrator workspace and the student
 * timetable. Each panel crops its preview at the edge so the device imagery
 * reads as part of the composition, and the previews rise into place as the
 * section scrolls into view.
 */

import { useState } from "react";
import Image from "next/image";
import { Check, Clock, DoorOpen, Search, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { EXAMOPT_ROOMS } from "@/lib/examopt-data";
import { ArrowLink, DisplayHeading, Em, Eyebrow, PreviewTag, Container } from "@/components/marketing/primitives";
import { Parallax } from "@/components/marketing/motion";
import { Reveal } from "@/components/marketing/reveal";

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-7 grid gap-3 text-[15px] text-foreground/85">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <Check className="size-3" strokeWidth={2.75} aria-hidden />
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Cropped desktop surface showing the real bundled room records. */
function AdminWorkspacePreview() {
  const rooms = EXAMOPT_ROOMS.filter((_, i) => [0, 1, 4, 8, 10, 12].includes(i));
  return (
    <div
      aria-label="Data workspace preview showing the bundled room records"
      role="img"
      className="overflow-hidden rounded-tl-2xl border border-b-0 border-r-0 border-hairline bg-white shadow-[0_-24px_60px_-34px_rgb(23_32_51/0.35)]"
    >
      <div className="flex items-center gap-2 border-b border-border/80 bg-[#fbfbf9] px-4 py-2.5">
        <span className="size-2 rounded-full bg-[#e2ded3]" />
        <span className="size-2 rounded-full bg-[#e2ded3]" />
        <span className="size-2 rounded-full bg-[#e2ded3]" />
        <span className="ml-3 truncate rounded-md bg-white px-2.5 py-0.5 text-[10.5px] text-muted-foreground ring-1 ring-border/80">
          examopt / admin / data / rooms
        </span>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-[#f4f3ef] p-0.5 text-[11.5px]">
            {["Subjects", "Rooms", "Time slots", "Groups"].map((t) => (
              <span
                key={t}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  t === "Rooms" ? "bg-white font-medium text-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {t}
              </span>
            ))}
          </div>
          <span className="hidden items-center gap-1.5 rounded-md border border-border/80 px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
            <Search className="size-3" /> Search rooms
          </span>
        </div>
        <table className="mt-4 w-full text-left text-[12px]">
          <thead>
            <tr className="border-b border-border/80 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              <th className="py-2 font-medium">Code</th>
              <th className="hidden py-2 font-medium sm:table-cell">Type</th>
              <th className="py-2 text-right font-medium">Capacity</th>
              <th className="py-2 text-right font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rooms.map((room) => (
              <tr key={room.id}>
                <td className="py-2.5 font-medium text-foreground">{room.code}</td>
                <td className="hidden py-2.5 capitalize text-muted-foreground sm:table-cell">
                  {room.roomType === "lab" ? "Laboratory" : "Lecture room"}
                </td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{room.capacity}</td>
                <td className="py-2.5 text-right">
                  <span className="inline-flex items-center gap-1 text-success">
                    <span className="size-1.5 rounded-full bg-success" /> Active
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type StudentTab = "timetable" | "calendar" | "conflict";

const STUDENT_MOBILE_ASSETS: Record<
  StudentTab,
  { label: string; src: string; alt: string; tag: string }
> = {
  timetable: {
    label: "Timetable",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM (2).jpeg",
    alt: "Personal student timetable on mobile showing exam venues and timings",
    tag: "Chronological Feed",
  },
  calendar: {
    label: "Calendar",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.07 PM (1).jpeg",
    alt: "Mobile monthly examination calendar with active date highlighting",
    tag: "October 2026",
  },
  conflict: {
    label: "Clash Alert",
    src: "/Images/PPT Images/WhatsApp Image 2026-10-16 at 9.12.08 PM (1).jpeg",
    alt: "Mobile conflict detection notice flagging clashing courses",
    tag: "Proactive Warning",
  },
};

/** Responsive smartphone mockup displaying real mobile application screenshots */
function StudentPhonePreview() {
  const [activeTab, setActiveTab] = useState<StudentTab>("timetable");
  const activeAsset = STUDENT_MOBILE_ASSETS[activeTab];

  return (
    <div
      role="img"
      aria-label="Student mobile timetable preview on smartphone"
      className="mx-auto flex flex-col items-center"
    >
      {/* Switcher pills */}
      <div className="mb-3 flex items-center gap-1 rounded-full border border-border/80 bg-white/95 p-1 shadow-sm backdrop-blur-sm">
        {(["timetable", "calendar", "conflict"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold transition-all",
              activeTab === tab
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {STUDENT_MOBILE_ASSETS[tab].label}
          </button>
        ))}
      </div>

      {/* Phone device bezel rising from bottom */}
      <div className="relative w-[260px] sm:w-[275px] rounded-t-[42px] border-[6px] border-b-0 border-[#131927] bg-[#0c101a] p-1 shadow-[0_-30px_70px_-30px_rgb(23_32_51/0.65)] ring-1 ring-white/10">
        {/* Dynamic Island */}
        <div className="absolute left-1/2 top-2.5 z-20 -translate-x-1/2">
          <div className="flex h-3 w-14 items-center justify-center gap-1.5 rounded-full bg-[#131927] px-2 shadow-inner">
            <span className="size-1 rounded-full bg-[#273248]" />
            <span className="h-0.5 w-5 rounded-full bg-[#273248]" />
          </div>
        </div>

        {/* Viewport with real screenshot */}
        <div className="relative aspect-[9/19] w-full overflow-hidden rounded-t-[34px] bg-[#0c101a]">
          <Image
            src={activeAsset.src}
            alt={activeAsset.alt}
            fill
            sizes="275px"
            className="object-cover object-top transition-transform duration-300"
            priority
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/45 to-transparent" />
        </div>
      </div>
    </div>
  );
}

export function AudiencesSection() {
  return (
    <section id="product" aria-label="Administrator and student experiences" className="scroll-mt-20 bg-[#faf9f5] border-t border-[#ebe7df]/60 py-24 lg:py-32">
      <Container>
        <Reveal
          className="grid gap-px overflow-hidden rounded-[30px] border border-hairline bg-hairline shadow-[0_24px_60px_-48px_rgb(23_32_51/0.42)] lg:grid-cols-12"
          stagger={0.14}
          y={36}
          start="top 78%"
        >
          {/* Administrators */}
          <article
            data-reveal
            aria-labelledby="admin-heading"
            className="flex flex-col overflow-hidden bg-[#fbfaf7] lg:col-span-7"
          >
            <div className="p-7 sm:p-10 lg:p-12">
              <Eyebrow>For administrators</Eyebrow>
              <DisplayHeading id="admin-heading" size="panel" className="mt-6 max-w-[16ch]">
                A focused workspace for <Em>complete control.</Em>
              </DisplayHeading>
              <Checklist
                items={[
                  "Manage examination data and constraints",
                  "Generate and validate schedules",
                  "Visualise conflicts and room utilisation",
                  "Compare scheduling strategies",
                  "Publish final timetables",
                ]}
              />
              <ArrowLink href="/admin" className="mt-8">
                Explore the admin workspace
              </ArrowLink>
            </div>
            <div className="mt-auto h-[300px] overflow-hidden pl-7 sm:h-[340px] sm:pl-10 lg:pl-12">
              <Parallax from={56} to={0} mobileScale={0.5}>
                <AdminWorkspacePreview />
              </Parallax>
            </div>
          </article>

          {/* Students */}
          <article
            data-reveal
            id="students"
            aria-labelledby="student-heading"
            className="relative flex scroll-mt-20 flex-col overflow-hidden bg-[#eef3ff] lg:col-span-5"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.9),transparent)]"
            />
            <div className="relative p-7 sm:p-10 lg:p-12">
              <Eyebrow>For students</Eyebrow>
              <DisplayHeading id="student-heading" size="panel" className="mt-6 max-w-[14ch]">
                Your timetable, <Em>wherever you are.</Em>
              </DisplayHeading>
              <Checklist
                items={[
                  "Personal examination timetable with time slots and rooms",
                  "Interactive monthly calendar highlighting scheduled exams",
                  "Instant conflict detection notices before exam day",
                  "Read-only student access linked to official enrollments",
                ]}
              />
              <p className="mt-6 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
                Accessible on web and companion mobile interfaces — powered by the same deterministic scheduling engine.
              </p>
              <ArrowLink href="/student" className="mt-6">
                Open the student portal
              </ArrowLink>
            </div>
            <div className="relative mt-auto h-[300px] overflow-hidden pt-4 sm:h-[340px]">
              <Parallax from={64} to={0} mobileScale={0.5}>
                <StudentPhonePreview />
              </Parallax>
            </div>
          </article>
        </Reveal>
      </Container>
    </section>
  );
}
