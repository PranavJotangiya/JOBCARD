# Database

MongoDB Atlas + Mongoose. Database name: `jobcard` (`MONGODB_DB_NAME`).

Shared conventions (applied by `models/plugins/base-schema.ts`):

- `timestamps: true` → `createdAt`, `updatedAt`
- `toJSON` transform → `_id` becomes `id` (string), `__v` and private fields dropped
- **soft delete** (opt-in) → `isDeleted`, `deletedAt`, `deletedBy`; the default
  query scope excludes soft-deleted docs unless `{ withDeleted: true }` is passed
- `optimisticConcurrency: true` (version-checked saves)
- audit actor fields `createdBy` / `updatedBy` (ObjectId → `User`)

---

## Collections

### `users`

| field            | type                     | notes                                             |
| ---------------- | ------------------------ | ------------------------------------------------- |
| `name`           | string                   | 2–120                                             |
| `username`       | string, **unique**       | lowercased, `^[a-z0-9._-]+$`, 3–40                |
| `passwordHash`   | string, `select:false`   | bcrypt (cost from `BCRYPT_SALT_ROUNDS`)           |
| `role`           | `ADMIN`\|`MANUFACTURER`\|`JOBBER` | indexed                                   |
| `manufacturerId` | ObjectId → `Manufacturer` \| null | set for MANUFACTURER users; indexed     |
| `jobberId`       | ObjectId → `Jobber` \| null | set for JOBBER users; indexed                  |
| `isActive`       | boolean (default true)   | indexed                                           |
| `tokenVersion`   | number                   | bump to revoke all refresh tokens                 |
| `lastLoginAt`    | Date \| null             |                                                  |
| + soft-delete, timestamps, audit fields |          |                                                  |

Indexes: `username` unique, `{ role, isActive }`.

### `manufacturers`

| field                | type                  | notes                                        |
| -------------------- | -------------------- | ------------------------------------------- |
| `name`               | string 2–160         |                                            |
| `nameKey`            | string, indexed       | normalised (lowercase, single-spaced) for find-or-create |
| `isActive`           | boolean               | indexed                                     |
| `linkedJobberIds`    | ObjectId[] → `Jobber` | Jobbers that added this Manufacturer        |
| + soft-delete, timestamps, audit fields |    |                                            |

Index: `{ linkedJobberIds, name }`. A Jobber only ever sees Manufacturers whose
`linkedJobberIds` contains their `jobberId`.

### `jobbers`

Mirror of `manufacturers`: `name`, `nameKey`, `isActive`,
`linkedManufacturerIds: ObjectId[] → Manufacturer`. Index
`{ linkedManufacturerIds, name }`. A Manufacturer only ever sees Jobbers whose
`linkedManufacturerIds` contains their `manufacturerId`.

The Manufacturer↔Jobber relationship is **many-to-many**, recorded on both sides;
"adding" from either side is idempotent (find-or-create by `nameKey` + `$addToSet`
both link arrays).

### `jobcards`

