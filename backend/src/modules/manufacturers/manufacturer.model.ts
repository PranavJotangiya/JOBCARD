import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { applyBaseSchema } from '../../models/plugins/base-schema';
import type { SoftDeleteFields } from '../../models/plugins/soft-delete.plugin';

/**
 * A Manufacturer master record (e.g. "Yash Garment").
 *
 * The Manufacturer↔Jobber relationship is many-to-many and is recorded on both
 * sides via link arrays. `linkedJobberIds` is the set of Jobbers that have added
 * this Manufacturer to their contacts — a Jobber only ever sees Manufacturers
 * where their own `jobberId` appears here.
 */
export interface IManufacturer extends SoftDeleteFields {
  name: string;
  /** lower-cased, trimmed — used for case-insensitive find-or-create */
  nameKey: string;
  isActive: boolean;
  linkedJobberIds: Types.ObjectId[];
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IManufacturerMethods {
  softDelete(userId?: Types.ObjectId | string): Promise<ManufacturerDocument>;
  restore(): Promise<ManufacturerDocument>;
}

export type ManufacturerDocument = HydratedDocument<IManufacturer, IManufacturerMethods>;
export type ManufacturerModel = Model<IManufacturer, Record<string, never>, IManufacturerMethods>;

const manufacturerSchema = new Schema<IManufacturer, ManufacturerModel, IManufacturerMethods>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    nameKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    linkedJobberIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Jobber' }], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'manufacturers' },
);

applyBaseSchema(manufacturerSchema, { softDelete: true });

manufacturerSchema.index({ linkedJobberIds: 1, name: 1 });

export const Manufacturer = model<IManufacturer, ManufacturerModel>(
  'Manufacturer',
  manufacturerSchema,
);
