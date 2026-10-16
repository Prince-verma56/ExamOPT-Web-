import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), program: z.string().trim().min(1).max(100).optional(), semester: z.coerce.number().int().min(1).max(10).optional(), durationMinutes: z.coerce.number().int().positive().max(600).optional(), examType: z.enum(["theory", "practical", "combined"]).optional(), requiresLab: z.boolean().optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: updateSchema }, async (_ctx, input) => ({ subject: await examOptRepository.updateSubject(id, input) })); }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => { await examOptRepository.deleteSubject(id); return { deleted: true }; }); }
