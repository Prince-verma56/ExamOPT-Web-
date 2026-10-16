"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { usePreloader } from "./preloader-provider";
import { isFeatureEnabled } from "@/config/features";

export function Preloader() {
  const { isPreloaderComplete, setPreloaderComplete } = usePreloader();
  const preloaderRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isFeatureEnabled("preloader") || isPreloaderComplete) return;

    const tl = gsap.timeline({
      onComplete: () => {
        setPreloaderComplete(true);
      }
    });

    // Simulate loading progress
    const duration = 1.5; 
    
    gsap.to({ value: 0 }, {
      value: 100,
      duration: duration,
      ease: "power2.inOut",
      onUpdate: function() {
        setProgress(Math.round(this.targets()[0].value));
      }
    });

    tl.to(textRef.current, {
      opacity: 1,
      duration: 0.4,
      ease: "power2.out"
    })
    .to(textRef.current, {
      y: -20,
      opacity: 0,
      duration: 0.4,
      delay: duration - 0.4,
      ease: "power2.in"
    })
    .to(preloaderRef.current, {
      yPercent: -100,
      duration: 0.8,
      ease: "power4.inOut"
    });

  }, [isPreloaderComplete, setPreloaderComplete]);

  if (isPreloaderComplete || !isFeatureEnabled("preloader")) return null;

  return (
    <div 
      ref={preloaderRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background"
    >
      <div 
        ref={textRef}
        className="opacity-0 flex flex-col items-center"
      >
        <span className="text-4xl font-light tracking-tighter tabular-nums text-foreground">
          {progress}%
        </span>
        <div className="mt-4 h-[1px] w-48 bg-muted overflow-hidden">
          <div 
            className="h-full bg-foreground transition-all duration-150 ease-linear" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
