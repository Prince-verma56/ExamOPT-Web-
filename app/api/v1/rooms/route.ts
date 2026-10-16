import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const createSchema = z.object({ code: z.string().trim().min(1).max(20), name: z.string().trim().min(1).max(100), building: z.string().trim().max(100).optional(), capacity: z.coerce.number().int().positive(), roomType: z.enum(["standard", "lab", "auditorium"]).default("standard"), facilities: z.record(z.string(), z.unknown()).optional() });
const listSchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().max(100).optional(), roomType: z.enum(["standard", "lab", "auditorium"]).optional(), isActive: z.enum(["true", "false"]).optional() });

export async function GET(req: Request) { return createApiRoute({ req, requireAuth: true, schema: listSchema }, async (_ctx, input) => examOptRepository.listRooms(input)); }
export async function POST(req: Request) { return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: createSchema }, async (_ctx, input) => ({ room: await examOptRepository.createRoom(input) })); }
