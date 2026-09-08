import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { applyBaseSchema } from '../../models/plugins/base-schema';
import { nextSequence } from '../shared/counter.model';
import {
  DispatchStatus,
  WorkStatus,
  type DispatchStatusValue,
  type WorkStatusValue,
} from './jobcard.constants';
import type { SoftDeleteFields } from '../../models/plugins/soft-delete.plugin';

/**
 * The Job Card — the artefact that establishes a Manufacturer↔Jobber working
 * relationship and carries all production detail.
 *
 * Ownership: `manufacturerId` + `jobberId` are set at creation from the
 * authenticated Jobber's scope and the selected Manufacturer, and are immutable.
 * Every read/write is scoped to one of them (see jobcard.service).
 *
 * Sub-documents (fabric / sizes / bales / cutting) are embedded because they are
 * always loaded and edited together with the card. `totals` is derived by a
 * pre-validate hook so lists and dashboards never recompute it.
 */
export interface FabricDetails {
  fabricType?: string;
  color?: string;
  description?: string;
  pana?: number;
  mtr?: number;
  average?: number;
  pcs?: number;
}

export interface SizeQuantity {
  size: string;
  quantity: number;
}

export interface BaleRoll {
  label: string;
  meters: number;
}

export interface CuttingDetails {
  pattern?: string;
  markerLength?: number;
  markerWidth?: number;
  layLength?: number;
  layers?: number;
  plies?: number;
  /** FileAsset id (see files module) — the binary is NOT stored in Mongo. */
  patternImageFileId?: Types.ObjectId | null;
}

export interface JobCardTotals {
  pieces: number;
  sizeCount: number;
  baleCount: number;
  baleMtr: number;
}

export interface IJobCard extends SoftDeleteFields {
  jobCardNumber: string;
  jobCardDate: Date;

  manufacturerId: Types.ObjectId;
  jobberId: Types.ObjectId;

  shortNumber?: string;
  shortName?: string;
  programDate?: Date | null;
  cuttingDate?: Date | null;

  fabric: FabricDetails;
  sizes: SizeQuantity[];
  bales: BaleRoll[];
  cutting: CuttingDetails;
  notes?: string;

  workStatus: WorkStatusValue;
  dispatchStatus: DispatchStatusValue;

  totals: JobCardTotals;

  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJobCardMethods {
  softDelete(userId?: Types.ObjectId | string): Promise<JobCardDocument>;
  restore(): Promise<JobCardDocument>;
}

export type JobCardDocument = HydratedDocument<IJobCard, IJobCardMethods>;
export type JobCardModel = Model<IJobCard, Record<string, never>, IJobCardMethods>;

const fabricSchema = new Schema<FabricDetails>(
  {
    fabricType: { type: String, trim: true, maxlength: 120 },
    color: { type: String, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 500 },
    pana: { type: Number, min: 0 },
    mtr: { type: Number, min: 0 },
    average: { type: Number, min: 0 },
    pcs: { type: Number, min: 0 },
  },
  { _id: false },
);

const sizeSchema = new Schema<SizeQuantity>(
  {
    size: { type: String, required: true, trim: true, maxlength: 20 },
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const baleSchema = new Schema<BaleRoll>(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    meters: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const cuttingSchema = new Schema<CuttingDetails>(
  {
    pattern: { type: String, trim: true, maxlength: 120 },
    markerLength: { type: Number, min: 0 },
    markerWidth: { type: Number, min: 0 },
    layLength: { type: Number, min: 0 },
    layers: { type: Number, min: 0 },
    plies: { type: Number, min: 0 },
    patternImageFileId: { type: Schema.Types.ObjectId, ref: 'FileAsset', default: null },
  },
  { _id: false },
);

const jobCardSchema = new Schema<IJobCard, JobCardModel, IJobCardMethods>(
  {
    jobCardNumber: { type: String, unique: true, index: true, immutable: true },
    jobCardDate: { type: Date, required: true, default: () => new Date() },

    manufacturerId: {
      type: Schema.Types.ObjectId,
      ref: 'Manufacturer',
      required: true,
      immutable: true,
      index: true,
    },
    jobberId: {
      type: Schema.Types.ObjectId,
      ref: 'Jobber',
      required: true,
      immutable: true,
      index: true,
    },

    shortNumber: { type: String, trim: true, maxlength: 40 },
    shortName: { type: String, trim: true, maxlength: 120 },
    programDate: { type: Date, default: null },
    cuttingDate: { type: Date, default: null },

    fabric: { type: fabricSchema, default: () => ({}) },
    sizes: { type: [sizeSchema], default: [] },
    bales: { type: [baleSchema], default: [] },
    cutting: { type: cuttingSchema, default: () => ({}) },
    notes: { type: String, trim: true, maxlength: 4000 },

    workStatus: {
      type: String,
      enum: Object.values(WorkStatus),
      default: WorkStatus.DRAFT,
      index: true,
    },
    dispatchStatus: {
      type: String,
      enum: Object.values(DispatchStatus),
      default: DispatchStatus.IN_FACTORY,
      index: true,
    },

    totals: {
      pieces: { type: Number, default: 0 },
      sizeCount: { type: Number, default: 0 },
      baleCount: { type: Number, default: 0 },
      baleMtr: { type: Number, default: 0 },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'jobcards' },
);

applyBaseSchema(jobCardSchema, { softDelete: true });

// Real query patterns: a Jobber's or Manufacturer's list, newest first, often
// filtered by status; plus the pair lookup used on the Manufacturer→Jobber view.
jobCardSchema.index({ jobberId: 1, createdAt: -1 });
jobCardSchema.index({ manufacturerId: 1, createdAt: -1 });
jobCardSchema.index({ manufacturerId: 1, jobberId: 1, createdAt: -1 });
jobCardSchema.index({ jobberId: 1, workStatus: 1, createdAt: -1 });
jobCardSchema.index({ manufacturerId: 1, workStatus: 1, createdAt: -1 });

jobCardSchema.pre('validate', async function assignDerived(next) {
  const round2 = (n: number): number => Math.round(n * 100) / 100;

  const pieces = (this.sizes ?? []).reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  const baleMtr = (this.bales ?? []).reduce((sum, b) => sum + (Number(b.meters) || 0), 0);
  this.totals = {
    pieces,
    sizeCount: (this.sizes ?? []).length,
    baleCount: (this.bales ?? []).length,
    baleMtr: round2(baleMtr),
  };

  // Fabric average / pcs cross-fill when only one is provided alongside mtr.
  if (this.fabric) {
    const { mtr, average, pcs } = this.fabric;
    if (mtr && average && !pcs) this.fabric.pcs = Math.round(mtr / average);
    else if (mtr && pcs && !average) this.fabric.average = round2(mtr / pcs);
  }

  if (this.isNew && !this.jobCardNumber) {
    const seq = await nextSequence('jobcard', 1001);
    this.jobCardNumber = `JC-${seq}`;
  }
  next();
});

export const JobCard = model<IJobCard, JobCardModel>('JobCard', jobCardSchema);
