import { PAGINATION } from '../constants/pagination';
import type { ListQueryOptions, PaginationMeta } from '../types/common.types';

export interface RawListQuery {
  page?: unknown;
  limit?: unknown;
  sortBy?: unknown;
  sortOrder?: unknown;
  search?: unknown;
}

interface BuildListQueryConfig {
  /** Whitelist of fields the client is allowed to sort by. */
  sortableFields: readonly string[];
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
  maxLimit?: number;
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Normalises raw, untrusted query-string params into safe pagination/sort options.
 *
 * - `limit` is clamped to [MIN_LIMIT, maxLimit] so a client can never request an
 *   unbounded result set.
 * - `sortBy` must be in the caller-supplied whitelist, otherwise the default is used.
 * Feature services build their own MongoDB filter object (always scoped to the
 * caller's ownership) and combine it with these options.
 */
export function buildListQuery(query: RawListQuery, config: BuildListQueryConfig): ListQueryOptions {
  const maxLimit = config.maxLimit ?? PAGINATION.MAX_LIMIT;

  const page = toPositiveInt(query.page, PAGINATION.DEFAULT_PAGE);
  const requestedLimit = toPositiveInt(query.limit, PAGINATION.DEFAULT_LIMIT);
  const limit = Math.min(Math.max(requestedLimit, PAGINATION.MIN_LIMIT), maxLimit);
  const skip = (page - 1) * limit;

  const defaultSortBy = config.defaultSortBy ?? PAGINATION.DEFAULT_SORT_BY;
  const requestedSortBy = typeof query.sortBy === 'string' ? query.sortBy : defaultSortBy;
  const sortBy = config.sortableFields.includes(requestedSortBy) ? requestedSortBy : defaultSortBy;

  const sortOrder: 'asc' | 'desc' =
    query.sortOrder === 'asc' || query.sortOrder === 'desc'
      ? query.sortOrder
      : (config.defaultSortOrder ?? PAGINATION.DEFAULT_SORT_ORDER);

  const search =
    typeof query.search === 'string' && query.search.trim().length > 0
      ? query.search.trim()
      : undefined;

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
    search,
  };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1 && total > 0,
  };
}

/** Escapes user input before it is used inside a RegExp for `$regex` search. */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
