import { z } from 'zod';
import { PAGINATION } from '../../constants/pagination';

/** A Mongo ObjectId string. */
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

/** `:id` route params. */
export const idParamSchema = z.object({ id: objectId });

/**
 * Shared list/pagination query params. Feature validators `.extend()` this with
 * their own filters. Page/limit are coerced from strings and bounded so a client
 * can never request an unbounded result set.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce
    .number()
    .int()
    .min(PAGINATION.MIN_LIMIT)
    .max(PAGINATION.MAX_LIMIT)
    .default(PAGINATION.DEFAULT_LIMIT),
  sortBy: z.string().min(1).max(60).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
