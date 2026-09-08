import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';

/**
 * Terminal 404 handler for unmatched routes. Registered after all route
 * definitions and before the error middleware, so unknown paths flow through
 * the same centralised error contract as everything else.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(
    ApiError.notFound(
      `Route not found: ${req.method} ${req.originalUrl}`,
      ErrorCode.ROUTE_NOT_FOUND,
    ),
  );
}
