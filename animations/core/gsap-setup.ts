'use client';

/**
 * GSAP Core Registration
 *
 * Centralizes GSAP and plugin registration.
 * Import this module once (in a provider) to register all plugins.
 * Do not register GSAP plugins in individual components.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function registerGsapPlugins(): void {
  if (registered) return;
  if (typeof window === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/**
 * Global motion settings.
 * Check reduced-motion preference before animating.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Default animation duration and easing.
 */
export const motionDefaults = {
  duration: 0.8,
  ease: 'power2.out',
  staggerAmount: 0.1,
} as const;

export { gsap, ScrollTrigger };
