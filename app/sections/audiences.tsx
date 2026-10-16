/**
 * Two connected experiences — the administrator workspace and the student
 * timetable. Each panel crops its preview at the edge so the device imagery
 * reads as part of the composition, and the previews rise into place as the
 * section scrolls into view.
 */

import { Check, Clock, DoorOpen, Search } from "lucide-react";
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

const studentExams = [
  { code: "BCA-302", name: "Database Management Systems", date: "Wed 21 Oct", time: "09:30 – 12:30", room: "AB11-102", next: true },
  { code: "BCA-303", name: "Object Oriented Programming", date: "Thu 22 Oct", time: "09:30 – 12:30", room: "AB11-101" },
  { code: "BCA-304P", name: "Data Structures & Java Lab", date: "Fri 23 Oct", time: "09:30 – 12:30", room: "LAB-2" },
];

/** Single, quiet phone frame cropped by the panel's bottom edge. */
function StudentPhonePreview() {
  return (
    <div
      role="img"
      aria-label="Student timetable preview on a phone using sample data"
      className="mx-auto w-[272px] rounded-t-[42px] border-[7px] border-b-0 border-[#1b2335] bg-[#1b2335] shadow-[0_-30px_70px_-30px_rgb(23_32_51/0.5)]"
    >
      <div className="overflow-hidden rounded-t-[33px] bg-[#f7f6f2]">
        <div className="flex items-center justify-between px-6 pt-3 text-[10px] font-medium text-foreground">
          <span>9:41</span>
          <span className="h-[18px] w-[70px] rounded-full bg-[#1b2335]" />
          <span className="tabular-nums">100%</span>
        </div>
        <div className="px-4 pb-0 pt-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-[22px] leading-none text-foreground">My exams</p>
            <PreviewTag className="px-1.5">Sample</PreviewTag>
          </div>
          <p className="mt-1 text-[10.5px] text-muted-foreground">GLA26-BCA-0001 · BCA, Semester 3</p>

          <ul className="mt-4 space-y-2">
            {studentExams.map((exam) => (
              <li
                key={exam.code}
                className={cn(
                  "rounded-xl border p-3",
                  exam.next ? "border-primary/25 bg-white shadow-[0_8px_20px_-14px_rgba(40,85,199,0.6)]" : "border-[#e6e2d8] bg-white/70"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-foreground">{exam.code}</span>
                  {exam.next ? (
                    <span className="rounded-full bg-primary px-1.5 py-px text-[9px] font-medium text-primary-foreground">Next</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">{exam.date}</span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{exam.name}</p>
                {exam.next && (
                  <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-[10px] text-foreground/80">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3 text-primary" /> {exam.date}, {exam.time.split(" ")[0]}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <DoorOpen className="size-3 text-primary" /> Room {exam.room}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AudiencesSection() {
  return (
    <section id="product" aria-label="Administrator and student experiences" className="scroll-mt-20 bg-white py-24 lg:py-32">
      <Container>
        <Reveal className="grid gap-5 lg:grid-cols-12" stagger={0.14} y={36} start="top 78%">
          {/* Administrators */}
          <article
            data-reveal
            aria-labelledby="admin-heading"
            className="flex flex-col overflow-hidden rounded-[28px] border border-hairline bg-canvas lg:col-span-7"
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
            className="relative flex scroll-mt-20 flex-col overflow-hidden rounded-[28px] border border-[#dfe5f3] bg-primary-soft lg:col-span-5"
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
                  "See published examination dates and times",
                  "Find the right room",
                  "Get schedule-change information when available",
                ]}
              />
              <p className="mt-6 max-w-[36ch] text-[13.5px] leading-relaxed text-muted-foreground">
                The student web portal is available today. A Flutter companion app is planned for a
                later phase, built on the same API.
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
