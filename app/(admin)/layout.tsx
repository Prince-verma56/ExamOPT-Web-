/**
 * Admin Layout
 * Authenticated layout for the ExamOpt Studio admin workspace.
 * Uses shadcn SidebarProvider + AdminSidebar.
 */

import { AdminSidebar } from "@/components/navigation/admin-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminTopBar } from "@/components/layout/admin-top-bar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-h-screen overflow-hidden">
        <AdminTopBar />
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="container-fluid p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
