# JOBCARD

**Mobile-first garment job-work management** for **Manufacturers** and **Jobbers**.

A Manufacturer (e.g. _Yash Garment_) gives an order to a Jobber (e.g. _ABC Jeans
Workshop_) who runs the factory. The work is tracked as a **Job Card** through
fabric, sizes, bale/roll, cutting, work progress and dispatch.

```
MANUFACTURER  →  JOBBER  →  JOB CARD  →  WORK  →  COMPLETED  →  DISPATCHED
```

- 80–90% of usage is on phones inside factories — the UI is designed mobile-first
  (bottom navigation, large touch targets, sticky action bars, one-column forms)
  and progressively enhanced for tablet/desktop.
- **Real** end-to-end: Angular → REST API → Express → Mongoose → MongoDB Atlas.
  No mock APIs, no fake data.

---

## 1. Technology stack

| Layer     | Tech                                                                                |
| --------- | ---------------------------------------------------------------------------------- |
| Frontend  | Angular 22 (standalone, signals, lazy routes), TypeScript, Reactive Forms, SCSS   |
| Backend   | Node.js + Express + TypeScript, **modular monolith**                               |
| Data      | MongoDB Atlas + Mongoose                                                           |
| Auth      | JWT access/refresh in **HttpOnly cookies**, bcrypt, RBAC + ownership isolation     |
| PDF       | pdfkit (no headless browser)                                                       |
| Files     | Storage abstraction (local-disk driver; S3/GCS pluggable)                          |
| Tooling   | npm workspaces, ESLint, Prettier, Jest + supertest + mongodb-memory-server        |

## 2. Repository layout

```
JOBCARD/
├── backend/            Express + TypeScript API (modular monolith)
│   └── src/
│       ├── config/       env, database, cors
│       ├── constants/     roles/permissions, error codes, http status, cookies
│       ├── middleware/     auth, authorize, validate, error, rate-limit, logging
│       ├── models/plugins/ base schema, soft-delete, toJSON
│       └── modules/        auth · users · manufacturers · jobbers · jobcards ·
│                           dashboard · audit · files · health · shared
├── frontend/           Angular 22 application
│   └── src/app/
│       ├── core/          services, interceptors, guards, i18n, models
│       ├── shared/        reusable UI components + pipes
│       ├── layout/        app-shell (bottom nav / sidebar), auth-shell
│       ├── auth/ dashboard/ jobber/ manufacturer/ jobcards/ reports/ settings/
│       └── app.routes.ts  app.config.ts
├── docs/               architecture · database · api · business-flow · deployment
├── .gitignore  .env.example  package.json (workspaces)  README.md
```

See [docs/architecture.md](docs/architecture.md) for the full picture.

## 3. Prerequisites

- **Node.js ≥ 20** and npm ≥ 9
- A **MongoDB Atlas** connection string (free tier is fine) — or any MongoDB URI
- Git

## 4. Install

```bash
git clone https://github.com/PranavJotangiya/JOBCARD.git
cd JOBCARD
npm install            # installs root + backend + frontend (npm workspaces)
```

## 5. Environment variables

Copy the backend example and fill it in:

```bash
cp backend/.env.example backend/.env
```

Minimum required for local development:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/jobcard?retryWrites=true&w=majority
CLIENT_URL=http://localhost:4200
AUTH_SECRET=<a long random string>   # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server **validates env on boot and exits with a clear message** if anything
required is missing or weak. The frontend has no secrets; its API URL lives in
`frontend/src/environments/environment*.ts` (dev proxies `/api` → `:3000`).

## 6. Run — backend

```bash
npm run dev:backend       # tsx watch, http://localhost:3000/api/v1
# health check:
curl http://localhost:3000/api/v1/health
```

## 7. Run — frontend

```bash
npm run dev:frontend      # ng serve, http://localhost:4200  (proxies /api → :3000)
```

Or run both together:

```bash
npm run dev               # concurrently: API + WEB
```

## 8. Seed demo data (optional but recommended)

```bash
npm run seed
```

Creates an **Admin**, a linked **Manufacturer** user (`yash`) and **Jobber** user
(`abc`), the Manufacturer↔Jobber link, and two sample Job Cards. Credentials are
printed to the console (dev only — change them anywhere real).

First run without seeding: the app detects no Admin exists and routes you to
**`/setup`** to create the first Admin securely (disabled once an Admin exists).

## 9. MongoDB Atlas setup

