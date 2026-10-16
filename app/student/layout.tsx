import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { StudentHeader } from "@/components/navigation/student-header";
import { resolveStudentRollNo } from "@/modules/auth/student-links";
import { isDemoAllowed } from "@/modules/auth/access";

export const metadata = {
  title: "Student Portal | ExamOpt Studio",
  description: "View your personal examination timetable, assigned examination rooms, and schedules.",
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerk = Boolean(clerkKey && (clerkKey.startsWith("pk_test_") || clerkKey.startsWith("pk_live_")));

  let email: string | null = null;
  let name: string | null = null;
  let rollNo: string | null = null;

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
      try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
        name = user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : null;
        const metadata = (user.publicMetadata ?? {}) as Record<string, unknown>;

        rollNo = await resolveStudentRollNo({
          userId,
          email,
          metadataRollNo: typeof metadata.rollNo === "string" ? metadata.rollNo : null,
        });
      } catch (err) {
        console.warn("[student-layout] Error retrieving user profile:", err);
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <StudentHeader email={email} name={name} rollNo={rollNo} />
      <main className="flex-1 w-full pb-16">{children}</main>
    </div>
  );
}
