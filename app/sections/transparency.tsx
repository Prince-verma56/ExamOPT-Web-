/**
 * ExamOpt Studio — Transparent by design
 *
 * The product visual leads: a validation workspace pairing the conflict graph
 * with the validation report, plus one related-conflict callout. All values
 * are illustrative sample data and labelled as such. The `transparency` scene
 * builds the graph (nodes, then edges, then the conflict marker), lands the
 * report rows and fills the utilisation meter once, then lets the callout
 * drift at a different depth while scrolling.
 */

import { ArrowLeftRight, FileSearch, Lock, ShieldCheck } from "lucide-react";
import { Scene } from "@/animations/page-scenes/scene";
import { Container, Em, Eyebrow, Lede, PreviewTag } from "@/components/marketing/primitives";
import { RevealHeading } from "@/components/marketing/motion";
import { Reveal } from "@/components/marketing/reveal";
import { ConflictGraphPreview } from "@/components/marketing/previews/conflict-graph";
import { ValidationSummaryPreview } from "@/components/marketing/previews/validation-summary";

const PRINCIPLES = [
  {
    icon: Lock,
    title: "Hard constraints are never traded away",
    body: "Capacity, labs, fixed slots and student clashes are checked independently of the strategy that built the timetable.",
  },
  {
    icon: FileSearch,
    title: "Every failure names its cause",
    body: "When a schedule is infeasible, the report points to the constraint and the exams responsible.",
  },
  {
    icon: ShieldCheck,
    title: "No claims before validation",
    body: "ExamOpt reports a timetable as conflict-free only after the validator has actually run.",
  },
];

export function TransparencySection() {
  return (
    <Scene
      name="transparency"
      id="transparency"
      aria-labelledby="transparency-heading"
      className="relative isolate scroll-mt-20 overflow-hidden bg-[linear-gradient(180deg,var(--canvas)_0%,#f1f4fb_18%,#eef3ff_78%,var(--canvas)_100%)] pb-28 pt-24 lg:pb-32 lg:pt-32"
    >
      {/* Soft daylight and a faint technical grid behind the product */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-[-8%] top-[8%] h-[640px] w-[860px] rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.95),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(rgb(40_85_199/0.13)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(60%_55%_at_70%_50%,black,transparent)]" />
      </div>

      <Container>
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-10">
          {/* ── Editorial column ─────────────────────────────────────── */}
          <div className="lg:col-span-5">
            <Reveal>
              <Eyebrow>Transparent by design</Eyebrow>
            </Reveal>
            <RevealHeading id="transparency-heading" className="mt-6">
              Every decision, <Em>explained.</Em>
            </RevealHeading>
            <Reveal y={20}>
              <Lede className="mt-6 max-w-[27rem]">
                ExamOpt validates each timetable against your constraints and makes conflicts and
                infeasible schedules understandable.
              </Lede>
            </Reveal>
            <Reveal as="ul" className="mt-10 divide-y divide-[#d9e0ee] border-y border-[#d9e0ee]" y={16} stagger={0.1}>
              {PRINCIPLES.map(({ icon: Icon, title, body }) => (
                <li key={title} data-reveal className="flex gap-4 py-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-primary shadow-[0_1px_2px_rgb(23_32_51/0.06)] ring-1 ring-primary/10">
                    <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
                    <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </Reveal>
          </div>

          {/* ── Product composition ──────────────────────────────────── */}
          <div className="relative lg:col-span-7 lg:pl-4">
            <div data-graph-panel className="glass rounded-[26px] p-1.5 ring-1 ring-primary/10">
              <figure
                aria-label="Validation workspace preview with a sample conflict graph and validation report"
                className="overflow-hidden rounded-[21px] border border-hairline bg-white"
              >
                <div className="flex items-center justify-between gap-3 border-b border-hairline bg-[#fbfaf7] px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2 text-[11.5px] text-muted-foreground">
                    <span className="font-semibold text-foreground">ExamOpt</span>
                    <span aria-hidden>/</span>
                    <span className="truncate">Validation</span>
                  </div>
                  <div aria-hidden className="hidden items-center gap-1 rounded-lg bg-[#f2f0ea] p-0.5 text-[11px] sm:flex">
                    {["Conflicts", "Rooms", "Report"].map((t, i) => (
                      <span
                        key={t}
                        className={i === 0 ? "rounded-md bg-white px-2.5 py-0.5 font-medium text-foreground shadow-sm" : "px-2.5 py-0.5 text-muted-foreground"}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <PreviewTag>Sample data</PreviewTag>
                </div>
                <div className="grid divide-y divide-hairline md:grid-cols-[1.2fr_1fr] md:divide-x md:divide-y-0">
                  <div className="p-5 sm:p-6">
                    <ConflictGraphPreview />
                  </div>
                  <div className="p-5 sm:p-6">
                    <ValidationSummaryPreview />
                  </div>
                </div>
                <figcaption className="sr-only">
                  Illustrative example only — not the output of a scheduling run.
                </figcaption>
              </figure>
            </div>

            {/* Related conflict — floats at a different depth */}
            <div data-depth="float" className="relative z-10 -mt-6 ml-4 w-[min(320px,calc(100%-2rem))] sm:absolute sm:bottom-0 sm:left-10 sm:ml-0 sm:mt-0 lg:-left-10">
              <div data-float-chip className="glass rounded-2xl p-4 sm:translate-y-[82%]">
                <div className="flex items-center justify-between">
                  <p className="type-label text-[10px] text-muted-foreground">Related conflict</p>
                  <PreviewTag>Sample</PreviewTag>
                </div>
                <p className="mt-3 flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  BCA-302
                  <ArrowLeftRight className="size-3.5 text-destructive" aria-label="conflicts with" />
                  BCADS-302
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-muted-foreground">
                  Shared students in the same session. Moving either paper to another session
                  resolves it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Scene>
  );
}
