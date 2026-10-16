import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const createSchema = z.object({ code: z.string().trim().min(1).max(20), name: z.string().trim().min(1).max(100), program: z.string().trim().min(1).max(100), semester: z.coerce.number().int().min(1).max(10), durationMinutes: z.coerce.number().int().positive().max(600).default(180), examType: z.enum(["theory", "practical", "combined"]).default("theory"), requiresLab: z.boolean().default(false) });
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(100).optional(), program: z.string().trim().max(100).optional(), semester: z.coerce.number().int().min(1).max(10).optional(), requiresLab: z.enum(["true", "false"]).optional() });
export async function GET(req: Request) { return createApiRoute({ req, requireAuth: true, schema: listSchema }, async (_ctx, input) => examOptRepository.listSubjects(input)); }
export async function POST(req: Request) { return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: createSchema }, async (_ctx, input) => ({ subject: await examOptRepository.createSubject(input) })); }
