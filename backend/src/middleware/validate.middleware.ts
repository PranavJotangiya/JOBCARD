import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type ZodTypeAny, z } from 'zod';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { HttpStatus } from '../constants/http-status';

/**
 * Request validation middleware backed by Zod.
 *
 * Pass a schema for any of `body`, `query`, `params`. Parsed (and coerced /
 * defaulted) values are written back onto the request so controllers consume
 * clean, typed data. A failure produces the standard 422 error contract with a
 * flattened field-level `details` map — the backend is the final authority on
 * data shape, regardless of what the frontend validated.
 */
export interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

function formatZodError(error: ZodError): Array<{ path: string; message: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

export function validate(schemas: RequestSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        // req.query is a getter-only in Express 5; mutate in place for Express 4 compatibility.
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        Object.assign(req.query, parsed);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(
          new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, 'Request validation failed', ErrorCode.VALIDATION_ERROR, {
            details: formatZodError(err),
          }),
        );
        return;
      }
      next(err);
    }
  };
}

/** Reusable primitive: a Mongo ObjectId path/param. */
export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Must be a valid resource id');
