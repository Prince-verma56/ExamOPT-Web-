/**
 * The scheduling problem — an editorial column paired with a mosaic of small
 * illustrative panels. Each panel visualises exactly one real difficulty.
 */

import { FlaskConical, Lock, Users, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowLink, Container, DisplayHeading, Em, Eyebrow, Lede } from "@/components/marketing/primitives";
import { Reveal } from "@/components/marketing/reveal";

function Panel({
  className,
  caption,
  detail,
  children,
}: {
  className?: string;
  caption: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <figure
      data-reveal
      className={cn(
        "flex flex-col justify-between gap-4 rounded-2xl border border-[#e6e2d8] bg-white p-4 shadow-[0_1px_2px_rgba(23,32,51,0.03)]",
        className
      )}
    >
      <div aria-hidden className="flex flex-1 items-center justify-center">
        {children}
      </div>
      <figcaption>
        <p className="text-[13.5px] font-medium text-foreground sm:text-[14px]">{caption}</p>
        <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground sm:text-[13px]">{detail}</p>
      </figcaption>
    </figure>
  );
}

/**
 * Deterministic scatter for a cohort of students. Coordinates are rounded so
 * server and client render byte-identical SVG attributes.
 */
function cohort(cx: number, cy: number, offset: number) {
  return Array.from({ length: 20 }, (_, i) => {
    const angle = (i * 137.5 * Math.PI) / 180;
    const radius = 8 + ((i * 7) % 40);
    return {
      x: Math.round((cx + Math.cos(angle) * radius * 0.7 + offset) * 10) / 10,
      y: Math.round((cy + Math.sin(angle) * radius) * 10) / 10,
    };
  });
}

const COHORT_A = cohort(112, 85, -20);
const COHORT_B = cohort(170, 85, 20);
const SHARED = [
  [141, 62],
  [137, 82],
  [145, 100],
  [139, 116],
  [147, 74],
  [143, 90],
];

/** Two subject enrolment sets overlapping. */
function OverlapVisual() {
  return (
    <svg viewBox="0 0 280 170" className="w-full max-w-[300px]">
      <circle cx="112" cy="85" r="66" className="fill-primary/[0.07] stroke-primary/40" strokeWidth="1.2" />
      <circle cx="170" cy="85" r="66" className="fill-[#12805c]/[0.07] stroke-[#12805c]/40" strokeWidth="1.2" />
      {COHORT_A.map((p, i) => (
        <circle key={`a${i}`} cx={p.x} cy={p.y} r="2.6" className="fill-primary/55" />
      ))}
      {COHORT_B.map((p, i) => (
        <circle key={`b${i}`} cx={p.x} cy={p.y} r="2.6" className="fill-[#12805c]/55" />
      ))}
      {SHARED.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" className="fill-[#c83c4b]" />
      ))}
      <text x="62" y="166" className="fill-muted-foreground text-[10px]">BCA-302</text>
      <text x="170" y="166" className="fill-muted-foreground text-[10px]">BCADS-302</text>
    </svg>
  );
}

function CapacityVisual() {
  return (
    <div className="w-full max-w-[220px] space-y-3 text-[11px]">
      <div>
        <div className="mb-1 flex justify-between text-muted-foreground">
          <span>AB11-204</span>
          <span className="tabular-nums">90 seats</span>
        </div>
        <div className="h-2 rounded-full bg-[#eceae4]">
          <div className="h-full w-[80%] rounded-full bg-primary/70" />
        </div>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-muted-foreground">
          <span>Group needs</span>
          <span className="tabular-nums text-[#c83c4b]">95 seats</span>
        </div>
        <div className="relative h-2 rounded-full bg-[#eceae4]">
          <div className="h-full w-[84.5%] rounded-l-full bg-primary/70" />
          <div className="absolute inset-y-0 left-[84.5%] w-[5%] rounded-r-full bg-[#c83c4b]" />
        </div>
      </div>
    </div>
  );
}

function LabVisual() {
  return (
    <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "grid size-5 place-items-center rounded-[5px] border sm:size-6",
            i < 14 ? "border-[#cfe6dc] bg-[#ecf6f1]" : "border-dashed border-[#d9d5ca] bg-transparent"
          )}
        >
          {i === 0 && <FlaskConical className="size-3 text-[#12805c]" />}
        </span>
      ))}
    </div>
  );
}

