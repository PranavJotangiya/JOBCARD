/**
 * Rewrites `apiBaseUrl` in environment.production.ts from the `API_BASE_URL`
 * env var. Run in CI right before `ng build` so the deployed app points at the
 * real API. If `API_BASE_URL` is unset, the committed default is kept.
 *
 *   API_BASE_URL=https://jobcard-api.onrender.com/api/v1 node scripts/set-api-url.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const url = (process.env.API_BASE_URL || '').trim().replace(/\/+$/, '');
const file = fileURLToPath(new URL('../src/environments/environment.production.ts', import.meta.url));

if (!url) {
  console.log('[set-api-url] API_BASE_URL not set — keeping committed default.');
  process.exit(0);
}
if (!/^https?:\/\/.+\/api\/v1$/.test(url)) {
  console.error(`[set-api-url] API_BASE_URL must look like https://host/api/v1 (got: ${url})`);
  process.exit(1);
}

const src = readFileSync(file, 'utf8');
const pattern = /apiBaseUrl:\s*'[^']*'/;
if (!pattern.test(src)) {
  console.error('[set-api-url] could not find the apiBaseUrl line to replace.');
  process.exit(1);
}

writeFileSync(file, src.replace(pattern, `apiBaseUrl: '${url}'`));
console.log(`[set-api-url] production apiBaseUrl = ${url}`);
