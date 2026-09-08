import type { HydratedDocument, Types } from 'mongoose';
import type { IJobCard } from './jobcard.model';
import { env } from '../../config/environment';

/** Shape returned by the Job Card API (ids as strings, related names inlined). */
export interface JobCardDTO {
  id: string;
  jobCardNumber: string;
  jobCardDate: string;
  manufacturer: { id: string; name: string | null };
  jobber: { id: string; name: string | null };
  shortNumber?: string;
  shortName?: string;
  programDate: string | null;
  cuttingDate: string | null;
  fabric: IJobCard['fabric'];
  sizes: IJobCard['sizes'];
  bales: IJobCard['bales'];
  cutting: Omit<IJobCard['cutting'], 'patternImageFileId'> & {
    patternImageFileId: string | null;
    patternImageUrl: string | null;
  };
  notes?: string;
  workStatus: IJobCard['workStatus'];
  dispatchStatus: IJobCard['dispatchStatus'];
  totals: IJobCard['totals'];
  createdAt: string;
  updatedAt: string;
}

interface NamedRef {
  _id: Types.ObjectId;
  name?: string;
}

function refOf(value: unknown): { id: string; name: string | null } {
  if (value && typeof value === 'object' && '_id' in value) {
    const r = value as NamedRef;
    return { id: String(r._id), name: r.name ?? null };
  }
  return { id: String(value), name: null };
}

export function toJobCardDTO(doc: HydratedDocument<IJobCard>): JobCardDTO {
  const o = doc.toObject({ virtuals: false });
  const fileId = o.cutting?.patternImageFileId ? String(o.cutting.patternImageFileId) : null;

  return {
    id: String(o._id),
    jobCardNumber: o.jobCardNumber,
    jobCardDate: o.jobCardDate.toISOString(),
    manufacturer: refOf(doc.get('manufacturerId')),
    jobber: refOf(doc.get('jobberId')),
    shortNumber: o.shortNumber,
    shortName: o.shortName,
    programDate: o.programDate ? o.programDate.toISOString() : null,
    cuttingDate: o.cuttingDate ? o.cuttingDate.toISOString() : null,
    fabric: o.fabric ?? {},
    sizes: o.sizes ?? [],
    bales: o.bales ?? [],
    cutting: {
      pattern: o.cutting?.pattern,
      markerLength: o.cutting?.markerLength,
      markerWidth: o.cutting?.markerWidth,
      layLength: o.cutting?.layLength,
      layers: o.cutting?.layers,
      plies: o.cutting?.plies,
      patternImageFileId: fileId,
      patternImageUrl: fileId ? `${env.API_PREFIX}/files/${fileId}/raw` : null,
    },
    notes: o.notes,
    workStatus: o.workStatus,
    dispatchStatus: o.dispatchStatus,
    totals: o.totals,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
