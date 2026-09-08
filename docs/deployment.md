# Deployment

> Not performed yet — the codebase is structured so this can be added cleanly.
> Frontend and backend deploy **separately**.

```
Angular  ──build──►  frontend/dist/frontend  ──►  Firebase Hosting (static)
Express  ──build──►  backend/dist            ──►  Node-compatible host (Render / Railway / Fly / VM)
MongoDB                                       ──►  MongoDB Atlas
```

Firebase Hosting serves **static files only** — it cannot run the Express server.
The API needs a real Node host.

---

## Backend

### Build & run

```bash
npm --workspace backend run build     # tsc → backend/dist
node backend/dist/server.js           # or: npm --workspace backend start
```

Node ≥ 20. The process validates env on boot and exits non-zero with a clear
message if anything required is missing or weak.

### Production environment (`backend/.env` or host config)

```env
NODE_ENV=production
PORT=8080                       # or whatever the host provides
API_PREFIX=/api/v1
MONGODB_URI=mongodb+srv://…/jobcard?retryWrites=true&w=majority
MONGODB_DB_NAME=jobcard
CLIENT_URL=https://your-frontend-domain            # exact origin(s), comma-separated
AUTH_SECRET=<48+ random bytes hex>                 # required; weak values are rejected in prod
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
BCRYPT_SALT_ROUNDS=12
COOKIE_SECURE=true                                 # required in prod (HTTPS)
COOKIE_SAMESITE=lax                                # use "none" only if API and web are cross-site
COOKIE_DOMAIN=.your-domain.com                     # optional, to share cookies across subdomains
STORAGE_DRIVER=local
STORAGE_LOCAL_DIR=/var/data/jobcard-uploads        # a persistent volume
MAX_UPLOAD_MB=8
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
REQUEST_BODY_LIMIT=1mb
```

Notes:

- `app.set('trust proxy', 1)` is enabled in production so client IPs / HTTPS
  detection are correct behind the host's load balancer.
- **File storage**: the `local` driver needs a persistent disk. On ephemeral
  hosts, add an `s3` (or `gcs`) implementation of `StorageProvider` in
  `backend/src/modules/files/storage/` and set `STORAGE_DRIVER` — nothing else
  changes.
- Health check for the platform: `GET /api/v1/health` (200 healthy / 503 DB down).
- First run in prod: open `/setup` once (or seed) to create the Admin. **Never
  ship default credentials.**

### Example: Render / Railway

- Build command: `npm ci && npm --workspace backend run build`
- Start command: `node backend/dist/server.js`
- Add the env vars above; point `CLIENT_URL` at the Firebase Hosting URL.
- Attach a persistent disk mounted at `STORAGE_LOCAL_DIR` (or switch to S3).

---

## Frontend

### Set the production API URL

`frontend/src/environments/environment.production.ts` defaults `apiBaseUrl` to
the same-origin relative `/api/v1` so a misconfigured deploy fails loudly. Set it
to your API origin:

```ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://your-api-domain/api/v1',
  // …
};
```

If the API is on a **different site** than the web app, also set
`COOKIE_SAMESITE=none` (and `COOKIE_SECURE=true`) on the backend, and keep the
backend `CLIENT_URL` exactly equal to the web origin.

### Build & deploy to Firebase Hosting

```bash
npm --workspace frontend run build          # → frontend/dist/frontend/browser

npm i -g firebase-tools
firebase login
firebase init hosting        # public dir: frontend/dist/frontend/browser ; SPA rewrite: yes
firebase deploy --only hosting
```

`firebase.json` for an Angular SPA:

```json
{
  "hosting": {
    "public": "frontend/dist/frontend/browser",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }],
    "headers": [
      { "source": "**/*.@(js|css|woff2)", "headers": [{ "key": "Cache-Control", "value": "public,max-age=31536000,immutable" }] }
    ]
  }
}
```

Optionally proxy `/api/**` to the backend via a Firebase rewrite to a Cloud Run
service, so the web app can keep the same-origin `/api/v1` URL.

---

## PWA (future)

The app is PWA-ready in shape (mobile viewport, theme-color, app-capable meta,
lazy chunks, server-side pagination). To enable installability later:
`ng add @angular/pwa`, then deploy the generated `ngsw-config.json` /
`manifest.webmanifest` with the static bundle. Do not add offline write support
unless a concrete requirement calls for it.

---

## Pre-deploy checklist

- [ ] `npm run lint && npm run typecheck && npm test && npm run build` all green
- [ ] `AUTH_SECRET` is 48+ random bytes; `COOKIE_SECURE=true`
- [ ] `MONGODB_URI` points at the production cluster; Atlas Network Access set
- [ ] `CLIENT_URL` == the exact deployed web origin(s)
- [ ] `environment.production.ts` `apiBaseUrl` == the deployed API origin
- [ ] Persistent volume for uploads (or S3 driver) configured
- [ ] First Admin created via `/setup`; demo/seed accounts removed
- [ ] `GET /api/v1/health` returns 200 from the platform's checker
