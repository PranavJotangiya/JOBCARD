import { z } from 'zod';
import { listQuerySchema } from '../shared/common.validation';

export const createJobberSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the Jobber name').max(160),
  })
  .strict();

export const listJobbersQuerySchema = listQuerySchema.extend({
  sortBy: z.enum(['name', 'createdAt']).optional(),
});

export type CreateJobberInput = z.infer<typeof createJobberSchema>;
export type ListJobbersQuery = z.infer<typeof listJobbersQuerySchema>;
