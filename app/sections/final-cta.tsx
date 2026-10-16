import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, DisplayHeading, Em, Eyebrow } from "@/components/marketing/primitives";
import { CampusLineArt } from "@/components/marketing/campus-line-art";
import { Reveal } from "@/components/marketing/reveal";

export function FinalCTA() {
  return (
    <section aria-labelledby="cta-heading" className="relative overflow-hidden border-t border-[#ebe8df] bg-canvas pt-20 lg:pt-28">
      <Container>
        <Reveal className="mx-auto max-w-[760px] text-center">
          <div data-reveal className="flex justify-center">
            <Eyebrow>For a smarter academic tomorrow</Eyebrow>
          </div>
          <div data-reveal>
            <DisplayHeading id="cta-heading" className="mt-6">
              Ready to create <Em>smarter</Em> examination timetables?
            </DisplayHeading>
            <p className="mx-auto mt-6 max-w-[34rem] text-pretty text-base leading-7 text-muted-foreground sm:text-[17px]">
              Start by organising your rooms, slots, subjects and student groups. The workspace is
              ready for your data today.
            </p>
          </div>
          <div data-reveal className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/admin"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-11 rounded-[10px] px-5 text-[14px] font-medium shadow-[0_8px_20px_-8px_rgba(40,85,199,0.6)] hover:bg-primary/90"
              )}
            >
              Explore the Workspace
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/student"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-[10px] border-[#dcd9d0] bg-white/70 px-5 text-[14px] font-medium hover:bg-white"
              )}
            >
              <GraduationCap className="text-primary" aria-hidden />
              Open Student Portal
            </Link>
          </div>
        </Reveal>
      </Container>

      <div aria-hidden className="mx-auto mt-14 max-w-[920px] px-4 sm:px-8 lg:mt-16">
        <CampusLineArt className="w-full opacity-70" />
      </div>
    </section>
  );
}
