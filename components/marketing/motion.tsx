"use client";

/**
 * Homepage motion primitives, built on the shared GSAP setup:
 *
 * - RevealHeading: display heading revealed line by line through a mask.
 * - Parallax:      scroll-scrubbed vertical drift for a single layer.
 * - ClipReveal:    images uncovered with a clip-path wipe while they settle.
 *
 * Every primitive renders its final composition without JavaScript, skips
 * animation under prefers-reduced-motion (via useGsap) and waits for the
 * optional preloader (via useMotionReady).
 */

import { useRef } from "react";
import { useGsap } from "@/animations/hooks/use-gsap";
import { useMotionReady } from "@/animations/hooks/use-motion-ready";
import { SplitText, motionEnvironment } from "@/animations/core";
import { cn } from "@/lib/utils";
import { headingSizes, type HeadingSize } from "./primitives";

export function RevealHeading({
  as: Tag = "h2",
  size = "section",
  id,
  className,
  children,
  start = "top 86%",
  delay = 0,
}: {
  as?: "h1" | "h2" | "h3";
  size?: HeadingSize;
  id?: string;
  className?: string;
  children: React.ReactNode;
  start?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const ready = useMotionReady();

  useGsap(
    (gsap) => {
      const el = ref.current;
      if (!el || !ready) return;

      // autoSplit re-splits after font loading and resizes; returning the tween
      // from onSplit lets SplitText carry its progress across re-splits.
      SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "split-line",
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 112,
            duration: 1.1,
            ease: "power4.out",
            stagger: 0.085,
            delay,
            scrollTrigger: { trigger: el, start, once: true },
          });
        },
      });
    },
    [ready],
    { scope: ref }
  );

  return (
    <Tag ref={ref} id={id} className={cn("text-balance text-foreground", headingSizes[size], className)}>
      {children}
    </Tag>
  );
}

/**
 * Moves its content from `from` to `to` pixels while the wrapper crosses the
 * viewport. Distances are scaled down on small screens. The wrapper is the
 * trigger, so the moving layer never measures itself.
 */
export function Parallax({
  children,
  className,
  innerClassName,
  from = 40,
  to = -40,
  mobileScale = 0.35,
}: {
  children: React.ReactNode;
  className?: string;
  innerClassName?: string;
  from?: number;
  to?: number;
  mobileScale?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useMotionReady();

  useGsap(
    (gsap) => {
      const el = ref.current;
      const layer = el?.firstElementChild;
      if (!el || !layer || !ready) return;
      const k = motionEnvironment().desktop ? 1 : mobileScale;
      if (k === 0) return;

      gsap.fromTo(
        layer,
        { y: from * k },
        {
          y: to * k,
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
        }
      );
    },
    [ready],
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      <div className={cn("will-change-transform", innerClassName)}>{children}</div>
    </div>
  );
}

/**
 * Uncovers each `[data-clip]` child with an upward clip-path wipe while its
 * `[data-clip-media]` settles from a slight zoom. Staggered, plays once.
 */
export function ClipReveal({
  children,
  className,
  start = "top 78%",
  stagger = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  start?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useMotionReady();

  useGsap(
    (gsap) => {
      const el = ref.current;
      if (!el || !ready) return;
      const q = gsap.utils.selector(el);
      const panels = q("[data-clip]");
      const media = q("[data-clip-media]");
      const captions = q("[data-clip-caption]");

      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start, once: true } });
      tl.fromTo(
        panels,
        { clipPath: "inset(100% 0% 0% 0%)" },
        { clipPath: "inset(0% 0% 0% 0%)", duration: 1.25, ease: "expo.inOut", stagger, clearProps: "clipPath" },
        0
      )
        .fromTo(media, { scale: 1.22 }, { scale: 1, duration: 1.8, ease: "expo.out", stagger }, 0.15)
        .from(captions, { y: 14, autoAlpha: 0, duration: 0.8, ease: "power3.out", stagger }, 0.6);
    },
    [ready],
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
