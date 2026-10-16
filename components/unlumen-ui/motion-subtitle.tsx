"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export interface MotionSubtitleProps {
  text: string;
  direction?: "top" | "bottom";
  speed?: number;
  stagger?: number;
  className?: string;
}

export function MotionSubtitle({
  text,
  direction = "top",
  speed = 1,
  stagger = 0.018,
  className,
}: MotionSubtitleProps) {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const chars = el.querySelectorAll(".motion-char");
    if (chars.length === 0) return;

    const yOffset = direction === "top" ? -12 : 12;

    gsap.killTweensOf(chars);
    gsap.fromTo(
      chars,
      {
        opacity: 0,
        y: yOffset,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.35 / speed,
        stagger: stagger,
        ease: "power2.out",
      }
    );
  }, [text, direction, speed, stagger]);

  // Split string into characters for staggered reveal
  const characters = text.split("");

  return (
    <p ref={containerRef} className={cn("inline-flex flex-wrap justify-center overflow-hidden font-medium select-none", className)}>
      {characters.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className="motion-char inline-block will-change-[transform,opacity]"
          style={{ whiteSpace: char === " " ? "pre" : "normal" }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </p>
  );
}
