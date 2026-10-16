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
import { useMotionReady } from "@/animations/hooks/use-motion-ready";
import { cn } from "@/lib/utils";

export function Reveal({
  className,
  children,
  y = 28,
  x = 0,
  stagger = 0.09,
  start = "top 82%",
  id,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  y?: number;
  x?: number;
  stagger?: number;
  start?: string;
  id?: string;
  as?: "div" | "ul" | "ol";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useMotionReady();

  useGsap(
    (gsap) => {
      const el = ref.current;
      if (!el || !ready) return;
      const marked = el.querySelectorAll<HTMLElement>("[data-reveal]");
      const targets = marked.length ? Array.from(marked) : [el];

      gsap.from(targets, {
        y,
        x,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start, once: true },
      });
    },
    [ready],
    { scope: ref }
  );

  return (
    <Tag ref={ref as React.Ref<never>} id={id} className={cn(className)}>
      {children}
    </Tag>
  );
}
