/**
 * Production environment.
 *
 * `apiBaseUrl` is the FULL origin of the deployed API (the backend runs on
 * Render — a different origin than Firebase Hosting). CI overwrites this line
 * from the `API_BASE_URL` secret via `frontend/scripts/set-api-url.mjs` right
 * before `ng build`; the value below is only the committed default.
 */
export const environment = {
  production: true,
  apiBaseUrl: 'https://jobcard-api.onrender.com/api/v1',
  appName: 'JOBCARD',
  storagePrefix: 'jobcard.',
  defaultPageSize: 20,
  toastTimeoutMs: 4000,
};
