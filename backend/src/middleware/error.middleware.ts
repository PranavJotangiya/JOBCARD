import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { MulterError } from 'multer';
import { ApiError } from '../utils/api-error';
import { ErrorCode, type ErrorCodeValue } from '../constants/error-codes';
import { HttpStatus, type HttpStatusCode } from '../constants/http-status';
import { env } from '../config/environment';
import { logger } from '../utils/logger';
import type { ErrorResponseBody } from '../types/common.types';

/**
 * The ONE place HTTP error responses are produced.
 *
 * Every error — `ApiError`, Zod, Mongoose, the Mongo driver, multer, body-parser
 * or an unexpected bug — is normalised into:
 *   { success: false, message, code, details? }
 *
 * Production responses never include stack traces, `cause`, connection strings
 * or other internals; development responses do, to aid debugging.
 */
interface Normalised {
  statusCode: HttpStatusCode;
  message: string;
  code: ErrorCodeValue;
  details?: unknown;
  isOperational: boolean;
}

function normalise(err: unknown): Normalised {
  if (err instanceof ApiError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      details: err.details,
      isOperational: err.isOperational,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Request validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      details: err.issues.map((i) => ({ path: i.path.join('.') || '(root)', message: i.message })),
      isOperational: true,
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      message: 'Data validation failed',
      code: ErrorCode.VALIDATION_ERROR,
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
      isOperational: true,
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: `Invalid value for "${err.path}"`,
      code: ErrorCode.INVALID_ID,
      isOperational: true,
    };
  }

  if (err instanceof mongoose.Error.VersionError) {
    return {
      statusCode: HttpStatus.CONFLICT,
      message: 'This record was modified by someone else. Reload and try again.',
      code: ErrorCode.DUPLICATE_RESOURCE,
      isOperational: true,
    };
  }

  if (isMongoDuplicateKeyError(err)) {
    const fields = Object.keys(err.keyPattern ?? {});
    return {
      statusCode: HttpStatus.CONFLICT,
      message:
        fields.length > 0
          ? `A record with the same ${fields.join(', ')} already exists`
          : 'Duplicate record',
      code: ErrorCode.DUPLICATE_RESOURCE,
      details: env.isProduction ? undefined : { keyValue: err.keyValue },
      isOperational: true,
    };
  }

  if (err instanceof MulterError) {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    return {
      statusCode: tooLarge ? HttpStatus.PAYLOAD_TOO_LARGE : HttpStatus.BAD_REQUEST,
      message: tooLarge ? 'The uploaded file is too large' : `Upload error: ${err.message}`,
      code: tooLarge ? ErrorCode.PAYLOAD_TOO_LARGE : ErrorCode.VALIDATION_ERROR,
      isOperational: true,
    };
  }

  if (isBodyParserError(err) && err.type === 'entity.too.large') {
    return {
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'Request body is too large',
      code: ErrorCode.PAYLOAD_TOO_LARGE,
      isOperational: true,
    };
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Malformed JSON in request body',
      code: ErrorCode.VALIDATION_ERROR,
      isOperational: true,
    };
  }

  if (err instanceof Error && /not allowed by CORS/i.test(err.message)) {
    return {
      statusCode: HttpStatus.FORBIDDEN,
      message: err.message,
      code: ErrorCode.FORBIDDEN,
      isOperational: true,
    };
  }

  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: env.isProduction ? 'Something went wrong. Please try again.' : toMessage(err),
    code: ErrorCode.INTERNAL_ERROR,
    isOperational: false,
  };
}

function toMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return typeof err === 'string' ? err : 'Unknown error';
}

interface MongoDuplicateKeyError {
  code: 11000;
  keyPattern?: Record<string, unknown>;
  keyValue?: Record<string, unknown>;
}
function isMongoDuplicateKeyError(err: unknown): err is MongoDuplicateKeyError {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

function isBodyParserError(err: unknown): err is { type?: string } {
  return typeof err === 'object' && err !== null && 'type' in err;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express detects error middleware by arity
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const n = normalise(err);

  const logPayload = {
    err,
    reqId: req.id,
    method: req.method,
    path: req.originalUrl,
    statusCode: n.statusCode,
    code: n.code,
    userId: req.auth?.id,
    role: req.auth?.role,
  };

  if (n.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR || !n.isOperational) {
    logger.error(logPayload, 'Unhandled error while processing request');
  } else {
    logger.warn(logPayload, 'Request failed');
  }

  const body: ErrorResponseBody = { success: false, message: n.message, code: n.code };
  if (n.details !== undefined) body.details = n.details;
  if (!env.isProduction && err instanceof Error && err.stack) body.stack = err.stack;

  res.status(n.statusCode).json(body);
}
