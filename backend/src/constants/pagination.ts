/**
 * Safe pagination defaults and hard limits.
 * `MAX_LIMIT` protects the database from an accidental "give me everything" request.
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_SORT_BY: 'createdAt',
  DEFAULT_SORT_ORDER: 'desc' as 'asc' | 'desc',
} as const;
