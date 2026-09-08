import type { Schema } from 'mongoose';
import { toJSONPlugin } from './to-json.plugin';
import { softDeletePlugin } from './soft-delete.plugin';

interface BaseSchemaOptions {
  /** Fields to strip from JSON output (e.g. `['passwordHash']`). */
  privateFields?: string[];
  /** Add the soft-delete lifecycle (isDeleted / deletedAt / deletedBy + query scoping). */
  softDelete?: boolean;
}

/**
 * Applies the conventions every domain schema in JOBCARD shares:
 *  - `timestamps` (createdAt / updatedAt)
 *  - consistent JSON serialisation (`_id` -> `id`, no `__v`, no private fields)
 *  - optional soft-delete lifecycle
 *
 * Audit *actor* fields (`createdBy` / `updatedBy`) are declared explicitly on each
 * schema because their `ref` and requiredness are domain decisions.
 */
export function applyBaseSchema(schema: Schema, options: BaseSchemaOptions = {}): void {
  schema.set('timestamps', true);
  schema.set('minimize', false);
  schema.set('optimisticConcurrency', true);

  if (options.softDelete) {
    softDeletePlugin(schema);
  }

  toJSONPlugin(schema, { private: options.privateFields });
}
