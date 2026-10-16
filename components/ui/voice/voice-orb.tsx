"use client";

import React, { useEffect, useRef } from 'react';
import { VoiceSessionState } from '@/ai/voice/interface';
import { cn } from '@/lib/utils';
import gsap from 'gsap';

interface VoiceOrbProps {
  state: VoiceSessionState;
  className?: string;
}

export function VoiceOrb({ state, className }: VoiceOrbProps) {
  const orbRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbRef.current || !ringRef.current) return;

    gsap.killTweensOf([orbRef.current, ringRef.current]);

    if (state === 'speaking') {
      gsap.to(orbRef.current, { scale: 1.2, duration: 0.3, ease: "back.out(1.5)" });
      gsap.to(ringRef.current, {
        scale: 1.5,
        opacity: 0,
        duration: 1,
        repeat: -1,
        ease: "power1.out"
      });
    } else if (state === 'listening') {
      gsap.to(orbRef.current, { scale: 1.1, duration: 0.3, ease: "power2.out" });
      gsap.to(ringRef.current, {
        scale: 1.3,
        opacity: 0.3,
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    } else if (state === 'processing') {
      gsap.to(orbRef.current, { scale: 0.9, duration: 0.5, repeat: -1, yoyo: true, ease: "power1.inOut" });
      gsap.set(ringRef.current, { opacity: 0 });
    } else {
      gsap.to(orbRef.current, { scale: 1, duration: 0.4, ease: "power2.out" });
      gsap.set(ringRef.current, { opacity: 0 });
    }
  }, [state]);

  const getColor = () => {
    if (state === 'error') return 'bg-destructive';
    if (state === 'listening') return 'bg-blue-500';
    if (state === 'speaking') return 'bg-primary';
    if (state === 'processing') return 'bg-amber-500';
    return 'bg-muted-foreground';
  };

  return (
    <div className={cn("relative flex items-center justify-center w-16 h-16", className)}>
      <div 
        ref={ringRef}
        className={cn("absolute inset-0 rounded-full opacity-0", getColor())}
      />
      <div 
        ref={orbRef}
        className={cn("relative z-10 w-8 h-8 rounded-full shadow-md", getColor())}
      />
    </div>
  );
}
