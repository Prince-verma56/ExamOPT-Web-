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

/** Judge Demo Studio. Every demo request runs in memory and is never persisted. */
export const demoSourceSchema = z.enum(["live", "fixture"]);

const examIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const algorithmIdSchema = z.enum(["FIRST_FIT", "WELSH_POWELL", "BACKTRACKING"]);
/** Demo runs are interactive, so the search budget is capped lower than for saved runs. */
const demoConfigSchema = z.object({
  maxNodes: z.number().int().min(1).max(500_000).optional(),
  timeLimitMs: z.number().int().min(50).max(5_000).optional(),
}).strict();

export const demoDatasetSchema = z.object({ source: demoSourceSchema.default("live") });

export const demoArenaSchema = z.object({
  source: demoSourceSchema,
  algorithms: z.array(algorithmIdSchema).min(1).max(3).refine((list) => new Set(list).size === list.length, "Each algorithm can be selected once."),
  config: demoConfigSchema.optional(),
  /** Also time an untraced run of each algorithm, reported as a separate benchmark. */
  benchmark: z.boolean().optional(),
}).strict();

export const demoBottleneckSchema = z.object({ source: demoSourceSchema }).strict();

export const demoSimulateSchema = z.object({
  source: demoSourceSchema,
  scenario: z.enum(["STUDENT_OVERLAP", "BACKLOG_CONFLICT", "ROOM_DOUBLE_BOOKED", "ROOM_CAPACITY_EXCEEDED", "ROOM_TYPE_MISMATCH", "SLOT_RULE_VIOLATED", "COMBINED"]),
  baselineAlgorithm: algorithmIdSchema,
  targets: z.object({ examId: examIdSchema.optional(), otherExamId: examIdSchema.optional() }).strict().optional(),
  resolution: z.object({ strategy: z.enum(["repair", "regenerate", "restore"]), algorithm: algorithmIdSchema.optional() }).strict().optional(),
  config: demoConfigSchema.optional(),
}).strict();
