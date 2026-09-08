import { z } from 'zod';
import { listQuerySchema, objectId } from '../shared/common.validation';
import {
  DISPATCH_STATUSES,
  JOBCARD_SORTABLE_FIELDS,
  WORK_STATUSES,
} from './jobcard.constants';

/**
 * Backend-authoritative validation for the Job Card API.
 * The Angular Reactive Forms mirror these rules for UX; this is what protects
 * data integrity.
 */
const optionalDate = z.coerce.date().optional();
const nonNegative = z.number().finite().min(0).max(1_000_000_000);

const fabricSchema = z
  .object({
    fabricType: z.string().trim().max(120).optional(),
    color: z.string().trim().max(80).optional(),
    description: z.string().trim().max(500).optional(),
    pana: nonNegative.optional(),
    mtr: nonNegative.optional(),
    average: nonNegative.optional(),
    pcs: nonNegative.optional(),
  })
  .strict();

const sizeSchema = z
  .object({
    size: z.string().trim().min(1).max(20),
    quantity: z.number().finite().int('Quantity must be a whole number').min(0).max(10_000_000),
  })
  .strict();

const baleSchema = z
  .object({
    label: z.string().trim().min(1).max(40),
    meters: nonNegative,
  })
  .strict();

const cuttingSchema = z
  .object({
    pattern: z.string().trim().max(120).optional(),
    markerLength: nonNegative.optional(),
    markerWidth: nonNegative.optional(),
    layLength: nonNegative.optional(),
    layers: z.number().finite().int().min(0).max(100000).optional(),
    plies: z.number().finite().int().min(0).max(100000).optional(),
    patternImageFileId: objectId.nullable().optional(),
  })
  .strict();

const jobCardCore = {
  manufacturerId: objectId,
  jobCardDate: optionalDate,
  shortNumber: z.string().trim().max(40).optional(),
  shortName: z.string().trim().max(120).optional(),
  programDate: optionalDate.nullable(),
  cuttingDate: optionalDate.nullable(),
  fabric: fabricSchema.optional(),
  sizes: z.array(sizeSchema).max(60).optional(),
  bales: z.array(baleSchema).max(200).optional(),
  cutting: cuttingSchema.optional(),
  notes: z.string().trim().max(4000).optional(),
};

export const createJobCardSchema = z.object(jobCardCore).strict();

export const updateJobCardSchema = z
  .object({
    // manufacturerId is immutable — not accepted on update
    jobCardDate: optionalDate,
    shortNumber: z.string().trim().max(40).optional(),
    shortName: z.string().trim().max(120).optional(),
    programDate: optionalDate.nullable(),
    cuttingDate: optionalDate.nullable(),
    fabric: fabricSchema.optional(),
    sizes: z.array(sizeSchema).max(60).optional(),
    bales: z.array(baleSchema).max(200).optional(),
    cutting: cuttingSchema.optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export const listJobCardsQuerySchema = listQuerySchema.extend({
  sortBy: z.enum(JOBCARD_SORTABLE_FIELDS as unknown as [string, ...string[]]).optional(),
  workStatus: z
    .union([
      z.enum(WORK_STATUSES as unknown as [string, ...string[]]),
      z.array(z.enum(WORK_STATUSES as unknown as [string, ...string[]])),
    ])
    .optional(),
  dispatchStatus: z.enum(DISPATCH_STATUSES as unknown as [string, ...string[]]).optional(),
  /** UI filter chip: pending | in_progress | completed | dispatched */
  bucket: z.enum(['all', 'pending', 'in_progress', 'completed', 'dispatched']).optional(),
  manufacturerId: objectId.optional(),
  jobberId: objectId.optional(),
  dateFrom: optionalDate,
  dateTo: optionalDate,
});

export const statusActionSchema = z
  .object({
    note: z.string().trim().max(500).optional(),
  })
  .strict()
  .optional();

export type CreateJobCardInput = z.infer<typeof createJobCardSchema>;
export type UpdateJobCardInput = z.infer<typeof updateJobCardSchema>;
export type ListJobCardsQuery = z.infer<typeof listJobCardsQuerySchema>;
