import { HttpContextToken } from '@angular/common/http';

/** Per-request opt-outs, passed via `HttpContext`. Type-safe alternative to magic headers. */

/** Loading interceptor ignores this request (no global progress bar). */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/** Error interceptor won't toast — the caller handles the error itself. */
export const SKIP_ERROR_TOAST = new HttpContextToken<boolean>(() => false);

/** Refresh interceptor won't attempt a token refresh on 401 (used by auth calls themselves). */
export const SKIP_REFRESH = new HttpContextToken<boolean>(() => false);
