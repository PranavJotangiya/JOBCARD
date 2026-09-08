/**
 * Job Card domain constants — the two independent status machines and the
 * whitelists used for sorting / searching.
 */

/** Production progress. */
export const WorkStatus = {
  DRAFT: 'DRAFT',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type WorkStatusValue = (typeof WorkStatus)[keyof typeof WorkStatus];
export const WORK_STATUSES: WorkStatusValue[] = Object.values(WorkStatus);

/** Where the goods physically are. Kept separate from WorkStatus. */
export const DispatchStatus = {
  IN_FACTORY: 'IN_FACTORY',
  DISPATCHED: 'DISPATCHED',
} as const;
export type DispatchStatusValue = (typeof DispatchStatus)[keyof typeof DispatchStatus];
export const DISPATCH_STATUSES: DispatchStatusValue[] = Object.values(DispatchStatus);

/**
 * The status actions a Jobber may take, and the transition each performs.
 * Enforced by the backend — the frontend only renders the buttons that map to a
 * currently-valid action.
 */
export type WorkAction = 'ready' | 'start' | 'complete' | 'cancel';
export type DispatchAction = 'dispatch' | 'bring-back';

export const WORK_TRANSITIONS: Record<WorkAction, { from: WorkStatusValue[]; to: WorkStatusValue }> = {
  ready: { from: [WorkStatus.DRAFT], to: WorkStatus.READY },
  start: { from: [WorkStatus.READY, WorkStatus.DRAFT], to: WorkStatus.IN_PROGRESS },
  complete: { from: [WorkStatus.IN_PROGRESS], to: WorkStatus.COMPLETED },
  cancel: {
    from: [WorkStatus.DRAFT, WorkStatus.READY, WorkStatus.IN_PROGRESS],
    to: WorkStatus.CANCELLED,
  },
};

export const DISPATCH_TRANSITIONS: Record<
  DispatchAction,
  { from: DispatchStatusValue[]; to: DispatchStatusValue; requiresWorkStatus?: WorkStatusValue[] }
> = {
  dispatch: {
    from: [DispatchStatus.IN_FACTORY],
    to: DispatchStatus.DISPATCHED,
    requiresWorkStatus: [WorkStatus.COMPLETED],
  },
  'bring-back': { from: [DispatchStatus.DISPATCHED], to: DispatchStatus.IN_FACTORY },
};

export const JOBCARD_SORTABLE_FIELDS = [
  'createdAt',
  'updatedAt',
  'jobCardDate',
  'jobCardNumber',
  'workStatus',
  'totals.pieces',
] as const;

export const JOBCARD_SEARCHABLE_FIELDS = [
  'jobCardNumber',
  'shortNumber',
  'shortName',
  'fabric.fabricType',
  'fabric.color',
] as const;

/** UI status buckets referenced by the dashboard + list filter chips. */
export const STATUS_BUCKETS = ['pending', 'in_progress', 'completed', 'dispatched'] as const;
export type StatusBucket = (typeof STATUS_BUCKETS)[number];
