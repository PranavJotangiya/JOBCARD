import { z } from 'zod';
import { listQuerySchema } from '../shared/common.validation';

export const createManufacturerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the Manufacturer name').max(160),
  })
  .strict();

export const listManufacturersQuerySchema = listQuerySchema.extend({
  sortBy: z.enum(['name', 'createdAt']).optional(),
});

export type CreateManufacturerInput = z.infer<typeof createManufacturerSchema>;
export type ListManufacturersQuery = z.infer<typeof listManufacturersQuerySchema>;
