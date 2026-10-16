import Image from "next/image";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Container, DisplayHeading, Em, Eyebrow } from "@/components/marketing/primitives";
import { Reveal } from "@/components/marketing/reveal";

export function FinalCTA() {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative overflow-hidden border-t border-[#ebe8df] bg-[#fbf9f4] min-h-[760px] sm:min-h-[880px] lg:min-h-[980px] xl:min-h-[1050px] flex flex-col justify-start pt-14 sm:pt-16 lg:pt-20"
    >
      {/* ── Background: Neoclassical Campus Facade ────────────────────── */}
      <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
        <Image
          src="/Images/BG Images/Elegant Neoclassical Campus Facade.png"
          alt="Neoclassical Campus Architecture"
          fill
          quality={95}
          className="object-cover object-bottom"
        />
        {/* Soft top gradient to keep text crisp over the sky */}
        <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-[#faf8f5]/90 via-[#faf8f5]/40 to-transparent pointer-events-none" />
      </div>

      <Container className="relative z-10">
        <Reveal className="mx-auto max-w-[760px] text-center">
          <div data-reveal className="flex justify-center">
            <Eyebrow>For a smarter academic tomorrow</Eyebrow>
          </div>
          <div data-reveal>
            <DisplayHeading id="cta-heading" className="mt-4 sm:mt-5 text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              Ready to create <Em>smarter</Em> examination timetables?
            </DisplayHeading>
            <p className="mx-auto mt-4 sm:mt-5 max-w-[34rem] text-pretty text-sm sm:text-base leading-relaxed text-slate-600 sm:text-[16.5px]">
              Start by organising your rooms, slots, subjects and student groups. The workspace is
              ready for your data today.
            </p>
          </div>
          <div data-reveal className="mt-7 sm:mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/admin"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-11 rounded-[10px] px-6 text-[14px] font-medium shadow-[0_8px_20px_-8px_rgba(40,85,199,0.6)] hover:bg-primary/90 transition-all hover:shadow-[0_12px_24px_-8px_rgba(40,85,199,0.8)]"
              )}
            >
              Explore the Workspace
              <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
            <Link
              href="/student"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 rounded-[10px] border-[#dcd9d0] bg-white/90 backdrop-blur-md px-6 text-[14px] font-medium text-slate-800 hover:bg-white hover:text-slate-900 transition-all shadow-sm"
              )}
            >
              <GraduationCap className="text-primary size-4" aria-hidden />
              Open Student Portal
            </Link>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
