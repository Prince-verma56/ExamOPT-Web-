"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Bell, GraduationCap, CalendarDays, Presentation } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const routeLabels: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/data": "Data Workspace",
  "/admin/data/subjects": "Subjects & Exams",
  "/admin/data/rooms": "Rooms & Labs",
  "/admin/data/time-slots": "Time Slots",
  "/admin/data/student-groups": "Student Groups",
  "/admin/data/students": "Students",
  "/admin/data/faculty": "Faculty",
  "/admin/constraints": "Constraints",
  "/admin/schedules": "Timetable Grid",
  "/admin/optimization": "Optimization Lab",
  "/admin/conflicts": "Conflict Analysis",
  "/admin/demo-studio": "Judge Demo Studio",
  "/admin/import": "Import & Export",
  "/admin/analytics": "Analytics",
  "/admin/test-lab": "Test Lab",
  "/admin/notifications": "Notifications",
  "/admin/settings": "Settings",
};

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; href: string }[] = [
    { label: "Admin", href: "/admin" },
  ];

  const parts = pathname.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    if (current !== "/admin" && routeLabels[current]) {
      crumbs.push({ label: routeLabels[current], href: current });
    }
  }

  return crumbs;
}

export function AdminTopBar() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background/90 backdrop-blur-sm px-4 sticky top-0 z-40">
      <SidebarTrigger className="h-7 w-7 flex-shrink-0" />
      <Separator orientation="vertical" className="h-5" />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-sm whitespace-nowrap">
        {breadcrumbs.map((crumb, i) => (
          <span key={crumb.href} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-muted-foreground/40">/</span>
            )}
            {i === breadcrumbs.length - 1 ? (
              <span className="truncate font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {crumb.label}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick Access to Student Portal and Schedules */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Link
          href="/admin/demo-studio"
          className={cn(
            buttonVariants({ variant: pathname.startsWith("/admin/demo-studio") ? "secondary" : "default", size: "sm" }),
            "h-8 text-xs gap-1.5"
          )}
          aria-label="Judge Demo Studio"
        >
          <Presentation className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Judge Demo</span>
        </Link>

        <Link
          href="/student"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 text-xs gap-1.5 hidden sm:inline-flex"
          )}
          aria-label="Student Portal"
        >
          <GraduationCap className="h-3.5 w-3.5 text-primary" />
          <span className="hidden xl:inline">Student Portal</span>
        </Link>

        <Link
          href="/admin/schedules"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "h-8 text-xs gap-1.5 hidden sm:inline-flex"
          )}
          aria-label="Timetable Grid"
        >
          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden xl:inline">Timetable Grid</span>
        </Link>

        {/* Notifications */}
        <Link
          href="/admin/notifications"
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "h-8 w-8 relative"
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
