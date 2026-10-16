import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "@/providers";
import { SmoothScrollProvider } from "@/animations/smooth-scroll/provider";
import { Preloader, PreloaderGate } from "@/components/preloader";

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

export const metadata: Metadata = {
  title: {
    default: "ExamOpt Studio",
    template: "%s | ExamOpt Studio",
  },
  description:
    "Intelligent Examination Timetable Optimization System. Schedule exams with precision — manage constraints, resolve conflicts, and publish timetables from one workspace.",
  keywords: ["exam scheduling", "timetable optimization", "examination management", "university exams"],
};


/**
 * Runs during HTML parsing, before first paint: flags that JavaScript is
 * available and motion is allowed, so entrance animations can hide their
 * targets without a flash. Reduced-motion visitors never get the flag and
 * always see content immediately (see `[data-enter]` in globals.css).
 * Rendered as text/plain on the client so React does not warn about it.
 */
const MOTION_GATE = `try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion-ok')}catch(e){}`;

function MotionGateScript() {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: MOTION_GATE }}
    />
  );
}

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
      <head>
        <MotionGateScript />
      </head>
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
