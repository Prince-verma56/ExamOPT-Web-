/**
 * ExamOpt Studio — Marketing Navigation
 * Slim responsive bar: wordmark, section anchors, and Clerk-aware actions.
 * Signed out → Sign In + Get Started. Signed in → Open Workspace + account.
 * Without a Clerk key configured, a single workspace entry point is shown.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { HAS_CLERK } from "@/components/auth/safe-auth-button";
import { useScroll } from "@/animations/hooks/use-scroll";
import { useSmoothScroll } from "@/animations/smooth-scroll";
import { BrandMark } from "@/components/marketing/primitives";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { name: "Product", href: "#product" },
  { name: "How It Works", href: "#how-it-works" },
  { name: "Capabilities", href: "#capabilities" },
  { name: "Student Portal", href: "/student" },
];

const primaryCta =
  "h-9 rounded-[9px] px-3.5 text-[13.5px] font-medium shadow-[0_6px_16px_-8px_rgba(40,85,199,0.7)] hover:bg-primary/90";

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
      <BrandMark />
      <span className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-foreground">
        ExamOpt <span className="font-normal text-muted-foreground">Studio</span>
      </span>
    </Link>
  );
}

function AuthActions({ stacked = false, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
  const ghost = cn(
    buttonVariants({ variant: "ghost" }),
    "h-9 rounded-[9px] px-3 text-[13.5px] font-medium text-foreground/80",
    stacked && "w-full justify-center border border-border"
  );
  const primary = cn(buttonVariants(), primaryCta, "group", stacked && "w-full justify-center");
  const arrow = <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />;

  if (!HAS_CLERK) {
    return (
      <Link href="/admin" className={primary} onClick={onNavigate}>
        Open Workspace {arrow}
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <Link href="/sign-in" className={ghost} onClick={onNavigate}>
          Sign In
        </Link>
        <Link href="/sign-up" className={primary} onClick={onNavigate}>
          Get Started {arrow}
        </Link>
      </Show>
      <Show when="signed-in">
        <Link href="/admin" className={primary} onClick={onNavigate}>
          Open Workspace {arrow}
        </Link>
        {!stacked && <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />}
      </Show>
    </>
  );
}

export function ExamOptNav() {
  const scrolled = useScroll(12);
  const { lenis } = useSmoothScroll();
  const [open, setOpen] = useState(false);

  /**
   * In-page anchors glide through Lenis when it is active, or fall back to a
   * native jump (sections carry scroll-margin for the fixed bar). When the
   * mobile sheet is open, wait for it to release its scroll lock first.
   */
  const handleAnchor = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const wasOpen = open;
    setOpen(false);
    if (!href.startsWith("#")) return;
    event.preventDefault();
    window.setTimeout(() => {
      if (lenis) lenis.scrollTo(href, { offset: -72 });
      else document.querySelector(href)?.scrollIntoView();
      history.replaceState(null, "", href);
    }, wasOpen ? 260 : 0);
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-[#e6e2d8] bg-canvas/85 shadow-[0_1px_0_rgba(23,32,51,0.02)] backdrop-blur-md"
          : "border-transparent bg-transparent"
      )}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 w-full max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-8 lg:px-10">
        <Wordmark />

        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                onClick={(e) => handleAnchor(e, item.href)}
                className="whitespace-nowrap rounded-md px-3 py-2 text-[13.5px] font-medium text-foreground/70 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <AuthActions />
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9 lg:hidden")}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="right" className="w-[min(320px,86vw)] bg-canvas p-0">
            <SheetHeader className="border-b border-[#e6e2d8] px-5 py-4">
              <SheetTitle className="text-left">
                <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <BrandMark className="size-6" /> ExamOpt Studio
                </span>
              </SheetTitle>
            </SheetHeader>
            <ul className="flex flex-col px-3 py-3">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={(e) => handleAnchor(e, item.href)}
                    className="block rounded-lg px-3 py-3 text-[15px] font-medium text-foreground/85 outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-ring/50"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-col gap-2 border-t border-[#e6e2d8] p-5">
              <AuthActions stacked onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