| field            | type                                             | notes                                     |
| ---------------- | ----------------------------------------------- | ---------------------------------------- |
| `jobCardNumber`  | string, **unique**, immutable                   | `JC-1001`, `JC-1002`, … (atomic counter) |
| `jobCardDate`    | Date (default now)                               |                                         |
| `manufacturerId` | ObjectId → `Manufacturer`, **required, immutable, indexed** | ownership                    |
| `jobberId`       | ObjectId → `Jobber`, **required, immutable, indexed**       | ownership                    |
| `shortNumber`, `shortName` | string                                |                                         |
| `programDate`, `cuttingDate` | Date \| null                        |                                         |
| `fabric`         | embedded `{ fabricType, color, description, pana, mtr, average, pcs }` | `pcs`/`average` cross-fill from `mtr` in `pre('validate')` |
| `sizes`          | embedded `[{ size, quantity }]`                  |                                         |
| `bales`          | embedded `[{ label, meters }]`                   |                                         |
| `cutting`        | embedded `{ pattern, markerLength, markerWidth, layLength, layers, plies, patternImageFileId }` | `patternImageFileId` → `FileAsset` (image bytes NOT in Mongo) |
| `notes`          | string ≤ 4000                                    | supports English / Hindi / Gujarati text |
| `workStatus`     | `DRAFT`\|`READY`\|`IN_PROGRESS`\|`COMPLETED`\|`CANCELLED` | indexed; default `DRAFT`        |
| `dispatchStatus` | `IN_FACTORY`\|`DISPATCHED`                       | indexed; default `IN_FACTORY` — **kept separate** from workStatus |
| `totals`         | `{ pieces, sizeCount, baleCount, baleMtr }`      | derived in `pre('validate')` — lists/dashboards never recompute |
| + soft-delete, timestamps, audit fields |                          |                                         |

Indexes (chosen for the real query patterns):

```
{ jobberId: 1, createdAt: -1 }
{ manufacturerId: 1, createdAt: -1 }
{ manufacturerId: 1, jobberId: 1, createdAt: -1 }   // Manufacturer → Jobber view
{ jobberId: 1, workStatus: 1, createdAt: -1 }
{ manufacturerId: 1, workStatus: 1, createdAt: -1 }
jobCardNumber: unique
```

### `audit_logs` (append-only — never soft-deleted, never mutated)

| field       | type                                            |
| ----------- | ---------------------------------------------- |
| `entityType`| `JobCard`\|`Manufacturer`\|`Jobber`\|`User` (indexed) |
| `entityId`  | ObjectId (indexed)                             |
| `action`    | `JOBCARD_CREATED`\|`JOBCARD_UPDATED`\|`WORK_READY`\|`WORK_STARTED`\|`WORK_COMPLETED`\|`WORK_CANCELLED`\|`DISPATCHED`\|`BROUGHT_BACK`\|`MANUFACTURER_LINKED`\|`JOBBER_LINKED` |
| `actorId`   | ObjectId → `User` \| null                      |
| `actorRole` | role \| null                                   |
| `actorName` | string                                         |
| `metadata`  | mixed (e.g. `{ jobCardNumber }`, `{ fields:[…] }`) |
| `createdAt` | Date (indexed)                                 |

Index: `{ entityType, entityId, createdAt: -1 }` — powers the Job Card Activity
timeline. Audit writes never break the business operation that triggered them.

### `file_assets`

Metadata only — the binary lives in the configured storage driver.

| field           | type                                  |
| --------------- | ------------------------------------ |
| `originalName`  | string                               |
| `storageKey`    | string (**never** sent to clients)   |
| `storageDriver` | string (`local`)                     |
| `mimeType`, `size` |                                   |
| `kind`          | `pattern-image`\|`other`             |
| `uploadedBy`, `uploadedByRole` |                      |
| `jobberId`, `manufacturerId` | ObjectId \| null — file inherits Job Card isolation |
| timestamps      |                                      |

### `counters`

`{ _id: 'jobcard', seq: <n> }` — atomic named sequence (`$inc` + `upsert`) for
gap-tolerant `JC-####` numbers, safe under concurrent creation.

---

## Pagination / filtering / sorting

List endpoints accept `?page&limit&search&sortBy&sortOrder` plus domain filters
(`bucket`, `workStatus`, `dispatchStatus`, `manufacturerId`, `jobberId`,
`dateFrom`, `dateTo`). `limit` is clamped to `[1, 100]`; `sortBy` must be in a
per-domain whitelist. All of it runs server-side — the browser never loads large
arrays.

## Soft delete

Job Cards, Users, Manufacturers, Jobbers use soft delete. Audit history is never
deleted. Hard `deleteOne`/`deleteMany` remain available for true erasure but
application code calls `doc.softDelete(actorId)`.
