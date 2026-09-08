# Architecture

## 1. System shape

```
        Mobile / Tablet / Desktop (one responsive Angular app)
                              │  HTTPS
                              ▼
                     Node.js + Express (REST /api/v1)
        ┌───────────────┬───────────────┬───────────────────────┐
        │  Middleware   │   Modules     │   Cross-cutting        │
        │  auth         │  auth         │   config (env/db/cors) │
        │  authorize    │  users        │   utils (jwt/pwd/log)  │
        │  validate     │  manufacturers│   error contract       │
        │  rate-limit   │  jobbers      │   audit log            │
        │  requestLog   │  jobcards     │   file storage         │
        │  errorHandler │  dashboard    │                       │
        │  notFound     │  audit/files  │                       │
        └───────────────┴───────┬───────┴───────────────────────┘
                                ▼
                            Mongoose
                                ▼
                          MongoDB Atlas
```

The backend is a **modular monolith**: one deployable process, one database, but
code organised by business domain under `src/modules/<name>/` with its own
`routes / controller / service / model / validation`. Adding a domain =
adding a folder + one `apiRouter.use()` line in `src/routes.ts`. No microservices,
no message queues, no Docker/K8s — those can be added later only if genuinely
needed; the target is "scale vertically → scale horizontally → extract a service
only if required".

## 2. Request flow

```
HTTP request
  → route (src/modules/<x>/<x>.routes.ts)
  → authenticate            verify access token (cookie or Bearer), load user
  → authorize(permission)   role → permission check (constants/roles.ts)
  → requireOwnershipScope   caller must have a jobberId / manufacturerId
  → validate({ body, query, params })   zod; parsed values written back
  → controller (thin)       parse request, call one service method, ApiResponse
  → service                 business rules + DATA ISOLATION + persistence
  → Mongoose model
  → MongoDB
  → ApiResponse.ok/created/list  →  { success, data[, pagination] }
```

Errors never build responses by hand — everything throws `ApiError` (or a
Mongoose/zod/multer error) and the single `errorHandler` middleware normalises it
to `{ success:false, message, code }`. Production responses omit stack traces and
internal detail; development responses include them.

## 3. Layers & responsibilities

| Layer          | Responsibility                                                             | Must NOT do                              |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| **routes**     | declare endpoints + the middleware chain                                  | contain logic                          |
| **controller** | HTTP glue: read validated input, call one service, shape the response     | contain business rules or DB queries   |
| **service**    | business logic, status workflow, **ownership scoping**, audit, transactions | know about `req`/`res`                  |
| **model**      | Mongoose schema, indexes, derived fields (`pre('validate')`), plugins     | cross-domain orchestration             |
| **validation** | zod schemas — the backend is the final authority on shape                 | trust the client                       |

## 4. Security model

Two independent checks on every protected route, plus a business layer:

1. **Authentication** — `authenticate` verifies the JWT (HttpOnly `jc_access`
   cookie, or `Authorization: Bearer` for non-browser clients) and re-loads the
   user from the DB so a disabled/deleted account can't keep a valid token.
2. **Authorization (RBAC)** — `authorize(Permission.X)` maps the caller's role to
   a permission set (`constants/roles.ts`). Roles: `ADMIN`, `MANUFACTURER`
   (read-only on Job Cards), `JOBBER`.
3. **Ownership / data isolation** — enforced in the **service** by folding
   `ownershipFilter(actor)` into every query:
   - JOBBER → `{ jobberId: actor.jobberId }`
   - MANUFACTURER → `{ manufacturerId: actor.manufacturerId }`
   - ADMIN → `{}`
   A `manufacturerId`/`jobberId` in the request body or query is only honoured
   for ADMIN. Aggregations use an ObjectId-cast variant (`$match` doesn't
   auto-cast).

Other hardening: Helmet, CORS allow-list with credentials, `express-rate-limit`
(stricter on `/auth/*`), JSON/urlencoded body size limits, multer file-size
limit, bcrypt (cost 12), `tokenVersion` for server-side refresh-token
revocation, structured logging with sensitive-field redaction
(`password`, `pin`, `token`, `MONGODB_URI`, `authorization`, …).

## 5. Frontend architecture

Feature-based, standalone components, lazy routes.

```
core/     infrastructure — never feature-specific
  services/     ApiService (only HTTP entry), AuthService (signals), Loading, Notification
  interceptors/ credentials · loading · refresh(401) · error(normalise+toast)
  guards/       auth · guest · role · setup
  i18n/         TranslationService (signal) + en/hi/gu + `t` pipe
  models/       API + domain interfaces (mirror the backend)
shared/    reusable, presentational — StatusBadge, JobCardCard, ContactCard,
           SearchBar, FilterChips, SectionCard, BottomSheet, StickyActionBar,
           ConfirmDialog, Toasts, EmptyState, LoadingSkeleton, SummaryStat, …
layout/    AppShell (mobile bottom-nav ↔ desktop sidebar + "More" sheet), AuthShell
features   auth · dashboard (role-aware) · jobber (Manufacturer contacts) ·
           manufacturer (Jobber contacts + detail) · jobcards (list/create/edit/
           detail + form sections + status actions + activity) · reports · settings
```

State is signals throughout; RxJS is used only at the HTTP boundary. List screens
keep search/filter/page in the URL query string (shareable, restores on refresh).
`provideAppInitializer` blocks the first render until `AuthService.bootstrap()`
(a quiet `GET /auth/me`) resolves, so guards never see an undecided session.

## 6. Mobile-first decisions

- Bottom navigation, max 4 items; the rest in a "More" bottom sheet.
- 44–48px minimum touch targets; 16px inputs (no iOS zoom); `inputmode` hints.
- One-column forms; two columns only ≥ 560px.
- Size-quantity and bale editors are large touch rows on phones, a grid ≥ 768px —
  never a cramped desktop table on mobile.
- Sticky bottom action bars respect `env(safe-area-inset-bottom)`; pages add
  matching bottom padding so nothing is covered.
- Bottom sheets / full-screen modals on phones, centred cards ≥ 640px.
- Skeleton loaders, explicit empty/error states, retained form input on failure.

## 7. Extensibility

Adding a domain (e.g. `payments`):

1. `backend/src/modules/payments/` with `payment.model.ts`, `payment.service.ts`
   (scope every query with the same `ownershipFilter` pattern),
   `payment.controller.ts`, `payment.routes.ts`, `payment.validation.ts`.
2. One line in `backend/src/routes.ts`: `apiRouter.use('/payments', paymentRoutes)`.
3. Frontend: `frontend/src/app/payments/` with a lazy `payments.routes.ts`, one
   entry in `app.routes.ts`, and a nav item in `AppShell` if user-facing.

A breaking API change gets a `v2` router alongside `v1`, not a mutation of `v1`.
