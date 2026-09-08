/**
 * Production environment.
 *
 * `apiBaseUrl` MUST be set at build/deploy time to the real backend origin
 * (e.g. https://api.jobcard.example.com/api/v1). It defaults to a same-origin
 * relative path so a misconfigured deploy fails loudly instead of silently
 * talking to localhost.
 */
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
  appName: 'JOBCARD',
  storagePrefix: 'jobcard.',
  defaultPageSize: 20,
  toastTimeoutMs: 4000,
};
