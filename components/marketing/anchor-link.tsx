"use client";

/**
 * In-page link that scrolls through the shared Lenis instance (falls back to
 * native smooth scrolling). Renders a real <a href="#…">, so it still works
 * before hydration and with JavaScript disabled.
 */

import { useAnchorScroll } from "@/animations/smooth-scroll/use-anchor-scroll";

export function AnchorLink({
  href,
  className,
  children,
  onNavigate,
  delay = 0,
  ...rest
}: {
  href: `#${string}` | `/#${string}`;
  className?: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  /** Wait before scrolling, e.g. while a menu sheet closes and unlocks scroll. */
  delay?: number;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick">) {
  const scrollTo = useAnchorScroll();
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        onNavigate?.();
        scrollTo(event, href, delay);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
