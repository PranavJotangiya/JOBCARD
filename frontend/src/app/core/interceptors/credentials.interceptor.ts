import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Sends cookies (the HttpOnly auth cookies) with every call to our API origin.
 * Scoped to `apiBaseUrl` so third-party requests are unaffected.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.apiBaseUrl) || req.url.startsWith('/api/')) {
    return next(req.clone({ withCredentials: true }));
  }
  return next(req);
};
