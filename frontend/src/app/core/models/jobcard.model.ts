/** Frontend view of the Job Card resource (backend jobcard.mapper.ts -> JobCardDTO). */
import type { Role } from './auth.model';

export const WORK_STATUSES = ['DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export const DISPATCH_STATUSES = ['IN_FACTORY', 'DISPATCHED'] as const;
export type DispatchStatus = (typeof DISPATCH_STATUSES)[number];

export type WorkAction = 'ready' | 'start' | 'complete' | 'cancel';
export type DispatchAction = 'dispatch' | 'bring-back';
export type StatusAction = WorkAction | DispatchAction;

export interface NamedRef {
  id: string;
  name: string | null;
}

export interface Fabric {
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

export interface Cutting {
  pattern?: string;
  markerLength?: number;
  markerWidth?: number;
  layLength?: number;
  layers?: number;
  plies?: number;
  patternImageFileId: string | null;
  patternImageUrl: string | null;
}

export interface JobCardTotals {
  pieces: number;
  sizeCount: number;
  baleCount: number;
  baleMtr: number;
}

export interface JobCard {
  id: string;
  jobCardNumber: string;
  jobCardDate: string;
  manufacturer: NamedRef;
  jobber: NamedRef;
  shortNumber?: string;
  shortName?: string;
  programDate: string | null;
  cuttingDate: string | null;
  fabric: Fabric;
  sizes: SizeQuantity[];
  bales: BaleRoll[];
  cutting: Cutting;
  notes?: string;
  workStatus: WorkStatus;
  dispatchStatus: DispatchStatus;
  totals: JobCardTotals;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobCardPayload {
  manufacturerId: string;
  jobCardDate?: string;
  shortNumber?: string;
  shortName?: string;
  programDate?: string | null;
  cuttingDate?: string | null;
  fabric?: Fabric;
  sizes?: SizeQuantity[];
  bales?: BaleRoll[];
  cutting?: Omit<Cutting, 'patternImageUrl'>;
  notes?: string;
}

export type UpdateJobCardPayload = Partial<Omit<CreateJobCardPayload, 'manufacturerId'>>;

export type StatusBucket = 'all' | 'pending' | 'in_progress' | 'completed' | 'dispatched';

export interface JobCardListFilters {
  page?: number;
  limit?: number;
  search?: string;
  bucket?: StatusBucket;
  manufacturerId?: string;
  jobberId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ActivityEntry {
  id: string;
  action: string;
  actorName?: string;
  actorRole: Role | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export const WORK_STATUS_LABEL: Record<WorkStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const DISPATCH_STATUS_LABEL: Record<DispatchStatus, string> = {
  IN_FACTORY: 'In Factory',
  DISPATCHED: 'Dispatched',
};
