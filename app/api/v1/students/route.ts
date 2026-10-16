import { createApiRoute } from "@/server/api";
import { db } from "@/server/db";
import { z } from "zod";

const ListStudentsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(), program: z.string().trim().max(100).optional(),
  semester: z.coerce.number().int().min(1).max(10).optional(), hasBacklog: z.enum(["true", "false"]).optional(),
});

export async function GET(req: Request) {
  return createApiRoute({ req, requireAuth: true, schema: ListStudentsSchema }, async (_ctx, input) => {
    const { page, limit, search, program, semester, hasBacklog } = input;
    const where = {
      ...(search ? { OR: [
        { rollNumber: { contains: search, mode: "insensitive" as const } },
        { name: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
      ...(program ? { program } : {}), ...(semester ? { semester } : {}),
      ...(hasBacklog ? { enrollments: { some: { isBacklog: hasBacklog === "true" } } } : {}),
    };
    const [students, total, totalStudents, backlogStudents, subjectEnrollments] = await Promise.all([
      db.student.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { rollNumber: "asc" },
        include: { group: { select: { code: true, name: true } }, enrollments: { include: { subject: { select: { code: true, name: true } } } }, },
      }),
      db.student.count({ where }), db.student.count({ where: { isActive: true } }),
      db.student.count({ where: { enrollments: { some: { isBacklog: true } } } }), db.enrollment.count(),
    ]);
    return {
      students, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
      metrics: { totalStudents, backlogStudents, subjectEnrollments },
    };
  });
}
