import { z } from "zod";
import { IMPORT_ENTITIES, MAX_IMPORT_BYTES } from "./csv-import";

/** Request schemas for CSV import/export. Strict: unknown fields (such as a role) are rejected. */
export const importEntitySchema = z.enum(IMPORT_ENTITIES);
export const importModeSchema = z.enum(["insert", "upsert"]);

export const importPreviewSchema = z.object({
  entity: importEntitySchema,
  mode: importModeSchema.default("insert"),
  csv: z.string().min(1).max(MAX_IMPORT_BYTES),
}).strict();

export const importCommitSchema = importPreviewSchema.extend({
  planHash: z.string().regex(/^[0-9a-f]{8}$/),
}).strict();

export const exportSchema = z.object({
  entity: importEntitySchema,
  template: z.enum(["1", "true"]).optional(),
}).strict();

const fixActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("set"), line: z.number().int().min(2), field: z.string().regex(/^[a-z_]{1,40}$/), value: z.string().max(255) }).strict(),
  z.object({ type: z.literal("removeRow"), line: z.number().int().min(2) }).strict(),
]);

export const importFixSchema = importPreviewSchema.extend({
  actions: z.array(fixActionSchema).min(1).max(5000),
}).strict();
