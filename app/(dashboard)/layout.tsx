/**
 * Dashboard Layout
 *
 * Layout for authenticated dashboard pages.
 */

import { AppSidebar } from "@/components/navigation/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-x-hidden">
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-6">
          <SidebarTrigger />
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}
