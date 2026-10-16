"use client";

import React, { createContext, useContext, useState, type ReactNode } from "react";
import { isFeatureEnabled } from "@/config/features";

interface PreloaderContextType {
  isPreloaderComplete: boolean;
  setPreloaderComplete: (status: boolean) => void;
}

const PreloaderContext = createContext<PreloaderContextType | undefined>(undefined);

export function PreloaderProvider({ children }: { children: ReactNode }) {
  const isPreloaderFeatureEnabled = isFeatureEnabled("preloader");
  // If preloader is disabled, it's instantly complete
  const [isPreloaderComplete, setPreloaderComplete] = useState(!isPreloaderFeatureEnabled);

  return (
    <PreloaderContext.Provider value={{ isPreloaderComplete, setPreloaderComplete }}>
      {children}
    </PreloaderContext.Provider>
  );
}

export function usePreloader() {
  const context = useContext(PreloaderContext);
  if (context === undefined) {
    throw new Error("usePreloader must be used within a PreloaderProvider");
  }
  return context;
}
