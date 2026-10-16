'use client';

/**
 * Homepage scene choreographies.
 *
 * Each scene animates server-rendered markup inside one root element, found
 * through `data-*` hooks, so section content stays in Server Components and
 * only the motion runs on the client. Scenes run inside a gsap.context (see
 * <Scene>), so every tween, ScrollTrigger and SplitText they create is
 * reverted on unmount. A returned function is called on revert as well.
 */

import { gsap, motionEnvironment } from '../core';

type Env = ReturnType<typeof motionEnvironment>;
export type SceneSetup = (root: HTMLElement, env: Env) => void | (() => void);

/** Marks gated elements as handed over to GSAP (see `[data-enter]` in globals.css). */
function takeOver(elements: Element[]) {
  elements.forEach((el) => el.setAttribute('data-entered', ''));
  return () => elements.forEach((el) => el.removeAttribute('data-entered'));
}

/* ------------------------------------------------------------------ */
/* Hero: staged entrance, scroll depth, gentle pointer tilt            */
/* ------------------------------------------------------------------ */

const hero: SceneSetup = (root, env) => {
  const q = gsap.utils.selector(root);
  const nav = document.querySelector('[data-nav-shell]');
  const gated = [...q('[data-enter]'), ...(nav ? [nav] : [])];

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Atmosphere and photography
  tl.from(q('[data-hero-glow]'), { autoAlpha: 0, duration: 1.6, ease: 'power2.out' }, 0)
    .fromTo(
      q('[data-hero-photo]'),
      { clipPath: 'inset(0% 0% 0% 100%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', clearProps: 'clipPath' },
      0
    )
    .fromTo(q('[data-hero-photo-img]'), { scale: 1.24 }, { scale: 1, duration: 2.2, ease: 'expo.out' }, 0.1);

  // 2–5. Navigation, eyebrow, masked headline lines, supporting copy, actions
  if (nav) tl.from(nav, { y: -14, autoAlpha: 0, duration: 0.8 }, 0.1);
  tl.from(q('[data-hero-eyebrow]'), { y: 12, autoAlpha: 0, duration: 0.7 }, 0.2)
    .from(q('[data-hero-line]'), { yPercent: 112, duration: 1.15, ease: 'power4.out', stagger: 0.09 }, 0.26)
    .from(q('[data-hero-lede]'), { y: 18, autoAlpha: 0, duration: 0.85 }, 0.62)
    .from(q('[data-hero-cta] > *'), { y: 14, autoAlpha: 0, duration: 0.75, stagger: 0.07 }, 0.72);

  // 6–7. Product preview unmasks, then its contents settle into place
  tl.fromTo(
    q('[data-hero-dash]'),
    { clipPath: 'inset(8% 6% 12% 6% round 18px)', y: 64, rotationX: 10, autoAlpha: 0, transformPerspective: 1600 },
    {
      clipPath: 'inset(0% 0% 0% 0% round 18px)',
      y: 0,
      rotationX: 0,
      autoAlpha: 1,
      duration: 1.45,
      ease: 'expo.out',
      clearProps: 'clipPath',
    },
    0.62
  )
    .from(q('[data-exam-block]'), { autoAlpha: 0, y: 6, duration: 0.5, stagger: { amount: 0.55 } }, 1.0)
    .from(q('[data-dash-rail] li, [data-dash-rail] [data-dash-meter]'), { autoAlpha: 0, x: 8, duration: 0.5, stagger: 0.04 }, 1.15);

  // 8. Supporting callouts and sample-data facts
  tl.from(q('[data-hero-chip]'), { autoAlpha: 0, y: 18, scale: 0.96, duration: 0.9, stagger: 0.14 }, 1.3)
    .from(q('[data-hero-facts] > *'), { autoAlpha: 0, y: 10, duration: 0.6, stagger: 0.06 }, 1.2);

  const release = takeOver(gated);

  // Scroll depth: foreground layers travel further than the photograph.
  const k = env.desktop ? 1 : 0.4;
  const scroll = { trigger: root, start: 'top top', end: 'bottom top', scrub: 0.5 } as const;
  gsap.to(q('[data-depth="photo"]'), { yPercent: 9 * k, ease: 'none', scrollTrigger: scroll });
  gsap.to(q('[data-depth="dash"]'), { y: -70 * k, ease: 'none', scrollTrigger: scroll });
  gsap.to(q('[data-depth="chips"]'), { y: -130 * k, ease: 'none', scrollTrigger: scroll });
  gsap.to(q('[data-depth="copy"]'), { y: 50 * k, autoAlpha: 0.35, ease: 'none', scrollTrigger: scroll });

  // Pointer: a few degrees of tilt on the preview, opposite drift on callouts.
  if (!env.desktop || !env.finePointer) return release;
  const tilt = q('[data-tilt]')[0];
  const drift = q('[data-drift]')[0];
  if (!tilt || !drift) return release;
  gsap.set(tilt, { transformPerspective: 1600 });
  const rx = gsap.quickTo(tilt, 'rotationX', { duration: 1, ease: 'power3' });
  const ry = gsap.quickTo(tilt, 'rotationY', { duration: 1, ease: 'power3' });
  const dx = gsap.quickTo(drift, 'x', { duration: 1.2, ease: 'power3' });
  const dy = gsap.quickTo(drift, 'y', { duration: 1.2, ease: 'power3' });

  const onMove = (e: PointerEvent) => {
    const r = root.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    rx(py * -3);
    ry(px * 4);
    dx(px * -12);
    dy(py * -10);
  };
  const onLeave = () => {
    rx(0);
    ry(0);
    dx(0);
    dy(0);
  };
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerleave', onLeave);

  return () => {
    release();
    root.removeEventListener('pointermove', onMove);
    root.removeEventListener('pointerleave', onLeave);
  };
};

