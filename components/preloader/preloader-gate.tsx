"use client";

import { usePreloader } from "./preloader-provider";
import type { ReactNode } from "react";

export function PreloaderGate({ children }: { children: ReactNode }) {
  const { isPreloaderComplete } = usePreloader();

  if (!isPreloaderComplete) {
    return <div className="opacity-0 pointer-events-none" aria-hidden="true">{children}</div>;
  }

  return <>{children}</>;
}
