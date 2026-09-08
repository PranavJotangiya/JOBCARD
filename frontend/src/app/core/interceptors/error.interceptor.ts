import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { SKIP_ERROR_TOAST } from './http-context.tokens';
import type { ApiError, AppError } from '../models/api.model';

/**
 * Normalises every failure into an `AppError` and (unless the caller opted out)
 * shows a friendly toast. Raw backend stack traces are never surfaced. 401s stay
 * quiet — the refresh interceptor + guards own that flow.
 */
const FRIENDLY: Record<number, string> = {
  0: 'Unable to connect. Check your internet connection and try again.',
  400: 'That request was invalid.',
  403: "You don't have permission to do that.",
  404: 'That item could not be found.',
  409: 'That action conflicts with the current data.',
  413: 'That file is too large.',
  415: 'That file type is not supported.',
  422: 'Please check the highlighted fields and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our side. Please try again.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
};

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  const silent = req.context.get(SKIP_ERROR_TOAST);

  return next(req).pipe(
    catchError((err: unknown) => {
      const appError = normalise(err);
      if (!silent && appError.status !== 401) {
        notifications.error(appError.message);
      }
      return throwError(() => appError);
    }),
  );
};

function normalise(err: unknown): AppError {
  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? {}) as Partial<ApiError>;
    const isNetworkError = err.status === 0;
    const message =
      (typeof body.message === 'string' && body.message) ||
      FRIENDLY[err.status] ||
      'Unexpected error. Please try again.';
    return {
      status: err.status,
      message,
      code: body.code ?? `HTTP_${err.status}`,
      details: body.details,
      isNetworkError,
    };
  }
  return { status: 0, message: FRIENDLY[0], code: 'UNKNOWN', isNetworkError: true };
}
