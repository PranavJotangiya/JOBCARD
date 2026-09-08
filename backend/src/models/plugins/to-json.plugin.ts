import type { Schema } from 'mongoose';

/**
 * Normalises documents when serialised to JSON for API responses:
 *  - `_id`  -> `id` (string)
 *  - drops `__v`
 *  - drops any field listed in `options.private` (e.g. `passwordHash`)
 *
 * Applied to every schema via `applyBaseSchema()` so the API never leaks
 * Mongoose internals or sensitive columns.
 */
export function toJSONPlugin(schema: Schema, options: { private?: string[] } = {}): void {
  const privateFields = new Set(options.private ?? []);

  const transform = (_doc: unknown, ret: Record<string, unknown>): Record<string, unknown> => {
    if (ret._id != null) {
      ret.id = String(ret._id);
    }
    delete ret._id;
    delete ret.__v;
    for (const field of privateFields) {
      delete ret[field];
    }
    return ret;
  };

  schema.set('toJSON', { virtuals: true, versionKey: false, transform });
  schema.set('toObject', { virtuals: true, versionKey: false });
}
