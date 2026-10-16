/**
 * ExamOpt Studio — Closing call to action
 *
 * Heading and actions sit in the open sky of the campus photograph, which
 * dissolves into the page canvas at the top and settles into place as the
 * visitor arrives (`closing` scene). The building's forecourt leads straight
 * into the footer.
 */

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Scene } from "@/animations/page-scenes/scene";
import { Container, ctaStyles, Em, Eyebrow } from "@/components/marketing/primitives";
import { RevealHeading } from "@/components/marketing/motion";

export function FinalCTA() {
  return (
    <Scene
      name="closing"
      aria-labelledby="cta-heading"
      className="relative isolate overflow-hidden bg-canvas pt-20 sm:pt-24 lg:pt-28"
    >
      <Container className="relative z-10">
        <div className="mx-auto flex max-w-[780px] flex-col items-center text-center">
          <div data-cta-copy className="flex flex-col items-center">
            <Eyebrow>For a smarter academic tomorrow</Eyebrow>
          </div>
          <RevealHeading id="cta-heading" className="mt-6" start="top 82%">
            Ready to create <Em>smarter</Em> examination timetables?
          </RevealHeading>
          <div data-cta-copy className="flex flex-col items-center">
            <p className="type-lede mt-6 max-w-[34rem] text-pretty text-muted-foreground">
              Start by organising your rooms, slots, subjects and student groups. The workspace is
              ready for your data today.
            </p>
            <div className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link href="/admin" className={cn(ctaStyles.primary, ctaStyles.lg)}>
                Explore the workspace
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link href="/student" className={cn(ctaStyles.secondary, ctaStyles.lg)}>
                <GraduationCap className="size-4 text-primary" aria-hidden />
                Open the student portal
              </Link>
            </div>
          </div>
        </div>
      </Container>

      {/* Campus photograph: sky fades into the canvas at top, forecourt softly meets canvas at bottom */}
      <div className="relative -mt-6 h-[clamp(300px,38vw,560px)] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent_0%,black_25%,black_92%,transparent_100%)] sm:-mt-10 lg:-mt-16">
        <div data-cta-photo className="absolute inset-0 origin-bottom">
          <Image
            src="/Images/BG Images/Elegant Neoclassical Campus Facade.png"
            alt="Neoclassical university campus at golden hour"
            fill
            sizes="100vw"
            className="object-cover object-[50%_78%]"
          />
        </div>
      </div>
    </Scene>
  );
}
