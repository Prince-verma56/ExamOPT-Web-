/**
 * ExamOpt Studio — Homepage
 * Editorial, light-themed landing page for the examination scheduling platform.
 * Sections: Nav, Hero, Problem, How It Works, Capabilities,
 *           Administrators & Students, Transparency, Final CTA + Footer
 */

import { ExamOptNav } from "@/components/navigation/examopt-nav";
import { ExamOptFooter } from "@/components/layout/examopt-footer";
import { HeroSection } from "./sections/hero";
import { ProblemSection } from "./sections/problem";
import { HowItWorksSection } from "./sections/how-it-works";
import { CapabilitiesSection } from "./sections/capabilities";
import { AudiencesSection } from "./sections/audiences";
import { TransparencySection } from "./sections/transparency";
import { FinalCTA } from "./sections/final-cta";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Examinations, scheduled with clarity",
  description:
    "Turn complex examination constraints into feasible, explainable timetables. Coordinate rooms and student groups, compare scheduling strategies, and understand why difficult schedules fail.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <ExamOptNav />
      <main id="main">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <AudiencesSection />
        <TransparencySection />
        <FinalCTA />
      </main>
      <ExamOptFooter />
    </div>
  );
}
