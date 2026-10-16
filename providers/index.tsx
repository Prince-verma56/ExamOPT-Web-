/**
 * Providers Wrapper
 *
 * Client-side providers that wrap the entire application.
 * Add providers here instead of cluttering the root layout.
 */

'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from './auth-provider';
import { PreloaderProvider } from '@/components/preloader/preloader-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Add providers here as needed:
  // - SmoothScrollProvider (when animations are enabled)
  // - ThemeProvider
  // - AuthProvider
  // - QueryClientProvider
  return (
    <PreloaderProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </PreloaderProvider>
  );
}
