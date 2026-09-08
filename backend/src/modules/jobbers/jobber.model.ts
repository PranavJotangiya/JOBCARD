import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { applyBaseSchema } from '../../models/plugins/base-schema';
import type { SoftDeleteFields } from '../../models/plugins/soft-delete.plugin';

/**
 * A Jobber master record (e.g. "ABC Jeans Workshop").
 *
 * `linkedManufacturerIds` is the set of Manufacturers that have added this Jobber
 * to their contacts — a Manufacturer only ever sees Jobbers where their own
 * `manufacturerId` appears here.
 */
export interface IJobber extends SoftDeleteFields {
  name: string;
  nameKey: string;
  isActive: boolean;
  linkedManufacturerIds: Types.ObjectId[];
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobberMethods {
  softDelete(userId?: Types.ObjectId | string): Promise<JobberDocument>;
  restore(): Promise<JobberDocument>;
}

export type JobberDocument = HydratedDocument<IJobber, IJobberMethods>;
export type JobberModel = Model<IJobber, Record<string, never>, IJobberMethods>;

const jobberSchema = new Schema<IJobber, JobberModel, IJobberMethods>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 160 },
    nameKey: { type: String, required: true, lowercase: true, trim: true, index: true },
    isActive: { type: Boolean, default: true, index: true },
    linkedManufacturerIds: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Manufacturer' }],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'jobbers' },
);

applyBaseSchema(jobberSchema, { softDelete: true });

jobberSchema.index({ linkedManufacturerIds: 1, name: 1 });

export const Jobber = model<IJobber, JobberModel>('Jobber', jobberSchema);