1. Create a free cluster at <https://www.mongodb.com/cloud/atlas>.
2. **Database Access** → add a user with a password.
3. **Network Access** → allow your IP (or `0.0.0.0/0` for local dev only).
4. **Connect → Drivers** → copy the `mongodb+srv://…` string into
   `backend/.env` as `MONGODB_URI`. Keep `MONGODB_DB_NAME=jobcard`.

The backend opens a single pooled connection (`backend/src/config/database.ts`);
Angular never talks to MongoDB directly. `GET /api/v1/health` reports the live
connection state (active `ping`, not a cached flag) and returns **503** when the
database is unreachable.

## 10. API surface

Base path: **`/api/v1`**. Full reference in [docs/api.md](docs/api.md).

```
POST   /auth/setup            POST /auth/login   POST /auth/logout
GET    /auth/setup-status     GET  /auth/me      POST /auth/refresh

GET/POST            /manufacturers            GET /manufacturers/:id       (Jobber)
GET/POST            /jobbers                  GET /jobbers/:id             (Manufacturer)
GET/POST/PUT/DELETE /jobcards                 GET /jobcards/:id
POST /jobcards/:id/{ready|start|complete|cancel|dispatch|bring-back}
GET  /jobcards/:id/activity   GET /jobcards/:id/pdf
GET  /dashboard               (role-aware)
POST /files                   GET /files/:id/raw
GET/POST/PATCH /users         (Admin only)
GET  /health
```

Response contract:

```jsonc
{ "success": true, "data": { /* … */ } }
{ "success": true, "data": [ /* … */ ], "pagination": { "page":1,"limit":20,"total":100,"totalPages":5 } }
{ "success": false, "message": "Job Card not found", "code": "JOBCARD_NOT_FOUND" }
```

## 11. How the frontend talks to the backend

`ApiService` is the only HTTP entry point. It prefixes `environment.apiBaseUrl`,
unwraps the `{ success, data }` envelope, and lets four interceptors handle
cross-cutting concerns:

1. **credentials** — sends the auth cookies with every API call
2. **loading** — drives the global progress bar
3. **refresh** — on a 401, calls `/auth/refresh` once and replays the request(s)
4. **error** — normalises failures and shows a friendly toast (never a stack trace)

Guards (`authCanMatch`, `guestCanMatch`, `roleCanMatch`, `setupOnlyWhenRequired`)
gate routes; `AuthService.bootstrap()` restores the session before the first
render via `provideAppInitializer`.

## 12. How the backend talks to MongoDB

```
Route → authenticate → authorize(permission) → requireOwnershipScope
      → validate(zod) → Controller (thin) → Service (business logic + isolation)
      → Mongoose Model → MongoDB Atlas
```

**Data isolation is enforced server-side in the service layer.** Every Job Card
query is scoped by `ownershipFilter(actor)` (`{ jobberId }` for a Jobber,
`{ manufacturerId }` for a Manufacturer, `{}` for Admin). A client-supplied id is
never trusted as the authorization mechanism. The MANUFACTURER role is read-only
on Job Cards (view + PDF only) — enforced both by permissions and by the service.

## 13. Development workflow

```bash
npm run dev          # run API + web together
npm run lint         # eslint (backend + frontend)
npm run typecheck    # tsc --noEmit (backend + frontend, strict)
npm test             # backend Jest suite (unit + HTTP + isolation, in-memory Mongo)
npm run build        # backend tsc build + frontend production bundle
npm run format       # prettier --write
```

## 14. Git workflow

- `main` is the integration branch. Work on `feature/*` branches, open a PR.
- Never commit `.env`, `backend/uploads/`, `dist/`, or `node_modules/`
  (all in `.gitignore`).
- Keep the docs in `docs/` in sync with the implementation.

## 15. Future deployment (not done yet)

| Piece    | Target                                        |
| -------- | --------------------------------------------- |
| Frontend | **Firebase Hosting** (static `frontend/dist`) |
| Backend  | any Node-compatible host (Render/Railway/Fly/VM) — Firebase Hosting cannot run Express |
| Database | **MongoDB Atlas**                             |

Production configuration is entirely environment-based; localhost is never
assumed. Details and a checklist in [docs/deployment.md](docs/deployment.md).

## 16. Manual steps that still require you

1. Create a MongoDB Atlas cluster and put its URI in `backend/.env`.
2. Set a strong `AUTH_SECRET` in `backend/.env`.
3. Run `npm run seed` **or** open `/setup` once to create the first Admin.
4. (Deployment, later) provision a Node host + Firebase project and set the
   production env vars / `environment.production.ts` API URL.

Everything else runs out of the box.
