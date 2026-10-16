"use client";

import Link from "next/link";
import { useRef } from "react";
import { AlertTriangle, ArrowRight, Play } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGsap } from "@/animations/hooks/use-gsap";
import { Container, DisplayHeading, Em, Eyebrow, Lede } from "@/components/marketing/primitives";
import { CampusLineArt } from "@/components/marketing/campus-line-art";
import { ScheduleDashboard } from "@/components/marketing/previews/schedule-dashboard";
import { SAMPLE_DATASET } from "@/components/marketing/previews/sample-data";

const datasetFacts = [
  { value: SAMPLE_DATASET.subjects, label: "Subjects" },
  { value: SAMPLE_DATASET.rooms, label: "Rooms & labs" },
  { value: SAMPLE_DATASET.timeSlots, label: "Time slots" },
  { value: SAMPLE_DATASET.studentGroups, label: "Student groups" },
];

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);

  useGsap(
    (gsap) => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.fromTo(
        "[data-hero='copy']",
        { y: 18, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.8, stagger: 0.08 }
      )
        .fromTo(
          "[data-hero='art']",
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 1.2, ease: "power2.out" },
          0.1
        )
        .fromTo(
          "[data-hero='preview']",
          { y: 36, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out" },
          0.25
        )
        .fromTo(
          "[data-hero='callout']",
          { y: 12, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.6 },
          0.85
        );
    },
    [],
    { scope: ref }
  );

  return (
    <section
      ref={ref}
      aria-labelledby="hero-heading"
      className="relative overflow-x-clip bg-canvas pt-28 pb-20 sm:pt-32 lg:pt-36 lg:pb-28"
    >
      {/* Without JavaScript the entrance never runs, so keep content visible. */}
      <noscript>
        <style>{`.hero-enter{opacity:1!important}`}</style>
      </noscript>

      <Container className="grid items-center gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 xl:gap-14">
        {/* Editorial copy */}
        <div className="relative z-10 max-w-[560px]">
          <div data-hero="copy" className="hero-enter">
            <Eyebrow>Intelligent examination scheduling</Eyebrow>
          </div>

          <div data-hero="copy" className="hero-enter">
            <DisplayHeading as="h1" size="hero" id="hero-heading" className="mt-6">
              Examinations,
              <br />
              scheduled with <Em>clarity.</Em>
            </DisplayHeading>
          </div>

          <div data-hero="copy" className="hero-enter">
            <Lede className="mt-6 max-w-[30rem]">
              Turn complex examination constraints into feasible, explainable timetables.
              Coordinate rooms and student groups, compare scheduling strategies, and understand
              why difficult schedules fail.
            </Lede>
          </div>

          <div data-hero="copy" className="hero-enter mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/admin"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-11 rounded-[10px] px-5 text-[14px] font-medium shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_20px_-8px_rgba(40,85,199,0.6)] hover:bg-primary/90"
              )}
            >
              Explore the Workspace
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <a
              href="#how-it-works"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-[10px] border-[#dcd9d0] bg-white/70 px-5 text-[14px] font-medium hover:bg-white"
              )}
            >
              <Play className="size-3.5 fill-primary text-primary" aria-hidden />
              See How It Works
            </a>
          </div>

          <div data-hero="copy" className="hero-enter mt-12 border-t border-[#e3e0d7] pt-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Bundled sample dataset
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
              {datasetFacts.map((fact) => (
                <li key={fact.label} className="min-w-0">
                  <span className="block text-[22px] font-semibold leading-none tracking-tight tabular-nums text-foreground sm:text-2xl">
                    {fact.value}
                  </span>
                  <span className="mt-1.5 block truncate text-[11.5px] text-muted-foreground sm:text-xs">
                    {fact.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Product visual */}
        <div className="relative lg:pt-20">
          <div
            data-hero="art"
            className="hero-enter pointer-events-none absolute -top-10 left-1/2 w-[118%] -translate-x-1/2 sm:-top-16 lg:-top-8 lg:left-[58%] lg:w-[125%]"
            style={{ maskImage: "linear-gradient(to bottom, black 45%, transparent 92%)" }}
          >
            <CampusLineArt className="w-full" />
          </div>

          <div data-hero="preview" className="hero-enter relative pt-24 sm:pt-36 lg:-mr-10 lg:pt-28 xl:-mr-20">
            <ScheduleDashboard />

            <div
              data-hero="callout"
              className="hero-enter absolute -bottom-20 -left-8 hidden w-[264px] rounded-xl border border-[#e3e1da] bg-white p-4 shadow-[0_18px_40px_-20px_rgba(23,32,51,0.35)] lg:block xl:-left-12"
            >
              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-warning">
                <AlertTriangle className="size-3.5" aria-hidden />
                Why is this flagged?
              </p>
              <p className="mt-2 text-[13px] leading-snug text-foreground">
                BCA-302 and BCADS-302 share enrolled students and sit in the same Wednesday
                morning session.
              </p>
              <p className="mt-2.5 text-[11px] text-muted-foreground">Illustrative explanation · sample data</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
