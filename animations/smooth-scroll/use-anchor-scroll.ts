'use client';

import { useCallback } from 'react';
import { useSmoothScroll } from './provider';

/** Height of the fixed marketing header, kept clear when jumping to a section. */
const HEADER_OFFSET = -72;

/**
 * Click handler for in-page links (`#section`). Routes the jump through the
 * shared Lenis instance so smooth scrolling and ScrollTrigger stay in sync,
 * falls back to native scrolling without Lenis, and keeps the URL hash.
 * Links to other routes are left to the browser / Next.js router.
 */
export function useAnchorScroll() {
  const { getLenis } = useSmoothScroll();

  return useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, href: string, delay = 0) => {
      const hash = href.startsWith('/#') ? href.slice(1) : href;
      if (!hash.startsWith('#') || window.location.pathname !== '/') return;
      const target = hash === '#top' ? 0 : document.querySelector<HTMLElement>(hash);
      if (target === null) return;

      event.preventDefault();
      window.setTimeout(() => {
        const lenis = getLenis();
        if (lenis) {
          lenis.scrollTo(target, { offset: HEADER_OFFSET });
        } else if (target === 0) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        history.replaceState(null, '', hash === '#top' ? window.location.pathname : hash);
      }, delay);
    },
    [getLenis]
  );
}
