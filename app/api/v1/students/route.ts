import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const ListStudentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(), program: z.string().trim().max(100).optional(),
  semester: z.coerce.number().int().min(1).max(10).optional(), hasBacklog: z.enum(["true", "false"]).optional(),
});

/**
 * Student directory from the canonical tables the scheduler reads
 * (`student_enrollments`, `student_subject_enrollments`). It previously read
 * the unused Prisma-family `students` table. Names are personal data, so this
 * is restricted to administrators.
 */
export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: ListStudentsSchema }, (_ctx, input) => examOptRepository.listStudents(input));
}
