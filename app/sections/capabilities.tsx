/**
 * ExamOpt Studio — Core capabilities
 *
 * Six capabilities on one hairline-divided surface (no floating cards), with
 * one icon treatment and an honest availability status for each. The heading
 * column stays in view on desktop while the grid scrolls past.
 */

import { Building2, Database, FileSearch, GitCompareArrows, Waypoints, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowLink, Container, Em, Eyebrow, Lede } from "@/components/marketing/primitives";
import { RevealHeading } from "@/components/marketing/motion";
import { Reveal } from "@/components/marketing/reveal";

type Status = "available" | "in-development";

const CAPABILITIES: { icon: typeof Database; title: string; body: string; status: Status; detail: string }[] = [
  {
    icon: Database,
    title: "Data management",
    body: "Subjects, students, rooms, slots and constraints — imported, validated and kept consistent.",
    status: "available",
    detail: "Structured records",
  },
  {
    icon: Workflow,
    title: "Scheduling engine",
    body: "Deterministic generation that respects every hard constraint before any preference.",
    status: "in-development",
    detail: "Constraint-first",
  },
  {
    icon: Waypoints,
    title: "Conflict analysis",
    body: "Shared-student and backlog clashes surfaced as a graph you can inspect.",
    status: "in-development",
    detail: "Relationship graph",
  },
  {
    icon: GitCompareArrows,
    title: "Algorithm comparison",
    body: "Run strategies side by side and compare feasibility, spread and utilisation.",
    status: "in-development",
    detail: "Side-by-side review",
  },
  {
    icon: Building2,
    title: "Room allocation",
    body: "Capacity- and lab-aware seating, with utilisation shown room by room.",
    status: "in-development",
    detail: "Capacity aware",
  },
  {
    icon: FileSearch,
    title: "Explainable diagnostics",
    body: "When a timetable cannot be built, the constraint responsible is named.",
    status: "in-development",
    detail: "Clear reasoning",
  },
];

function StatusPill({ status }: { status: Status }) {
  const available = status === "available";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        available ? "bg-success/10 text-success" : "bg-foreground/[0.04] text-muted-foreground"
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", available ? "bg-success" : "bg-muted-foreground/40")} />
      {available ? "Available" : "In development"}
    </span>
  );
}

export function CapabilitiesSection() {
  return (
    <section
      id="capabilities"
      aria-labelledby="capabilities-heading"
      className="relative scroll-mt-20 bg-canvas py-24 lg:py-32"
    >
      <Container>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
            <Reveal>
              <Eyebrow>Core capabilities</Eyebrow>
            </Reveal>
            <RevealHeading id="capabilities-heading" className="mt-6">
              Everything you need, <Em>thoughtfully integrated.</Em>
            </RevealHeading>
            <Reveal y={20}>
              <Lede className="mt-6 max-w-[26rem]">
                Create, analyse and publish examination timetables in one workspace. Data management
                is ready today; the scheduling capabilities are being built in the next phase.
              </Lede>
              <ArrowLink href="/admin/data" className="mt-6">
                Open the data workspace
              </ArrowLink>
            </Reveal>
          </div>

          <Reveal
            as="ul"
            className="grid overflow-hidden rounded-[24px] border border-hairline bg-hairline [gap:1px] sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3"
            y={22}
            stagger={0.07}
            start="top 80%"
          >
            {CAPABILITIES.map(({ icon: Icon, title, body, status, detail }) => (
              <li
                key={title}
                data-reveal
                className="group relative flex min-h-[248px] flex-col overflow-hidden bg-white/90 p-6 transition-[background-color,transform] duration-300 hover:bg-[#fcfbf8] sm:p-7"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(40_85_199/0.42),transparent)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/10 transition-transform duration-300 group-hover:-translate-y-0.5">
                    <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <StatusPill status={status} />
                </div>
                <h3 className="mt-6 text-[17px] sm:mt-9 font-semibold tracking-[-0.015em] text-foreground">{title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
                <div className="mt-auto flex items-center justify-between border-t border-hairline pt-4 text-[11px]">
                  <span className="font-medium text-foreground/65">{detail}</span>
                  <span className="text-primary/70 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>
                    →
                  </span>
                </div>
              </li>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
