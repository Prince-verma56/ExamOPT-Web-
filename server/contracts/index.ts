import { z } from 'zod';

export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Standard Success Response envelope for generic APIs
 */
export function createSuccessSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    data: dataSchema,
    meta: z.object({
      timestamp: z.string(),
      pagination: z.object({
        total: z.number(),
        page: z.number(),
        limit: z.number(),
      }).optional(),
    }).optional(),
  });
}

/**
 * Generic pagination request schema
 */
export const PaginationRequestSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});
