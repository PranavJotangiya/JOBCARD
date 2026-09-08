# API reference

Base URL: `http://localhost:3000/api/v1` (dev). All paths below are relative to it.

## Conventions

- **Auth**: browser clients use HttpOnly cookies (`jc_access`, `jc_refresh`) set
  by `/auth/login` and `/auth/setup`. Non-browser clients may send
  `Authorization: Bearer <accessToken>`. On a 401 the frontend calls
  `/auth/refresh` once and retries.
- **Success**: `{ "success": true, "data": <payload> }`
- **List**: `{ "success": true, "data": [...], "pagination": { page, limit, total, totalPages, hasNextPage, hasPrevPage } }`
- **Error**: `{ "success": false, "message": "...", "code": "MACHINE_CODE", "details"?: ... }`
  (dev also includes `stack`). Common codes: `AUTH_REQUIRED`, `AUTH_INVALID_CREDENTIALS`,
  `INSUFFICIENT_PERMISSIONS`, `READ_ONLY_ROLE`, `OWNERSHIP_VIOLATION`,
  `VALIDATION_ERROR`, `JOBCARD_NOT_FOUND`, `RELATIONSHIP_NOT_FOUND`,
  `INVALID_STATUS_TRANSITION`, `SETUP_ALREADY_COMPLETED`, `RATE_LIMITED`.
- **Query (lists)**: `?page=1&limit=20&search=&sortBy=&sortOrder=asc|desc`.

---

## Health

### `GET /health` — public

Performs an active MongoDB `ping`. `200` when healthy, **`503`** when the DB is
unreachable.

```json
{
  "success": true,
  "message": "JOBCARD API is healthy",
  "status": "ok",
  "timestamp": "2026-09-08T18:00:00.000Z",
  "uptimeSeconds": 42,
  "version": "0.1.0",
  "database": { "connected": true, "status": "connected", "readyState": 1, "pingOk": true }
}
```

---

## Auth

### `GET /auth/setup-status` — public

`{ "success": true, "data": { "setupRequired": true } }` — `true` while no Admin
exists.

### `POST /auth/setup` — public, one-time

Body: `{ "name", "username", "password" }` (password: ≥8, mixed case + digit).
`201` + sets auth cookies + `{ "data": { "user": {...} } }`. Returns **`409
SETUP_ALREADY_COMPLETED`** once an Admin exists. Rate-limited.

### `POST /auth/login` — public

Body: `{ "username", "password" }`. `200` + auth cookies +
`{ "data": { "user": { id, name, username, role, manufacturerId, jobberId } } }`.
Rate-limited (brute-force guard).

### `POST /auth/refresh` — public (reads `jc_refresh` cookie)

Rotates the token pair, re-sets cookies. `401 AUTH_REFRESH_INVALID` if the
refresh token is missing/revoked/expired.

### `POST /auth/logout`

Bumps `tokenVersion` (revokes refresh tokens) and clears cookies.

### `GET /auth/me` — authenticated

`{ "data": { "user": { …, manufacturerName, jobberName, lastLoginAt } } }`.

---

## Manufacturers — a Jobber's contacts (`JOBBER`, or `ADMIN`)

### `POST /manufacturers`

