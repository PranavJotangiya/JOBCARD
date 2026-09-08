import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { SKIP_REFRESH } from './http-context.tokens';

/**
 * On a 401 from our API, transparently calls POST /auth/refresh once (the refresh
 * cookie is sent automatically) and replays the failed request plus any others
 * that queued up meanwhile. If refresh fails, the session is cleared and the
 * user is sent to /login with a `returnUrl`.
 *
 * `/auth/*` requests carry `SKIP_REFRESH` so they never recurse.
 */
let refreshing = false;
const refreshed$ = new BehaviorSubject<boolean>(false);

export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('/api/');
  if (!isApi || req.context.get(SKIP_REFRESH)) return next(req);

  const http = inject(HttpClient);
  const auth = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
        return throwError(() => err);
      }

      if (refreshing) {
        return refreshed$.pipe(
          filter((done) => done),
          take(1),
          switchMap(() => next(req)),
        );
      }

      refreshing = true;
      refreshed$.next(false);

      return http
        .post(`${environment.apiBaseUrl}/auth/refresh`, {}, { withCredentials: true })
        .pipe(
          switchMap(() => {
            refreshing = false;
            refreshed$.next(true);
            return next(req);
          }),
          catchError((refreshErr: unknown) => {
            refreshing = false;
            refreshed$.next(true);
            auth.clearSession();
            const returnUrl = router.url && router.url !== '/login' ? router.url : undefined;
            void router.navigate(['/login'], {
              queryParams: returnUrl ? { returnUrl, reason: 'expired' } : { reason: 'expired' },
            });
            return throwError(() => refreshErr);
          }),
        );
    }),
  );
};
