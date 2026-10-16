/**
 * ExamOpt Studio — Marketing navigation
 *
 * Sits on the page content grid. Transparent over the hero, then a light
 * glass surface once the page scrolls. In-page links scroll through Lenis
 * and show which section is in view. Its entrance is played by the hero
 * scene (`data-nav-shell`); without JavaScript it is simply visible.
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Show, UserButton } from "@clerk/nextjs";
import { ArrowRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { HAS_CLERK } from "@/components/auth/safe-auth-button";
import { useScroll } from "@/animations/hooks/use-scroll";
import { AnchorLink } from "@/components/marketing/anchor-link";
import { BrandLockup, Container, ctaStyles } from "@/components/marketing/primitives";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

type NavItem = { name: string; href: `#${string}` } | { name: string; href: `/${string}` };

const navItems: NavItem[] = [
  { name: "Product", href: "#product" },
  { name: "How it works", href: "#how-it-works" },
  { name: "Capabilities", href: "#capabilities" },
  { name: "Transparency", href: "#transparency" },
  { name: "Student portal", href: "/student" },
];

/** Sections observed for the active indicator; the rest reset it. */
const OBSERVED = ["top", "problem", "how-it-works", "capabilities", "product", "transparency"];

function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = OBSERVED.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(`#${entry.target.id}`);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return active;
}

const linkBase =
  "relative inline-flex items-center rounded-full px-3.5 py-2 type-nav text-foreground/65 outline-none transition-colors duration-300 hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=true]:text-foreground after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity aria-[current=true]:after:opacity-100";

function NavLink({ item, className, onNavigate, delay, active }: { item: NavItem; className?: string; onNavigate?: () => void; delay?: number; active?: boolean }) {
  if (item.href.startsWith("#")) {
    return (
      <AnchorLink
        href={item.href as `#${string}`}
        className={className}
        onNavigate={onNavigate}
        delay={delay}
        aria-current={active ? "true" : undefined}
      >
        {item.name}
      </AnchorLink>
    );
  }
  return (
    <Link href={item.href} className={className} onClick={onNavigate}>
      {item.name}
    </Link>
  );
}

function SignInLink({ className, onClick }: { className: string; onClick?: () => void }) {
  const link = (
    <Link href="/sign-in" className={className} onClick={onClick}>
      Sign in
    </Link>
  );
  return HAS_CLERK ? <Show when="signed-out">{link}</Show> : link;
}

export function ExamOptNav() {
  const scrolled = useScroll(16);
  const active = useActiveSection();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const close = () => setOpen(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 60) {
        setVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down -> hide navbar smoothly
        setVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up -> show navbar smoothly
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <header
      data-nav-shell
      data-enter
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ease-in-out will-change-transform",
        visible ? "translate-y-0" : "-translate-y-full",
        scrolled
          ? "border-hairline/80 bg-white/80 shadow-[0_8px_30px_-24px_rgb(23_32_51/0.25)] backdrop-blur-xl backdrop-saturate-150"
          : "border-transparent bg-transparent"
      )}
    >
      <Container
        className={cn(
          "flex items-center justify-between gap-6 transition-[height] duration-500",
          scrolled ? "h-16" : "h-[4.75rem]"
        )}
      >
        <Link
          href="/"
          aria-label="ExamOpt Studio home"
          className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <BrandLockup />
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink item={item} className={linkBase} active={active === item.href} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <SignInLink className="hidden rounded-full px-3.5 py-2 type-nav text-foreground/75 outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 sm:inline-flex" />
          <Link href="/admin" className={cn(ctaStyles.primary, ctaStyles.sm, "hidden sm:inline-flex")}>
            Open workspace
            <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
          </Link>
          {HAS_CLERK && (
            <Show when="signed-in">
              <UserButton appearance={{ elements: { avatarBox: "size-9 ring-2 ring-white shadow-sm" } }} />
            </Show>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="grid size-10 place-items-center rounded-full border border-hairline bg-white/70 text-foreground outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="size-[18px]" />
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[300px] flex-col gap-0 bg-canvas p-0">
              <SheetHeader className="border-b border-hairline p-5">
                <SheetTitle className="text-left">
                  <BrandLockup />
                </SheetTitle>
              </SheetHeader>
              <nav aria-label="Mobile" className="flex-1 p-3">
                <ul className="flex flex-col gap-0.5">
                  {navItems.map((item) => (
                    <li key={item.name}>
                      <NavLink
                        item={item}
                        onNavigate={close}
                        delay={280}
                        active={active === item.href}
                        className="flex rounded-xl px-3 py-3 text-[15px] text-foreground/80 outline-none transition-colors hover:bg-foreground/[0.04] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-[current=true]:bg-primary-soft aria-[current=true]:text-primary"
                      />
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="flex flex-col gap-2.5 border-t border-hairline p-5">
                <SignInLink
                  onClick={close}
                  className={cn(ctaStyles.secondary, ctaStyles.sm, "w-full")}
                />
                <Link href="/admin" onClick={close} className={cn(ctaStyles.primary, ctaStyles.sm, "w-full")}>
                  Open workspace
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Container>
    </header>
  );
}