Body: `{ "name": "Yash Garment" }`. Idempotent (find-or-create by normalised
name, links to the caller's Jobber). `201` → `{ "data": { "manufacturer": {...} } }`.

### `GET /manufacturers`

List, scoped to the caller's Jobber. `?search` supported.

### `GET /manufacturers/:id`

Scoped; `404 MANUFACTURER_NOT_FOUND` if not linked to the caller.

---

## Jobbers — a Manufacturer's contacts (`MANUFACTURER`, or `ADMIN`)

### `POST /jobbers`  — body `{ "name": "ABC Jeans Workshop" }` (idempotent)

### `GET /jobbers` — list, scoped to the caller's Manufacturer, `?search`

### `GET /jobbers/:id`

`{ "data": { "jobber": {...}, "stats": { total, pending, inProgress, completed, dispatched, cancelled } } }`
— stats are for **this Manufacturer + this Jobber** pair only.

---

## Job Cards

All routes: `authenticate → authorize → requireOwnershipScope → validate`.
Reads are visible to the owning Jobber, the owning Manufacturer, and Admin.
**Writes and status actions are Jobber-only** (`READ_ONLY_ROLE` / `403` otherwise).

### `POST /jobcards` — `JOBCARD_CREATE` (Jobber)

Body (all except `manufacturerId` optional):

```jsonc
{
  "manufacturerId": "665f…",          // must be one of your Manufacturers
  "jobCardDate": "2026-09-08T00:00:00.000Z",
  "shortNumber": "S-101", "shortName": "Blue Denim",
  "programDate": null, "cuttingDate": null,
  "fabric": { "fabricType": "Denim", "color": "Indigo", "pana": 58, "mtr": 1200, "average": 1.2 },
  "sizes":  [ { "size": "32", "quantity": 700 }, { "size": "34", "quantity": 900 } ],
  "bales":  [ { "label": "Bale 01", "meters": 620 } ],
  "cutting":{ "pattern": "5-pocket", "layers": 60, "plies": 1, "patternImageFileId": "665f…" },
  "notes":  "2 set cutting required"
}
```

`201` → `{ "data": { "jobCard": <JobCardDTO> } }`. `jobCardNumber` auto-assigned
(`JC-1001`…); `totals` derived server-side. Unknown fields rejected
(`VALIDATION_ERROR`). Wrong/unlinked `manufacturerId` → `RELATIONSHIP_NOT_FOUND`.

### `GET /jobcards`

List, scoped. Filters: `bucket=all|pending|in_progress|completed|dispatched`,
`workStatus`, `dispatchStatus`, `manufacturerId`/`jobberId` (Admin only),
`dateFrom`, `dateTo`, `search`, `sortBy`, `sortOrder`, `page`, `limit`.

### `GET /jobcards/:id` → `{ "data": { "jobCard": <JobCardDTO> } }`

`JobCardDTO` includes `manufacturer:{id,name}`, `jobber:{id,name}`, embedded
`fabric/sizes/bales/cutting` (with `cutting.patternImageUrl`), `totals`,
`workStatus`, `dispatchStatus`, timestamps.

### `PUT /jobcards/:id` — `JOBCARD_UPDATE` (Jobber, owner)

Partial body (no `manufacturerId` — immutable). A `CANCELLED` card can't be
edited.

### `DELETE /jobcards/:id` — `JOBCARD_DELETE` (Jobber, owner) — **soft delete**

### Status actions — `JOBCARD_STATUS` (Jobber, owner)

Backend-controlled transitions. Optional body `{ "note": "…" }`.
Invalid transition → `400 INVALID_STATUS_TRANSITION`.

| Endpoint                       | From (workStatus)               | Effect                        |
| ------------------------------ | ------------------------------- | --------------------------- |
| `POST /jobcards/:id/ready`     | DRAFT                           | → READY                     |
| `POST /jobcards/:id/start`     | DRAFT, READY                    | → IN_PROGRESS               |
| `POST /jobcards/:id/complete`  | IN_PROGRESS                     | → COMPLETED                 |
| `POST /jobcards/:id/cancel`    | DRAFT, READY, IN_PROGRESS       | → CANCELLED                 |
| `POST /jobcards/:id/dispatch`  | dispatchStatus IN_FACTORY **and** workStatus COMPLETED | → DISPATCHED |
| `POST /jobcards/:id/bring-back`| dispatchStatus DISPATCHED       | → IN_FACTORY                |

Each returns `{ "data": { "jobCard": <JobCardDTO> } }` and writes an audit entry.

### `GET /jobcards/:id/activity` — `JOBCARD_READ`

`{ "data": { "activity": [ { id, action, actorName, actorRole, metadata, createdAt } ] } }`
newest first.

### `GET /jobcards/:id/pdf` — `JOBCARD_EXPORT` (Manufacturer allowed)

`200`, `Content-Type: application/pdf` — a print-friendly A4 Job Card.

---

## Dashboard

### `GET /dashboard` — `DASHBOARD_VIEW`, role-aware

- **JOBBER**: `{ role, greetingName, summary, recent:[JobCardDTO], manufacturers:[{ id, name, stats }] }`
- **MANUFACTURER**: `{ role, greetingName, summary, jobbers:[{ id, name, stats }] }`
- **ADMIN**: `{ role, greetingName, summary, recent:[JobCardDTO] }`

`summary` = `{ total, pending, inProgress, completed, dispatched, cancelled }`
(one aggregation, scoped).

---

## Files

### `POST /files` — `JOBCARD_CREATE` (Jobber) — `multipart/form-data`, field `file`

JPG/PNG/WEBP/HEIC, ≤ `MAX_UPLOAD_MB`. `201` →
`{ "data": { "file": { id, originalName, mimeType, size, kind, … } } }`
(never `storageKey`). Bytes go to the storage driver, not MongoDB.

### `GET /files/:id` — metadata · `GET /files/:id/raw` — the bytes

Both enforce the same isolation as Job Cards (owner Jobber, linked Manufacturer,
or Admin).

---

## Users — Admin only (`USER_MANAGE`)

### `POST /users`

```jsonc
{ "name", "username", "password", "role": "JOBBER",
  "jobberName": "ABC Jeans Workshop" }   // or "manufacturerName" for MANUFACTURER
```

Creates the user and finds-or-creates + links the Manufacturer/Jobber master
record. `201` → `{ "data": { "user": {...} } }`.

### `GET /users` — list (`?role`, `?search`) · `PATCH /users/:id` — `{ name?, password?, isActive? }`