function FixedSlotVisual() {
  return (
    <div className="grid grid-cols-4 gap-1 text-[10px] sm:gap-1.5">
      {["Mon", "Tue", "Wed", "Thu"].map((d) => (
        <span key={d} className="text-center text-muted-foreground">{d}</span>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-[5px] border sm:w-11",
            i === 6 ? "border-primary/40 bg-primary/[0.08] text-primary" : "border-[#e6e2d8] bg-[#faf9f6]"
          )}
        >
          {i === 6 && <Lock className="size-3" />}
        </span>
      ))}
    </div>
  );
}

function UnavailableVisual() {
  return (
    <div className="relative w-full max-w-[200px] overflow-hidden rounded-lg border border-[#ecd3d6] bg-[#fdf6f6] px-3 py-3">
      <div
        className="absolute inset-0 opacity-60"
        style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 8px, rgba(200,60,75,0.07) 8px 10px)" }}
      />
      <div className="relative flex items-center gap-2 text-[11px]">
        <Wrench className="size-3.5 text-[#c83c4b]" />
        <span className="font-medium text-[#a32f3c]">AB11-105 unavailable</span>
      </div>
      <p className="relative mt-1 text-[10.5px] text-muted-foreground">Maintenance · Day 3, both sessions</p>
    </div>
  );
}

function BacklogVisual() {
  const row = (label: string, active: number, tone: string) => (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-[10.5px] text-muted-foreground">{label}</span>
      <div className="grid flex-1 grid-cols-10 gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={cn("h-5 rounded-[4px] border", i === active ? tone : "border-[#e6e2d8] bg-[#faf9f6]")} />
        ))}
      </div>
    </div>
  );
  return (
    <div className="relative w-full space-y-2.5">
      {row("Semester 1", 3, "border-primary/40 bg-primary/15")}
      {row("Semester 3", 3, "border-[#c83c4b]/40 bg-[#c83c4b]/15")}
      <p className="pl-[76px] text-[10.5px] text-muted-foreground">
        <Users className="mr-1 inline size-3 align-[-2px]" />
        A backlog student is enrolled in both — the same slot cannot hold either.
      </p>
    </div>
  );
}

export function ProblemSection() {
  return (
    <section id="problem" aria-labelledby="problem-heading" className="scroll-mt-20 border-t border-[#ebe8df] bg-canvas py-20 lg:py-28">
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-4 lg:pt-2">
          <div data-reveal>
            <Eyebrow>The scheduling problem</Eyebrow>
            <DisplayHeading id="problem-heading" className="mt-5">
              A complex puzzle.
              <br />
              <Em>A real impact.</Em>
            </DisplayHeading>
          </div>
          <div data-reveal>
            <Lede className="mt-6">
              A university examination period spans departments, programmes and semesters. Every
              exam must fit a room, a time and every enrolled student — and a single late change
              can ripple through the entire schedule.
            </Lede>
            <ul className="mt-7 space-y-2.5 border-l border-[#dcd8cd] pl-4 text-sm text-foreground/80">
              <li>Students sit overlapping and backlog subjects</li>
              <li>Rooms and laboratories have hard limits</li>
              <li>Some slots are fixed; some rooms are unavailable</li>
            </ul>
            <ArrowLink href="#how-it-works" className="mt-8">
              How ExamOpt approaches it
            </ArrowLink>
          </div>
        </Reveal>

        <Reveal className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:col-span-8 lg:grid-cols-4" stagger={0.06}>
          <Panel
            className="col-span-2 lg:row-span-2"
            caption="Overlapping enrolments"
            detail="Students taking both subjects make the two exams impossible to share a session."
          >
            <OverlapVisual />
          </Panel>
          <Panel
            className="col-span-1"
            caption="Limited rooms"
            detail="A group larger than the room is never a valid assignment."
          >
            <CapacityVisual />
          </Panel>
          <Panel
            className="col-span-1"
            caption="Practical exams"
            detail="Only labs with enough workstations qualify."
          >
            <LabVisual />
          </Panel>
          <Panel
            className="col-span-1"
            caption="Fixed slots"
            detail="Some examinations have externally set times."
          >
            <FixedSlotVisual />
          </Panel>
          <Panel
            className="col-span-1"
            caption="Unavailable rooms"
            detail="Maintenance and events remove capacity."
          >
            <UnavailableVisual />
          </Panel>
          <Panel
            className="col-span-2 lg:col-span-4"
            caption="Cross-semester backlog conflicts"
            detail="Backlog students link programmes and years that would otherwise never interact."
          >
            <BacklogVisual />
          </Panel>
        </Reveal>
      </Container>
    </section>
  );
}
