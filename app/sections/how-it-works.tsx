/**
 * How ExamOpt works — three stages on one rail. The rail draws itself as the
 * visitor scrolls and each numbered stage lights up when the line reaches it
 * (`process` scene). Each stage carries a small native preview.
 */

import { AlertTriangle, ArrowDown, Check, Layers, Send, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Scene } from "@/animations/page-scenes/scene";
import { ArrowLink, Container, Em, Eyebrow, Lede, PreviewTag } from "@/components/marketing/primitives";
import { RevealHeading } from "@/components/marketing/motion";
import { Reveal } from "@/components/marketing/reveal";
import { SAMPLE_DATASET } from "@/components/marketing/previews/sample-data";

function PreviewSurface({ title, tag, children }: { title: string; tag: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-hairline bg-white text-[12.5px] shadow-panel">
      <div className="flex items-center justify-between border-b border-hairline bg-[#fbfaf7] px-4 py-2.5">
        <span className="font-medium text-foreground">{title}</span>
        {tag}
      </div>
      <div className="p-4">{children}</div>
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
    <PreviewSurface title="Data readiness" tag={<PreviewTag>Sample</PreviewTag>}>
      <ul className="-my-1.5 divide-y divide-hairline">
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
    <PreviewSurface
      title="Generation pipeline"
      tag={
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">In development</span>
      }
    >
      <ol>
        {[
          { icon: Layers, title: "Candidate schedule", body: "A strategy places each exam" },
          { icon: ShieldCheck, title: "Independent validator", body: "Re-checks every hard constraint" },
        ].map(({ icon: Icon, title, body }, i) => (
          <li key={title}>
            {i > 0 && <ArrowDown className="mx-auto my-1.5 size-3 text-muted-foreground" aria-hidden />}
            <div className="flex items-center gap-3 rounded-xl border border-hairline bg-[#fbfaf7] px-3 py-2.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-primary shadow-[0_0_0_1px_rgb(23_32_51/0.06)]">
                <Icon className="size-3.5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="font-medium text-foreground">{title}</p>
                <p className="mt-0.5 text-[11.5px] text-muted-foreground">{body}</p>
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
    <PreviewSurface title="Release review" tag={<PreviewTag>Sample</PreviewTag>}>
      <table className="-mt-1 w-full">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
            <th className="py-1.5 font-medium">Programme</th>
            <th className="py-1.5 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {rows.map((r) => (
            <tr key={r.program}>
              <td className="py-2 text-foreground/85">{r.program}</td>
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
    handoff: "Validated records",
    preview: <PrepareDataPreview />,
  },
  {
    n: "02",
    title: "Generate and validate",
    body: "A scheduling strategy proposes a timetable; an independent validator re-checks it against every hard constraint and explains anything that fails.",
    handoff: "Checked draft",
    preview: <GeneratePreview />,
  },
  {
    n: "03",
    title: "Review and publish",
    body: "Administrators review the result, compare alternatives and publish only the timetable they approve — for staff and students alike.",
    handoff: null,
    preview: <PublishPreview />,
  },
];

/** Numbered stage marker. Rendered fully "on"; the scene animates it up from off. */
function StageNode({ n, axis }: { n: string; axis: "x" | "y" }) {
  return (
    <span
      data-rail-node={axis}
      className="relative z-10 grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-primary/30 bg-white"
    >
      <span data-node-fill className="absolute inset-0 rounded-full bg-primary" />
      <span data-node-label className="relative text-[13px] font-semibold tabular-nums text-white">
        {n}
      </span>
    </span>
  );
}

export function HowItWorksSection() {
  return (
    <Scene
      name="process"
      id="how-it-works"
      aria-labelledby="how-heading"
      className="relative scroll-mt-20 border-t border-hairline bg-white py-24 lg:py-32"
    >
      <Container>
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            <Reveal>
              <Eyebrow>How ExamOpt works</Eyebrow>
            </Reveal>
            <RevealHeading id="how-heading" className="mt-6 max-w-[15ch]">
              From data to a <Em>reliable</Em> timetable.
            </RevealHeading>
          </div>
          <Reveal className="lg:col-span-5 lg:pb-2" y={20}>
            <Lede className="max-w-[28rem]">
              A structured workflow — from raw records to a validated, published examination
              timetable.
            </Lede>
            <ArrowLink href="/admin" className="mt-5">
              Open the workspace
            </ArrowLink>
          </Reveal>
        </div>

        <div data-rail className="relative mt-16 lg:mt-20">
          {/* Desktop rail: one line through the three stages */}
          <div aria-hidden className="relative hidden h-10 lg:block">
            <div className="absolute left-5 right-[calc((100%_-_5rem)/3_-_1.25rem)] top-1/2 h-px -translate-y-1/2 bg-hairline">
              <div data-rail-fill="x" className="absolute inset-0 origin-left bg-primary" />
            </div>
            <div className="grid h-full grid-cols-3 gap-10">
              {steps.map((step) => (
                <div key={step.n} className="relative flex items-center">
                  <StageNode n={step.n} axis="x" />
                  {step.handoff && (
                    <span
                      data-rail-packet
                      className="absolute left-[calc(50%_+_2.5rem)] top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1 text-[11px] font-medium text-muted-foreground shadow-[0_1px_2px_rgb(23_32_51/0.05)]"
                    >
                      {step.handoff}
                      <span className="text-primary">→</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile rail: vertical line beside the stacked stages */}
          <div aria-hidden className="absolute bottom-0 left-5 top-5 w-px bg-hairline lg:hidden">
            <div data-rail-fill="y" className="absolute inset-0 origin-top bg-primary" />
          </div>

          <ol className="relative grid gap-14 lg:mt-8 lg:grid-cols-3 lg:gap-10">
            {steps.map((step) => (
              <li data-step key={step.n} className="relative pl-14 lg:pl-0">
                <span className="absolute left-0 top-0 lg:hidden">
                  <StageNode n={step.n} axis="y" />
                </span>
                <h3 className="pt-2 text-[19px] font-semibold tracking-[-0.015em] text-foreground lg:pt-0">
                  <span className="sr-only">Step {step.n}: </span>
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[36ch] text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
                <div className="mt-7 max-w-[400px]">{step.preview}</div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </Scene>
  );
}
