"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  DoorOpen,
  Clock,
  Users,
  GraduationCap,
  User,
  SlidersHorizontal,
  CalendarRange,
  Cpu,
  GitBranch,
  Upload,
  BarChart3,
  FlaskConical,
  Bell,
  Settings,
  Calendar,
  Presentation,
} from "lucide-react";
import { SafeUserButton } from "@/components/auth/safe-auth-button";
import { Badge } from "@/components/ui/badge";
import type { LucideIcon } from "lucide-react";

type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  badge?: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const navGroups: NavigationGroup[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Data Management",
    items: [
      { title: "Subjects & Exams", href: "/admin/data/subjects", icon: BookOpen },
      { title: "Rooms & Labs", href: "/admin/data/rooms", icon: DoorOpen },
      { title: "Time Slots", href: "/admin/data/time-slots", icon: Clock },
      { title: "Student Groups", href: "/admin/data/student-groups", icon: Users },
      { title: "Students", href: "/admin/data/students", icon: GraduationCap },
      { title: "Faculty", href: "/admin/data/faculty", icon: User },
    ],
  },
  {
    label: "Scheduling",
    items: [
      { title: "Judge Demo", href: "/admin/demo-studio", icon: Presentation, badge: "Demo" },
      { title: "Constraints", href: "/admin/constraints", icon: SlidersHorizontal },
      { title: "Timetable", href: "/admin/schedules", icon: CalendarRange },
      { title: "Optimization Lab", href: "/admin/optimization", icon: Cpu },
      { title: "Conflict Analysis", href: "/admin/conflicts", icon: GitBranch },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Import & Export", href: "/admin/import", icon: Upload },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3 },
      { title: "Test Lab", href: "/admin/test-lab", icon: FlaskConical },
      { title: "Notifications", href: "/admin/notifications", icon: Bell },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <Sidebar className="border-r">
      {/* Header */}
      <SidebarHeader className="border-b">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 py-2">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Calendar className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-foreground">
              ExamOpt Studio
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight">
              Admin Workspace
            </span>
          </div>
        </Link>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="overflow-y-auto">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 py-1.5">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={item.href} />}
                        isActive={active}
                        className={cn(
                          "h-8 gap-2 px-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 truncate">{item.title}</span>
                          {"badge" in item && item.badge && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] py-0 px-1.5 h-4 font-medium"
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t p-3">
        <div className="flex items-center gap-2.5">
          <SafeUserButton />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">Signed-in account</p>
            <p className="text-[10px] text-muted-foreground">ExamOpt Studio</p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
