'use client';

/**
 * Smooth Scroll Provider
 *
 * Initializes Lenis for smooth scrolling and coordinates with
 * GSAP ScrollTrigger. Only one Lenis instance is created.
 *
 * Wrap your application with <SmoothScrollProvider> in the root layout.
 */

import { useCallback, useEffect, createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Lenis from '@studio-freight/lenis';
import { gsap, ScrollTrigger, registerGsapPlugins, prefersReducedMotion } from '../core';

interface SmoothScrollContextValue {
  /**
   * The live Lenis instance, or null when smooth scrolling is off. Read it at
   * the moment of use (e.g. in a click handler): the instance is an external
   * object, so nothing needs to re-render when it is created or destroyed.
   */
  getLenis: () => Lenis | null;
}

const SmoothScrollContext = createContext<SmoothScrollContextValue>({
  getLenis: () => null,
});

export function useSmoothScroll(): SmoothScrollContextValue {
  return useContext(SmoothScrollContext);
}

interface SmoothScrollProviderProps {
  children: ReactNode;
  enabled?: boolean;
}

export function SmoothScrollProvider({
  children,
  enabled = true,
}: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    registerGsapPlugins();

    // Disable smooth scrolling on workspace and student routes for native, instant responsiveness and table scrolling
    const isAppRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/student');
    if (!enabled || isAppRoute || prefersReducedMotion()) return;

    const lenisInstance = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenisInstance;

    // Coordinate Lenis with GSAP ScrollTrigger
    lenisInstance.on('scroll', ScrollTrigger.update);

    // Keep a stable reference so the same callback is removed on cleanup.
    const tick = (time: number) => {
      lenisInstance.raf(time * 1000);
    };
    gsap.ticker.add(tick);

    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenisInstance.off('scroll', ScrollTrigger.update);
      lenisInstance.destroy();
      if (lenisRef.current === lenisInstance) lenisRef.current = null;
    };
  }, [enabled, pathname]);

  const getLenis = useCallback(() => lenisRef.current, []);
  const value = useMemo(() => ({ getLenis }), [getLenis]);

  return (
    <SmoothScrollContext value={value}>
      {children}
    </SmoothScrollContext>
  );
}
