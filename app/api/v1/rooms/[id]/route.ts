import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), building: z.string().trim().max(100).optional(), capacity: z.coerce.number().int().positive().optional(), roomType: z.enum(["standard", "lab", "auditorium"]).optional(), facilities: z.record(z.string(), z.unknown()).optional(), isActive: z.boolean().optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: updateSchema }, async (_ctx, input) => ({ room: await examOptRepository.updateRoom(id, input) })); }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => { await examOptRepository.deactivateRoom(id); return { deleted: true }; }); }
