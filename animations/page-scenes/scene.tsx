'use client';

/**
 * <Scene> — client boundary that runs one named choreography (see scenes.ts)
 * over its server-rendered children. Uses the shared useGsap hook, so motion
 * is skipped under prefers-reduced-motion and fully reverted on unmount, and
 * waits for the optional preloader before starting.
 */

import { useRef } from 'react';
import { useGsap } from '../hooks/use-gsap';
import { useMotionReady } from '../hooks/use-motion-ready';
import { motionEnvironment } from '../core';
import { scenes, type SceneName } from './scenes';

type SceneProps = {
  name: SceneName;
  as?: 'section' | 'div';
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>;

export function Scene({ name, as: Tag = 'section', children, ...rest }: SceneProps) {
  const ref = useRef<HTMLElement>(null);
  const ready = useMotionReady();

  useGsap(
    () => {
      if (!ref.current || !ready) return;
      return scenes[name](ref.current, motionEnvironment());
    },
    [ready, name],
    { scope: ref }
  );

  return (
    <Tag ref={ref as React.Ref<never>} {...rest}>
      {children}
    </Tag>
  );
}
