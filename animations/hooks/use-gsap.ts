'use client';

/**
 * useGsap - hook for GSAP animations with automatic cleanup.
 *
 * Usage:
 *   useGsap((gsap, ctx) => {
 *     gsap.to('.element', { opacity: 1, duration: 0.6 });
 *   }, [deps]);
 */

import { useEffect, useRef } from 'react';
import { gsap, registerGsapPlugins, prefersReducedMotion } from '../core';

type GsapCallback = (
  gsapInstance: typeof gsap,
  context: gsap.Context
) => void | (() => void);

export function useGsap(
  callback: GsapCallback,
  deps: React.DependencyList = [],
  options: { scope?: React.RefObject<HTMLElement | null>; skipReducedMotion?: boolean } = {}
): void {
  const { scope, skipReducedMotion = false } = options;

  useEffect(() => {
    registerGsapPlugins();

    if (!skipReducedMotion && prefersReducedMotion()) return;

    // gsap.context runs this function synchronously during construction, so the
    // context must come from its argument rather than the not-yet-assigned `ctx`.
    // Returning the callback's result lets a callback register its own cleanup
    // (event listeners, attributes) which the context runs on revert.
    const ctx = gsap.context((self: gsap.Context) => {
      return callback(gsap, self);
    }, scope?.current ?? undefined);

    return () => {
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * useScrollTrigger - convenience hook for ScrollTrigger-based animations.
 * Returns a ref to attach to the trigger element.
 */
export function useScrollTrigger<T extends HTMLElement = HTMLDivElement>(
  callback: GsapCallback,
  deps: React.DependencyList = []
) {
  const ref = useRef<T>(null);

  useGsap(callback, deps, { scope: ref });

  return ref;
}
