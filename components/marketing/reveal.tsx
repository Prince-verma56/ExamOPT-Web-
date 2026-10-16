"use client";

/**
 * Reveal — restrained scroll-triggered entrance for a homepage section.
 *
 * One ScrollTrigger per wrapper. Direct targets are elements marked with
 * `data-reveal` inside it (or the wrapper itself when there are none), so
 * individual cards and table cells are never animated one by one.
 * Built on the shared useGsap hook, which handles cleanup and skips
 * animation entirely when the visitor prefers reduced motion.
 */

import { useRef } from "react";
import { useGsap } from "@/animations/hooks/use-gsap";
import { cn } from "@/lib/utils";

export function Reveal({
  className,
  children,
  y = 28,
  stagger = 0.09,
  start = "top 82%",
}: {
  className?: string;
  children: React.ReactNode;
  y?: number;
  stagger?: number;
  start?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGsap(
    (gsap) => {
      const el = ref.current;
      if (!el) return;
      const marked = el.querySelectorAll<HTMLElement>("[data-reveal]");
      const targets = marked.length ? Array.from(marked) : [el];

      gsap.from(targets, {
        y,
        autoAlpha: 0,
        duration: 0.85,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start, once: true },
      });
    },
    [],
    { scope: ref }
  );

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
