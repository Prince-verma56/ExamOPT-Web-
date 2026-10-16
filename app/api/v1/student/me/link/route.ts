import { z } from "zod";
import { clerkClient } from "@clerk/nextjs/server";
import { ApiRouteError, createApiRoute, invalidateClerkProfileCache } from "@/server/api";
import { studentEmailMatchesAccount } from "@/modules/auth/student-self-link";
import { loadStudentForSelfLink } from "@/server/scheduling/loader";

const linkSchema = z.object({
  rollNo: z.string().trim().min(3).max(40),
}).strict();

export async function POST(req: Request) {
  return createApiRoute({
    req,
    requireAuth: true,
    requiredPermissions: ["student"],
    schema: linkSchema,
    rateLimit: { limit: 5, windowSeconds: 300 },
  }, async (ctx, input) => {
    if ((ctx.role !== "student" && ctx.role !== "admin") || !ctx.userId) {
      throw new ApiRouteError("FORBIDDEN", "Only student and administrator accounts can link a student record.", 403);
    }
    if (ctx.identity.rollNo) {
      throw new ApiRouteError("ALREADY_LINKED", "This account is already linked to a student record.", 409);
    }
    if (!ctx.profileAvailable || !ctx.email || !ctx.emailVerified) {
      throw new ApiRouteError("PROFILE_UNAVAILABLE", "We could not verify your signed-in email. Please retry or contact the examination office.", 503);
    }

    const student = await loadStudentForSelfLink(input.rollNo.toUpperCase());
    if (!student || !student.studentEmail || !studentEmailMatchesAccount(ctx.email, student.studentEmail)) {
      throw new ApiRouteError(
        "STUDENT_VERIFICATION_FAILED",
        "The roll number and verified account email do not match a student record. Check your details or contact the examination office.",
        403,
      );
    }

    try {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(ctx.userId, {
        publicMetadata: { rollNo: student.rollNo, role: "student" },
      });
      invalidateClerkProfileCache(ctx.userId);
    } catch (error) {
      console.error("[student-self-link] Could not save verified student identity:", error);
      throw new ApiRouteError("LINK_PERSISTENCE_FAILED", "We verified your student record but could not save the link. Please retry.", 502);
    }

    return {
      rollNo: student.rollNo,
      name: student.name,
    };
  });
}
