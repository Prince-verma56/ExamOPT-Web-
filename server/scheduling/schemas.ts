import { z } from "zod";

/** Request schemas shared by the scheduling routes. Objects are strict, so unknown fields (such as a role) are rejected. */

const weight = z.number().min(0).max(100);

export const engineConfigSchema = z.object({
  maxNodes: z.number().int().min(1).max(2_000_000).optional(),
  timeLimitMs: z.number().int().min(50).max(10_000).optional(),
  weights: z.object({ sameDay: weight, backToBack: weight, capacityWaste: weight, daysUsed: weight }).partial().optional(),
}).strict();

export const runIdSchema = z.string().regex(/^[A-Za-z0-9-]{1,64}$/);

export const exportKindSchema = z.enum(["timetable", "rooms", "invigilation"]);

export const uploadTableSchema = z.enum(["rooms", "timeslots", "faculty", "subjects"]);
