/**
 * Transparent by design — why ExamOpt is trustworthy: every result is
 * re-validated and every failure is explained. Previews use sample data.
 */

import { Container, DisplayHeading, Em, Eyebrow, Lede } from "@/components/marketing/primitives";
import { Reveal } from "@/components/marketing/reveal";
import { ConflictGraphPreview } from "@/components/marketing/previews/conflict-graph";
import { ValidationSummaryPreview } from "@/components/marketing/previews/validation-summary";

const principles = [
  {
    title: "Hard constraints are never traded away",
    body: "Capacity, labs, fixed slots and student clashes are checked independently of the strategy that built the timetable.",
  },
  {
    title: "Every failure names its cause",
    body: "When a schedule is infeasible, the report points to the constraint and the exams responsible.",
  },
  {
    title: "No claims before validation",
    body: "ExamOpt reports a timetable as conflict-free only after the validator has actually run.",
  },
];

export function TransparencySection() {
  return (
    <section id="transparency" aria-labelledby="transparency-heading" className="scroll-mt-20 border-t border-[#ebe8df] bg-canvas py-20 lg:py-28">
      <Container className="grid gap-14 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-5">
          <div data-reveal>
            <Eyebrow>Transparent by design</Eyebrow>
            <DisplayHeading id="transparency-heading" className="mt-5">
              Understand <Em>every</Em> decision.
            </DisplayHeading>
            <Lede className="mt-6 max-w-[34rem]">
              ExamOpt is designed to validate every timetable against your constraints and to
              explain conflicts and infeasible scenarios in plain language.
            </Lede>
          </div>
          <ol data-reveal className="mt-10 space-y-6">
            {principles.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[28px_1fr] gap-3">
                <span className="font-display text-xl leading-6 text-primary">{i + 1}</span>
                <div>
                  <p className="text-[15px] font-semibold tracking-tight text-foreground">{p.title}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="lg:col-span-7" y={24}>
          <figure data-reveal className="overflow-hidden rounded-2xl border border-[#e6e2d8] bg-white shadow-[0_1px_2px_rgba(23,32,51,0.03),0_30px_60px_-40px_rgba(23,32,51,0.35)]">
            <div className="grid md:grid-cols-2 md:divide-x md:divide-[#ece9e1]">
              <div className="border-b border-[#ece9e1] p-5 sm:p-6 md:border-b-0">
                <ConflictGraphPreview />
              </div>
              <div className="p-5 sm:p-6">
                <ValidationSummaryPreview />
              </div>
            </div>
            <figcaption className="border-t border-[#ece9e1] bg-[#fbfaf7] px-5 py-3 text-[12px] text-muted-foreground sm:px-6">
              Illustrative sample report. The graph and the summary describe the same sample
              timetable — values are not produced by the scheduling engine, which is in development.
            </figcaption>
          </figure>
        </Reveal>
      </Container>
    </section>
  );
}
