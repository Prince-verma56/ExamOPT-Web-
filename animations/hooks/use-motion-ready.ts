'use client';

import { usePreloader } from '@/components/preloader/preloader-provider';

/**
 * True once page animations may start. When the (opt-in) preloader is enabled
 * this waits for it to finish, so the hero entrance plays after the preloader
 * rather than behind it. Pass it in a useGsap dependency list and return early
 * while it is false.
 */
export function useMotionReady(): boolean {
  return usePreloader().isPreloaderComplete;
}
