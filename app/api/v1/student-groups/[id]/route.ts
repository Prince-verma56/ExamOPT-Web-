import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const updateSchema = z.object({ name: z.string().trim().min(1).max(100).optional(), program: z.string().trim().min(1).max(100).optional(), semester: z.coerce.number().int().min(1).max(10).optional(), strength: z.coerce.number().int().nonnegative().max(10000).optional() });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: updateSchema }, async (_ctx, input) => ({ group: await examOptRepository.updateGroup(id, input) })); }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => { await examOptRepository.deleteGroup(id); return { deleted: true }; }); }
