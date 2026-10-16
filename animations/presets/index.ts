'use client';

/**
 * Animation Presets
 *
 * Reusable GSAP animation configurations.
 * These are pure data objects — no business logic.
 */

import type { gsap } from 'gsap';

type TweenVars = gsap.TweenVars;

export const presets = {
  fade: {
    from: { opacity: 0 } satisfies TweenVars,
    to: { opacity: 1, duration: 0.8, ease: 'power2.out' } satisfies TweenVars,
  },

  fadeUp: {
    from: { opacity: 0, y: 40 } satisfies TweenVars,
    to: { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' } satisfies TweenVars,
  },

  fadeDown: {
    from: { opacity: 0, y: -40 } satisfies TweenVars,
    to: { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' } satisfies TweenVars,
  },

  fadeLeft: {
    from: { opacity: 0, x: -40 } satisfies TweenVars,
    to: { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' } satisfies TweenVars,
  },

  fadeRight: {
    from: { opacity: 0, x: 40 } satisfies TweenVars,
    to: { opacity: 1, x: 0, duration: 0.8, ease: 'power2.out' } satisfies TweenVars,
  },

  scaleUp: {
    from: { opacity: 0, scale: 0.85 } satisfies TweenVars,
    to: { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' } satisfies TweenVars,
  },

  slideUp: {
    from: { y: '100%' } satisfies TweenVars,
    to: { y: '0%', duration: 0.8, ease: 'power3.out' } satisfies TweenVars,
  },

  stagger: {
    from: { opacity: 0, y: 30 } satisfies TweenVars,
    to: {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power2.out',
      stagger: 0.1,
    } satisfies TweenVars,
  },

  textReveal: {
    from: { y: '110%', opacity: 0 } satisfies TweenVars,
    to: { y: '0%', opacity: 1, duration: 0.8, ease: 'power3.out' } satisfies TweenVars,
  },

  parallax: {
    from: { y: '-20%' } satisfies TweenVars,
    to: { y: '20%', ease: 'none' } satisfies TweenVars,
  },
} as const;

export type PresetName = keyof typeof presets;
