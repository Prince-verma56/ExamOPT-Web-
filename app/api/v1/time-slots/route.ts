import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const createSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/), session: z.enum(["morning", "afternoon", "evening"]).default("morning"), label: z.string().trim().max(100).optional(), isAvailable: z.boolean().default(true) }).refine((value) => value.startTime < value.endTime, { path: ["endTime"], message: "End time must be after start time." });
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), session: z.enum(["morning", "afternoon", "evening"]).optional(), isAvailable: z.enum(["true", "false"]).optional(), dateFrom: z.string().optional(), dateTo: z.string().optional() });
export async function GET(req: Request) { return createApiRoute({ req, requireAuth: true, schema: listSchema }, async (_ctx, input) => examOptRepository.listSlots(input)); }
export async function POST(req: Request) { return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: createSchema }, async (_ctx, input) => ({ slot: await examOptRepository.createSlot(input) })); }
