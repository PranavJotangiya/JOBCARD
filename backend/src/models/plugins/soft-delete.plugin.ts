import {
  Schema,
  type Aggregate,
  type CallbackWithoutResultAndOptionalError,
  type Query,
  type Types,
} from 'mongoose';

/**
 * Adds a soft-delete lifecycle to a schema:
 *  - fields: `isDeleted`, `deletedAt`, `deletedBy`
 *  - default query scope excludes soft-deleted documents (`find`, `findOne`,
 *    `count*`, `*update*` and aggregation) unless `{ withDeleted: true }` is
 *    passed as a query option
 *  - instance methods `softDelete(userId?)` and `restore()`
 *
 * Hard deletes remain available via `deleteOne` / `deleteMany` for permanent
 * erasure, but application code should prefer `softDelete()`.
 */
export interface SoftDeleteFields {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
}

type NextFn = CallbackWithoutResultAndOptionalError;

// One RegExp instead of a union of literals keeps Mongoose's `pre()` overload
// resolution unambiguous and covers every read/update query operation.
const SCOPED_QUERY_OPS =
  /^(count|countDocuments|find|findOne|findOneAndUpdate|findOneAndReplace|updateOne|updateMany)$/;

export function softDeletePlugin(schema: Schema): void {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  });

  schema.pre(SCOPED_QUERY_OPS, function (this: Query<unknown, unknown>, next: NextFn) {
    const options = this.getOptions() as { withDeleted?: boolean };
    if (!options.withDeleted) {
      const filter = this.getFilter();
      if (filter.isDeleted === undefined) {
        void this.where({ isDeleted: { $ne: true } });
      }
    }
    next();
  });

  schema.pre('aggregate', function (this: Aggregate<unknown[]>, next: NextFn) {
    const options = this.options as { withDeleted?: boolean };
    if (!options?.withDeleted) {
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
    next();
  });

  schema.methods.softDelete = function (userId?: Types.ObjectId | string) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId ?? null;
    return this.save();
  };

  schema.methods.restore = function () {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
}
