import { createApiRoute } from "@/server/api";
import { examOptRepository } from "@/server/examopt/repository";
import { z } from "zod";

const updateSchema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(), session: z.enum(["morning", "evening"]).optional(), label: z.string().optional() }).refine((value) => !value.startTime || !value.endTime || value.startTime < value.endTime, { path: ["endTime"], message: "End time must be after start time." });
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"], schema: updateSchema }, async (_ctx, input) => ({ slot: await examOptRepository.updateSlot(id, input) })); }
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return createApiRoute({ req, requireAuth: true, requiredPermissions: ["admin"] }, async () => { await examOptRepository.deactivateSlot(id); return { deleted: true }; }); }
