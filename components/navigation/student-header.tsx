"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { GraduationCap, CalendarDays, BookOpen, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BrandLockup } from "@/components/marketing/primitives";
import { cn } from "@/lib/utils";

interface StudentHeaderProps {
  email: string | null;
  name: string | null;
  rollNo: string | null;
}

export function StudentHeader({ email, name, rollNo }: StudentHeaderProps) {
  const pathname = usePathname();
  const { user } = useUser();

  const displayName = name || user?.fullName || (user?.emailAddresses?.[0]?.emailAddress ?? email ?? "Student");
  const displayEmail = email || user?.emailAddresses?.[0]?.emailAddress;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Brand & Portal Badge */}
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BrandLockup />
          </Link>
          <div className="hidden h-5 w-px bg-border sm:block" />
          <Badge variant="secondary" className="gap-1.5 px-2.5 py-0.5 text-xs font-medium text-primary">
            <GraduationCap className="size-3.5" />
            Student Portal
          </Badge>
        </div>

        {/* Student Navigation */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Student portal navigation">
          <Link
            href="/student"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              pathname === "/student" || pathname === "/student/timetable"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <CalendarDays className="size-3.5" />
            My Timetable
          </Link>
        </nav>

        {/* User Identity & Account Menu */}
        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end text-right sm:flex">
            <p className="text-xs font-semibold leading-tight">{displayName}</p>
            <div className="flex items-center gap-1.5">
              {rollNo ? (
                <code className="rounded bg-primary/10 px-1 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {rollNo}
                </code>
              ) : (
                <span className="text-[10px] text-amber-600 font-medium">Unlinked Account</span>
              )}
              {displayEmail && <span className="text-[10px] text-muted-foreground truncate max-w-32">{displayEmail}</span>}
            </div>
          </div>

          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-8 ring-2 ring-primary/20",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
