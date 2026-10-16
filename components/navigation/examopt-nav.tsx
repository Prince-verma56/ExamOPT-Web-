/**
 * ExamOpt Studio — Marketing Navigation (Floating Glass Pill)
 * Aligned with the reference design:
 * Brand with grid mark, navigation links, search, Sign In, Open Workspace CTA,
 * and user profile avatar. Staggered entrance animation synced with hero video.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight, ChevronDown, Menu, Search, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { HAS_CLERK } from "@/components/auth/safe-auth-button";
import { useScroll } from "@/animations/hooks/use-scroll";
import { useSmoothScroll } from "@/animations/smooth-scroll";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { name: "Product", href: "#product", hasDropdown: true },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Capabilities", href: "#capabilities" },
  { name: "Student Portal", href: "/student" },
  { name: "Resources", href: "#transparency" },
];

export function ExamOptNav() {
  const scrolled = useScroll(16);
  const { lenis } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const handleReveal = () => setIsRevealed(true);
    window.addEventListener("hero-animation-start", handleReveal);

    // Safety fallback: reveal after 3.8s in case video is cached or autoplay blocked
    const timer = setTimeout(() => setIsRevealed(true), 3800);
    return () => {
      window.removeEventListener("hero-animation-start", handleReveal);
      clearTimeout(timer);
    };
  }, []);

  const handleAnchor = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const wasOpen = open;
    setOpen(false);
    if (!href.startsWith("#")) return;
    event.preventDefault();
    window.setTimeout(() => {
      if (lenis) lenis.scrollTo(href, { offset: -80 });
      else document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", href);
    }, wasOpen ? 260 : 0);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 flex justify-center px-4 sm:px-8 pointer-events-none">
      <nav
        aria-label="Main"
        className={cn(
          "pointer-events-auto w-full max-w-[1240px] h-16 sm:h-18 flex items-center justify-between transition-all duration-500 transform-gpu",
          isRevealed ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
        )}
      >
        {/* Left: Brand Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 outline-none group shrink-0">
          <div className="size-8 sm:size-9 rounded-xl bg-[#1a62ff] flex items-center justify-center text-white shadow-sm shadow-blue-500/30 group-hover:bg-blue-600 group-hover:scale-105 transition-all">
            {/* 9-dot grid icon */}
            <svg className="size-4.5" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="5" r="2.2" />
              <circle cx="12" cy="5" r="2.2" />
              <circle cx="19" cy="5" r="2.2" />
              <circle cx="5" cy="12" r="2.2" />
              <circle cx="12" cy="12" r="2.2" />
              <circle cx="19" cy="12" r="2.2" />
              <circle cx="5" cy="19" r="2.2" />
              <circle cx="12" cy="19" r="2.2" />
              <circle cx="19" cy="19" r="2.2" />
            </svg>
          </div>
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
            ExamOpt <span className="font-semibold text-slate-700 dark:text-zinc-300">Studio</span>
          </span>
        </Link>

        {/* Center: Desktop Navigation Links */}
        <ul className="hidden lg:flex items-center gap-1.5">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={(e) => handleAnchor(e, item.href)}
                className="flex items-center gap-1 px-3 py-1.5 text-[13px] font-semibold text-slate-800 hover:text-[#1a62ff] transition-colors"
              >
                {item.name}
                {item.hasDropdown && <ChevronDown className="size-3 text-slate-500" />}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right: Actions (Search, Sign In, Open Workspace CTA, Avatar) */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Search Button */}
          <button
            type="button"
            aria-label="Search"
            className="hidden sm:flex size-8 text-slate-700 items-center justify-center transition-colors hover:text-[#1a62ff]"
          >
            <Search className="size-4" />
          </button>

          {/* Authentication Actions */}
          <div className="hidden sm:flex items-center gap-2">
            {HAS_CLERK ? (
              <>
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-zinc-200 hover:text-slate-950 px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors"
                  >
                    Sign In
                  </Link>
                </Show>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-zinc-200 hover:text-slate-950 px-3 py-1.5 rounded-full hover:bg-white/40 transition-colors"
              >
                Sign In
              </Link>
            )}

            {/* Open Workspace Button */}
            <Link
              href="/admin"
              className="h-9 sm:h-9.5 px-4 sm:px-5 rounded-full bg-[#1a62ff] hover:bg-[#0f52e4] text-white text-xs sm:text-[13px] font-semibold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(26,98,255,0.35)] transition-all hover:shadow-[0_6px_22px_rgba(26,98,255,0.45)] hover:scale-[1.02] active:scale-[0.98]"
            >
              Open Workspace
              <ArrowRight className="size-3.5" />
            </Link>

            {/* Profile Avatar */}
            {HAS_CLERK ? (
              <Show when="signed-in">
                <UserButton appearance={{ elements: { avatarBox: "size-8 sm:size-9 ring-2 ring-white/90 shadow-sm" } }} />
              </Show>
            ) : (
              <div className="size-8 sm:size-9 rounded-full bg-white/60 dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 ring-2 ring-white/90 dark:ring-zinc-800 border border-white/60 shadow-sm">
                <UserIcon className="size-4" />
              </div>
            )}
          </div>

          {/* Mobile Sheet Trigger */}
          <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                className="size-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-200"
                aria-label="Open navigation menu"
              >
                <Menu className="size-4.5" />
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] p-0 flex flex-col justify-between">
                <SheetHeader className="border-b border-border/40 p-5">
                  <SheetTitle className="text-left flex items-center gap-2">
                    <div className="size-7 rounded-lg bg-[#1a62ff] flex items-center justify-center text-white">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="5" r="2.2" />
                        <circle cx="12" cy="5" r="2.2" />
                        <circle cx="19" cy="5" r="2.2" />
                        <circle cx="5" cy="12" r="2.2" />
                        <circle cx="12" cy="12" r="2.2" />
                        <circle cx="19" cy="12" r="2.2" />
                        <circle cx="5" cy="19" r="2.2" />
                        <circle cx="12" cy="19" r="2.2" />
                        <circle cx="19" cy="19" r="2.2" />
                      </svg>
                    </div>
                    ExamOpt Studio
                  </SheetTitle>
                </SheetHeader>
                <ul className="flex flex-col p-4 gap-1">
                  {navItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={(e) => handleAnchor(e, item.href)}
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="p-5 border-t border-border/40 flex flex-col gap-2.5">
                  <Link
                    href="/sign-in"
                    onClick={() => setOpen(false)}
                    className="w-full text-center py-2 text-sm font-medium text-slate-700 dark:text-zinc-300 hover:text-slate-900"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="w-full py-2.5 rounded-full bg-[#1a62ff] text-white text-center text-sm font-medium shadow-md flex items-center justify-center gap-1.5"
                  >
                    Open Workspace <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
