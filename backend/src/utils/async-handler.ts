import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * Express's error pipeline (`next(err)`) instead of crashing the process or
 * hanging the request.
 *
 * This removes the need for a try/catch in every controller — the centralised
 * error middleware handles everything.
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
