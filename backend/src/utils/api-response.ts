import type { Response } from 'express';
import { HttpStatus, type HttpStatusCode } from '../constants/http-status';
import type { PaginationMeta } from '../types/common.types';

/**
 * The single source of truth for the API's SUCCESS contract:
 *   { "success": true, "data": <payload> }               (single resource)
 *   { "success": true, "data": [], "pagination": {...} }  (list)
 *
 * `message` is included when supplied but is advisory only — clients must not
 * depend on its text.
 */
export const ApiResponse = {
  send<T>(res: Response, statusCode: HttpStatusCode, data: T, message?: string): Response {
    return res.status(statusCode).json(message ? { success: true, message, data } : { success: true, data });
  },

  ok<T>(res: Response, data: T, message?: string): Response {
    return ApiResponse.send(res, HttpStatus.OK, data, message);
  },

  created<T>(res: Response, data: T, message?: string): Response {
    return ApiResponse.send(res, HttpStatus.CREATED, data, message);
  },

  noContent(res: Response): Response {
    return res.status(HttpStatus.NO_CONTENT).send();
  },

  list<T>(res: Response, data: T[], pagination: PaginationMeta, message?: string): Response {
    const body: Record<string, unknown> = { success: true, data, pagination };
    if (message) body.message = message;
    return res.status(HttpStatus.OK).json(body);
  },
};
