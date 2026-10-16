/**
 * Core capabilities — editorial column plus one contained panel. Capabilities
 * are separated by hairlines rather than repeated cards, and each carries an
 * honest availability status.
 */

import { Building2, Database, FileSearch, GitCompareArrows, Waypoints, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowLink, Container, DisplayHeading, Em, Eyebrow, Lede } from "@/components/marketing/primitives";
import { Reveal } from "@/components/marketing/reveal";

type Status = "available" | "in-development";

const capabilities: {
  icon: typeof Database;
  title: string;
  body: string;
  status: Status;
}[] = [
  {
    icon: Database,
    title: "Data management",
    body: "Subjects, students, rooms, slots and constraints — imported, validated and kept consistent.",
    status: "available",
  },
  {
    icon: Workflow,
    title: "Scheduling engine",
    body: "Deterministic generation that respects every hard constraint before any preference.",
    status: "in-development",
  },
  {
    icon: Waypoints,
    title: "Conflict analysis",
    body: "Shared-student and backlog clashes surfaced as a graph you can inspect.",
    status: "in-development",
  },
  {
    icon: GitCompareArrows,
    title: "Algorithm comparison",
    body: "Run strategies side by side and compare feasibility, spread and utilisation.",
    status: "in-development",
  },
  {
    icon: Building2,
    title: "Room allocation",
    body: "Capacity- and lab-aware seating, with utilisation shown room by room.",
    status: "in-development",
  },
  {
    icon: FileSearch,
    title: "Explainable diagnostics",
    body: "When a timetable cannot be built, the constraint responsible is named.",
    status: "in-development",
  },
];

const statusLabel: Record<Status, string> = {
  available: "Available",
  "in-development": "In development",
};

export function CapabilitiesSection() {
  return (
    <section id="capabilities" aria-labelledby="capabilities-heading" className="scroll-mt-20 border-t border-[#ebe8df] bg-canvas py-20 lg:py-28">
      <Container className="grid gap-12 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-4">
          <div data-reveal>
            <Eyebrow>Core capabilities</Eyebrow>
            <DisplayHeading id="capabilities-heading" className="mt-5">
              Everything you need, <Em>thoughtfully integrated.</Em>
            </DisplayHeading>
            <Lede className="mt-6">
              Create, analyse and publish examination timetables in one workspace. Data management
              is ready today; the scheduling capabilities are being built in the next phase.
            </Lede>
            <ArrowLink href="/admin/data" className="mt-8">
              Open the data workspace
            </ArrowLink>
          </div>
        </Reveal>

        <Reveal className="lg:col-span-8" y={20}>
          <ul
            data-reveal
            className="grid gap-px overflow-hidden rounded-2xl border border-[#e6e2d8] bg-[#ece9e1] sm:grid-cols-2 lg:grid-cols-3"
          >
            {capabilities.map(({ icon: Icon, title, body, status }) => (
              <li key={title} className="grid grid-cols-[40px_1fr] gap-x-4 bg-white p-5 transition-colors hover:bg-[#fcfbf8] sm:flex sm:flex-col sm:p-7">
                <span className="grid size-10 place-items-center rounded-[10px] border border-primary/15 bg-primary/[0.06] text-primary">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <div className="flex flex-1 flex-col">
                  <h3 className="text-[15px] font-semibold tracking-tight text-foreground sm:mt-5">{title}</h3>
                  <p className="mt-1.5 flex-1 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
                  <p
                    className={cn(
                      "mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium sm:mt-5",
                      status === "available" ? "text-success" : "text-muted-foreground"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("size-1.5 rounded-full", status === "available" ? "bg-success" : "bg-[#c8c3b6]")}
                    />
                    {statusLabel[status]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </Container>
    </section>
  );
}
