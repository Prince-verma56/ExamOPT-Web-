import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers";
import { SmoothScrollProvider } from "@/animations/smooth-scroll/provider";

// Functional typeface: navigation, body copy, controls, data and the app UI.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

// Editorial display typeface: marketing headlines and short emphasis only.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Preloader, PreloaderGate } from "@/components/preloader";

export const metadata: Metadata = {
  title: {
    default: "ExamOpt Studio",
    template: "%s | ExamOpt Studio",
  },
  description:
    "Intelligent Examination Timetable Optimization System. Schedule exams with precision — manage constraints, resolve conflicts, and publish timetables from one workspace.",
  keywords: ["exam scheduling", "timetable optimization", "examination management", "university exams"],
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <SmoothScrollProvider>
            <TooltipProvider>
              <Preloader />
              <PreloaderGate>
                {children}
              </PreloaderGate>
            </TooltipProvider>
            <Toaster />
          </SmoothScrollProvider>
        </Providers>
      </body>
    </html>
  );
}
