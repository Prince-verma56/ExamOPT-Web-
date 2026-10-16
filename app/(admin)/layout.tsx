/**
 * Admin Layout
 * Authenticated layout for the ExamOpt Studio admin workspace.
 * Uses shadcn SidebarProvider + AdminSidebar.
 */

import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/navigation/admin-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminTopBar } from "@/components/layout/admin-top-bar";
import { isDemoAllowed, parseList, isAdminMetadataRole } from "@/modules/auth/access";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerk = Boolean(clerkKey && (clerkKey.startsWith("pk_test_") || clerkKey.startsWith("pk_live_")));

  if (isClerk) {
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult?.userId || null;
    } catch {
      userId = null;
    }

    if (!userId) {
      if (!isDemoAllowed()) {
        redirect("/sign-in");
      }
    } else {
      // User is authenticated — enforce server-side administrator verification
      const allowedUserIds = parseList(process.env.EXAMOPT_ADMIN_USER_IDS);
      const allowedEmails = parseList(process.env.EXAMOPT_ADMIN_EMAILS);

      let isAdmin = allowedUserIds.includes(userId.toLowerCase());
      if (!isAdmin) {
        try {
          const clerk = await clerkClient();
          const user = await clerk.users.getUser(userId);
          const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
          const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;
          if (email && allowedEmails.includes(email.toLowerCase())) {
            isAdmin = true;
          } else if (isAdminMetadataRole(metadata.role)) {
            isAdmin = true;
          }
        } catch {
          isAdmin = false;
        }
      }

      // Deny student accounts access to the administrator workspace
      if (!isAdmin) {
        redirect("/student");
      }
    }
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="min-w-0 flex flex-col min-h-screen bg-muted/20">
        <AdminTopBar />
        <div className="flex-1 w-full">
          <div className="container-fluid p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
