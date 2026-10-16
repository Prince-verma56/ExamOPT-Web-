"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "About", href: "/about" },
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
];

export function MarketingNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex items-center gap-8">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "relative text-sm font-medium transition-colors hover:text-foreground",
              isActive ? "text-foreground" : "text-foreground/60"
            )}
          >
            {item.name}
            {isActive && (
              <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-foreground transition-all" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
