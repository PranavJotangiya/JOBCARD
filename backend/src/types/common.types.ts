import type { RoleValue } from '../constants/roles';

/**
 * The caller identity attached to `req.auth` by the authentication middleware.
 * Carries the ownership scope (`manufacturerId` / `jobberId`) used for data
 * isolation. Never contains the password hash.
 */
export interface AuthenticatedUser {
  id: string;
  name: string;
  username: string;
  role: RoleValue;
  /** Set for MANUFACTURER users — the Manufacturer they act as. */
  manufacturerId: string | null;
  /** Set for JOBBER users — the Jobber they act as. */
  jobberId: string | null;
}

export interface ListQueryOptions {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  sort: Record<string, 1 | -1>;
  search?: string;
}

/** Matches the API pagination contract (requirement 26) + convenience flags. */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface ErrorResponseBody {
  success: false;
  message: string;
  code: string;
  details?: unknown;
  stack?: string;
}