/* ------------------------------------------------------------------ */
/* Process: a rail that draws with scroll and activates each stage     */
/* ------------------------------------------------------------------ */

const process: SceneSetup = (root, env) => {
  const q = gsap.utils.selector(root);
  const area = q('[data-rail]')[0];

  gsap.from(q('[data-step]'), {
    y: 32,
    autoAlpha: 0,
    duration: 0.95,
    ease: 'power3.out',
    stagger: 0.14,
    scrollTrigger: { trigger: area ?? root, start: 'top 80%', once: true },
  });

  if (!area) return;

  // Desktop draws a horizontal rail across the three stages; small screens
  // draw a vertical one beside the stacked stages. Only the visible axis runs.
  const axis = env.desktop ? 'x' : 'y';
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: area,
      start: 'top 80%',
      end: env.desktop ? 'top 28%' : 'bottom 70%',
      scrub: 0.6,
    },
  });
  tl.fromTo(q(`[data-rail-fill="${axis}"]`), axis === 'x' ? { scaleX: 0 } : { scaleY: 0 }, { scaleX: 1, scaleY: 1, duration: 3 }, 0);

  // Each stage lights up as the line reaches it.
  q(`[data-rail-node="${axis}"]`).forEach((node, i) => {
    const at = i === 0 ? 0 : i * 1.5 - 0.35;
    tl.fromTo(node.querySelector('[data-node-fill]'), { scale: 0 }, { scale: 1, duration: 0.35 }, at).fromTo(
      node.querySelector('[data-node-label]'),
      { color: '#2855c7' },
      { color: '#ffffff', duration: 0.35 },
      at
    );
  });

  if (axis === 'x') {
    tl.fromTo(q('[data-rail-packet]'), { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 1.5 }, 0.45);
  }
};

/* ------------------------------------------------------------------ */
/* Transparency: graph builds, validation rows land, meter fills       */
/* ------------------------------------------------------------------ */

const transparency: SceneSetup = (root, env) => {
  const q = gsap.utils.selector(root);
  const panel = q('[data-graph-panel]')[0];
  if (!panel) return;

  const tl = gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: panel, start: 'top 72%', once: true },
  });
  tl.from(panel, { y: 40, autoAlpha: 0, duration: 1.1 }, 0)
    .from(q('[data-graph-node]'), { autoAlpha: 0, scale: 0.86, transformOrigin: '50% 50%', duration: 0.6, stagger: 0.08, ease: 'back.out(1.7)' }, 0.35)
    .fromTo(q('[data-graph-edge="draw"]'), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.9, stagger: 0.1, ease: 'power2.inOut' }, 0.55)
    .from(q('[data-graph-edge="fade"]'), { autoAlpha: 0, duration: 0.8 }, 0.9)
    .from(q('[data-graph-marker]'), { autoAlpha: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2.2)' }, 1.15)
    .from(q('[data-val-row]'), { autoAlpha: 0, x: 14, duration: 0.6, stagger: 0.08 }, 0.5)
    .fromTo(q('[data-val-meter]'), { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 1.2 }, 0.85)
    .from(q('[data-val-note]'), { autoAlpha: 0, y: 12, duration: 0.8 }, 1.15)
    .from(q('[data-float-chip]'), { autoAlpha: 0, y: 20, duration: 0.9 }, 1.3);

  const k = env.desktop ? 1 : 0.35;
  gsap.fromTo(
    q('[data-depth="float"]'),
    { y: 50 * k },
    { y: -50 * k, ease: 'none', scrollTrigger: { trigger: panel, start: 'top bottom', end: 'bottom top', scrub: 0.6 } }
  );
};

/* ------------------------------------------------------------------ */
/* Closing: architecture settles in as the visitor arrives             */
/* ------------------------------------------------------------------ */

const closing: SceneSetup = (root, env) => {
  const q = gsap.utils.selector(root);
  gsap.fromTo(
    q('[data-cta-photo]'),
    // Starts lower and slightly enlarged (the sky above is masked), so the
    // forecourt edge never lifts away from the footer.
    { yPercent: env.desktop ? 9 : 4, scale: 1.1 },
    {
      yPercent: 0,
      scale: 1,
      ease: 'none',
      scrollTrigger: { trigger: root, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
    }
  );
  gsap.from(q('[data-cta-copy] > *'), {
    y: 22,
    autoAlpha: 0,
    duration: 0.9,
    ease: 'power3.out',
    stagger: 0.09,
    scrollTrigger: { trigger: root, start: 'top 70%', once: true },
  });
};

export const scenes = { hero, process, transparency, closing } satisfies Record<string, SceneSetup>;
export type SceneName = keyof typeof scenes;
