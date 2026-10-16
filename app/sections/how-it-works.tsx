/**
 * How ExamOpt works — three connected steps sharing one rail, each with a
 * small native preview of the stage it describes.
 */

import { AlertTriangle, ArrowDown, Check, Layers, ShieldCheck, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowLink, Container, DisplayHeading, Em, Eyebrow, Lede, PreviewTag } from "@/components/marketing/primitives";
import { Reveal } from "@/components/marketing/reveal";
import { SAMPLE_DATASET } from "@/components/marketing/previews/sample-data";

function PreviewSurface({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#e6e2d8] bg-white p-4 text-[12px] shadow-[0_1px_2px_rgba(23,32,51,0.03),0_12px_32px_-24px_rgba(23,32,51,0.25)]",
        className
      )}
    >
      {children}
    </div>
  );
}

function PrepareDataPreview() {
  const rows = [
    { label: "Subjects", count: SAMPLE_DATASET.subjects, ok: true },
    { label: "Student groups", count: SAMPLE_DATASET.studentGroups, ok: true },
    { label: "Rooms & labs", count: SAMPLE_DATASET.rooms, ok: true },
    { label: "Time slots", count: SAMPLE_DATASET.timeSlots, ok: true },
    { label: "Constraints", count: null, ok: false },
  ];
  return (
    <PreviewSurface>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium">Data readiness</span>
        <PreviewTag>Sample</PreviewTag>
      </div>
      <ul className="divide-y divide-border/70">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 py-2">
            <span className="flex-1 text-foreground/85">{r.label}</span>
            {r.count !== null && <span className="tabular-nums text-muted-foreground">{r.count}</span>}
            {r.ok ? (
              <Check className="size-3.5 text-success" strokeWidth={2.75} aria-label="Validated" />
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] text-warning">
                <AlertTriangle className="size-3" aria-hidden /> Review
              </span>
            )}
          </li>
        ))}
      </ul>
    </PreviewSurface>
  );
}

function GeneratePreview() {
  return (
    <PreviewSurface>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-medium">Generation pipeline</span>
        <span className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-[10px] font-medium text-primary">
          In development
        </span>
      </div>
      <ol className="space-y-1.5">
        {[
          { icon: Layers, title: "Candidate schedule", body: "Strategy places each exam" },
          { icon: ShieldCheck, title: "Independent validator", body: "Re-checks every hard constraint" },
        ].map(({ icon: Icon, title, body }, i) => (
          <li key={title}>
            {i > 0 && <ArrowDown className="mx-auto my-1 size-3 text-muted-foreground" aria-hidden />}
            <div className="flex items-center gap-3 rounded-lg border border-border/80 bg-[#fbfbf9] px-3 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-white text-primary shadow-[0_0_0_1px_rgba(23,32,51,0.06)]">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="font-medium">{title}</p>
                <p className="text-[11px] text-muted-foreground">{body}</p>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </PreviewSurface>
  );
}

function PublishPreview() {
  const rows = [
    { program: "BCA", status: "Approved", tone: "text-success", dot: "bg-success" },
    { program: "BCA-DS", status: "In review", tone: "text-warning", dot: "bg-warning" },
    { program: "MCA", status: "Draft", tone: "text-muted-foreground", dot: "bg-muted-foreground/50" },
  ];
  return (
    <PreviewSurface>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-medium">Release review</span>
        <PreviewTag>Sample</PreviewTag>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
            <th className="py-1.5 font-medium">Programme</th>
            <th className="py-1.5 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((r) => (
            <tr key={r.program}>
              <td className="py-2">{r.program}</td>
              <td className={cn("py-2 text-right", r.tone)}>
                <span className="inline-flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", r.dot)} aria-hidden />
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        aria-hidden
        className="mt-3 flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary text-[12px] font-medium text-primary-foreground"
      >
        <Send className="size-3" /> Publish approved
      </div>
    </PreviewSurface>
  );
}

const steps = [
  {
    n: "01",
    title: "Prepare data",
    body: "Import subjects, students, rooms and time slots, then define the constraints that govern them. Every record is checked before it can be scheduled.",
    preview: <PrepareDataPreview />,
  },
  {
    n: "02",
    title: "Generate and validate",
    body: "A scheduling strategy proposes a timetable; an independent validator re-checks it against every hard constraint and explains anything that fails.",
    preview: <GeneratePreview />,
  },
  {
    n: "03",
    title: "Review and publish",
    body: "Administrators review the result, compare alternatives and publish only the timetable they approve — for staff and students alike.",
    preview: <PublishPreview />,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-20 bg-white py-20 lg:py-28">
      <Container>
        <Reveal className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div data-reveal className="lg:col-span-7">
            <Eyebrow>How ExamOpt works</Eyebrow>
            <DisplayHeading id="how-heading" className="mt-5">
              From data to a <Em>reliable</Em> timetable.
            </DisplayHeading>
          </div>
          <div data-reveal className="lg:col-span-5">
            <Lede>
              A simple, structured workflow — from raw records to a validated, published
              examination timetable.
            </Lede>
            <ArrowLink href="/admin" className="mt-4">
              Open the workspace
            </ArrowLink>
          </div>
        </Reveal>

        <Reveal className="relative mt-16 lg:mt-20" stagger={0.12}>
          {/* Shared rail connecting the three steps (desktop) */}
          <div aria-hidden className="absolute left-0 right-0 top-[19px] hidden h-px bg-linear-to-r from-transparent via-[#d6d2c6] to-transparent lg:block" />

          <ol className="grid gap-14 lg:grid-cols-3 lg:gap-10">
            {steps.map((step, i) => (
              <li data-reveal key={step.n} className="relative">
                {/* Vertical rail on mobile/tablet */}
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute left-[19px] top-12 -bottom-14 w-px bg-[#e3dfd4] lg:hidden" />
                )}
                <div className="flex items-center gap-4">
                  <span className="relative z-10 grid size-10 place-items-center rounded-full border border-primary/25 bg-white font-display text-xl text-primary">
                    {step.n}
                  </span>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">{step.title}</h3>
                </div>
                <div className="pl-14 lg:pl-0">
                  <p className="mt-4 max-w-[34ch] text-[14.5px] leading-relaxed text-muted-foreground">{step.body}</p>
                  <div className="mt-6 max-w-[380px]">{step.preview}</div>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      </Container>
    </section>
  );
}
