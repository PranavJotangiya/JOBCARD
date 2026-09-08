/**
 * Development environment.
 *
 * The Angular CLI swaps this for `environment.production.ts` in production builds
 * (see `fileReplacements` in angular.json). No API URL is ever hardcoded in a
 * service — everything reads from here.
 */
export const environment = {
  production: false,
  /**
   * Base URL for every backend call (see ApiService).
   * `ng serve` proxies `/api` -> http://localhost:3000 (see proxy.conf.json), so
   * dev runs same-origin — no CORS, and cookies "just work".
   */
  apiBaseUrl: '/api/v1',
  appName: 'JOBCARD',
  /** localStorage key prefix for per-device preferences (language, last tab…). */
  storagePrefix: 'jobcard.',
  defaultPageSize: 20,
  toastTimeoutMs: 4000,
};
