import { ApiRouteError, createApiRoute } from "@/server/api";
import { linkStudentAccount, listStudentLinks, unlinkStudentAccount } from "@/modules/auth/student-links";
import { loadStudent } from "@/server/scheduling/loader";
import { z } from "zod";

const linkSchema = z.object({
  emailOrUserId: z.string().trim().min(3).max(120),
  rollNo: z.string().trim().min(3).max(40),
  note: z.string().trim().max(200).optional(),
}).strict();

const deleteSchema = z.object({
  emailOrUserId: z.string().trim().min(3).max(120),
}).strict();

/**
 * Administrator student account linking endpoints.
 * Requires admin permission.
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => {
    return { links: await listStudentLinks() };
  });
}

export async function POST(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: linkSchema }, async (ctx, input) => {
    // Verify roll number actually exists in student records
    const student = await loadStudent(input.rollNo);
    if (!student) {
      throw new ApiRouteError("NOT_FOUND", `Student roll number ${input.rollNo} does not exist in student records.`, 404);
    }

    const record = await linkStudentAccount({
      emailOrUserId: input.emailOrUserId,
      rollNo: student.rollNo,
      linkedBy: ctx.email ?? ctx.userId ?? "Administrator",
      note: input.note,
    });

    return {
      success: true,
      link: record,
      student: {
        rollNo: student.rollNo,
        name: student.name,
        group: student.groupName ?? student.groupId,
      },
    };
  });
}

export async function DELETE(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: deleteSchema }, async (_ctx, input) => {
    const unlinked = await unlinkStudentAccount(input.emailOrUserId);
    return { success: unlinked };
  });
}
