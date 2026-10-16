/**
 * Users Module
 *
 * User-related domain logic and schemas.
 */

import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
