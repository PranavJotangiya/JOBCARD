/**
 * TypeScript mirror of the backend response contract
 * (backend/src/utils/api-response.ts + error.middleware.ts).
 */
export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ApiList<T> {
  success: true;
  message?: string;
  data: T[];
  pagination: Pagination;
}

export interface ApiError {
  success: false;
  message: string;
  code: string;
  details?: unknown;
}

/** Normalised error the interceptor rethrows and components/services catch. */
export interface AppError {
  status: number;
  message: string;
  code: string;
  details?: unknown;
  /** true for network-down / timeout — callers may offer "retry". */
  isNetworkError: boolean;
}

export interface PageResult<T> {
  items: T[];
  pagination: Pagination;
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;
