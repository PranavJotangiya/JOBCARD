import { ErrorCode, type ErrorCodeValue } from '../constants/error-codes';
import { HttpStatus, type HttpStatusCode } from '../constants/http-status';

/**
 * Application-level error.
 *
 * Services/controllers throw `ApiError` (usually via the static helpers). The
 * centralised error middleware is the ONLY place these become HTTP responses, so
 * business code never builds error bodies by hand.
 *
 * `isOperational = true` marks an expected condition (bad input, not found,
 * ownership violation) vs. an unforeseen bug — used to decide log level and how
 * much detail to expose.
 */
export class ApiError extends Error {
  public readonly statusCode: HttpStatusCode;
  public readonly code: ErrorCodeValue;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(
    statusCode: HttpStatusCode,
    message: string,
    code: ErrorCodeValue = ErrorCode.INTERNAL_ERROR,
    options: { details?: unknown; isOperational?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = options.details;
    this.isOperational = options.isOperational ?? true;
    if (options.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Bad request', code: ErrorCodeValue = ErrorCode.VALIDATION_ERROR, details?: unknown): ApiError {
    return new ApiError(HttpStatus.BAD_REQUEST, message, code, { details });
  }

  static unauthorized(message = 'Authentication required', code: ErrorCodeValue = ErrorCode.AUTH_REQUIRED): ApiError {
    return new ApiError(HttpStatus.UNAUTHORIZED, message, code);
  }

  static forbidden(message = 'You do not have permission to perform this action', code: ErrorCodeValue = ErrorCode.FORBIDDEN): ApiError {
    return new ApiError(HttpStatus.FORBIDDEN, message, code);
  }

  static notFound(message = 'Resource not found', code: ErrorCodeValue = ErrorCode.RESOURCE_NOT_FOUND): ApiError {
    return new ApiError(HttpStatus.NOT_FOUND, message, code);
  }

  static conflict(message = 'Resource already exists', code: ErrorCodeValue = ErrorCode.DUPLICATE_RESOURCE, details?: unknown): ApiError {
    return new ApiError(HttpStatus.CONFLICT, message, code, { details });
  }

  static unprocessable(message = 'Validation failed', details?: unknown): ApiError {
    return new ApiError(HttpStatus.UNPROCESSABLE_ENTITY, message, ErrorCode.VALIDATION_ERROR, { details });
  }

  static tooManyRequests(message = 'Too many requests, please try again later'): ApiError {
    return new ApiError(HttpStatus.TOO_MANY_REQUESTS, message, ErrorCode.RATE_LIMITED);
  }

  static internal(message = 'Something went wrong', options: { cause?: unknown } = {}): ApiError {
    return new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, message, ErrorCode.INTERNAL_ERROR, {
      isOperational: false,
      cause: options.cause,
    });
  }
}
