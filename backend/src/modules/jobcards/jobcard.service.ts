import { Types, type FilterQuery, type PipelineStage } from 'mongoose';
import { JobCard, type IJobCard, type JobCardDocument } from './jobcard.model';
import {
  DISPATCH_TRANSITIONS,
  JOBCARD_SEARCHABLE_FIELDS,
  JOBCARD_SORTABLE_FIELDS,
  WORK_TRANSITIONS,
  WorkStatus,
  type DispatchAction,
  type WorkAction,
} from './jobcard.constants';
import { toJobCardDTO, type JobCardDTO } from './jobcard.mapper';
import { manufacturerService } from '../manufacturers/manufacturer.service';
import { fileService } from '../files/file.service';
import { auditService } from '../audit/audit.service';
import { AuditAction, type AuditActionValue } from '../audit/audit.model';
import { Role } from '../../constants/roles';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { buildListQuery, buildPaginationMeta, escapeRegex } from '../../utils/pagination';
import { logger } from '../../utils/logger';
import type { AuthenticatedUser, PaginatedResult } from '../../types/common.types';
import type { CreateJobCardInput, ListJobCardsQuery, UpdateJobCardInput } from './jobcard.validation';

/**
 * Job Card business logic.
 *
 * DATA ISOLATION: `ownershipFilter(actor)` is folded into EVERY query. A Jobber
 * only ever touches cards with their `jobberId`; a Manufacturer only cards with
 * their `manufacturerId`. The client cannot override this — a `manufacturerId`
 * in the request body/query is only honoured for ADMIN.
 *
 * READ-ONLY MANUFACTURER: all mutating methods require `actor.jobberId`, so the
 * MANUFACTURER role (which also lacks the write permissions) can never write.
 */

const WORK_ACTION_AUDIT: Record<WorkAction, AuditActionValue> = {
  ready: AuditAction.WORK_READY,
  start: AuditAction.WORK_STARTED,
  complete: AuditAction.WORK_COMPLETED,
  cancel: AuditAction.WORK_CANCELLED,
};

export interface JobCardSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  dispatched: number;
  cancelled: number;
}

export function ownershipFilter(actor: AuthenticatedUser): FilterQuery<IJobCard> {
  if (actor.role === Role.JOBBER) return { jobberId: actor.jobberId };
  if (actor.role === Role.MANUFACTURER) return { manufacturerId: actor.manufacturerId };
  return {}; // ADMIN
}

/**
 * Same scope as `ownershipFilter` but with ids cast to ObjectId — required for
 * aggregation `$match`, which (unlike a Mongoose query) does not auto-cast.
 */
function aggregationScope(actor: AuthenticatedUser): FilterQuery<IJobCard> {
  if (actor.role === Role.JOBBER && actor.jobberId) {
    return { jobberId: new Types.ObjectId(actor.jobberId) };
  }
  if (actor.role === Role.MANUFACTURER && actor.manufacturerId) {
    return { manufacturerId: new Types.ObjectId(actor.manufacturerId) };
  }
  return {};
}

function requireJobber(actor: AuthenticatedUser): string {
  if (actor.role !== Role.JOBBER || !actor.jobberId) {
    throw ApiError.forbidden('Only a Jobber can modify a Job Card', ErrorCode.READ_ONLY_ROLE);
  }
  return actor.jobberId;
}

function bucketFilter(bucket?: string): FilterQuery<IJobCard> {
  switch (bucket) {
    case 'pending':
      return { workStatus: { $in: [WorkStatus.DRAFT, WorkStatus.READY] } };
    case 'in_progress':
      return { workStatus: WorkStatus.IN_PROGRESS };
    case 'completed':
      return { workStatus: WorkStatus.COMPLETED };
    case 'dispatched':
      return { dispatchStatus: 'DISPATCHED' };
    default:
      return {};
  }
}

type JobCardFindOneQuery = ReturnType<typeof JobCard.findOne>;
const withRefs = (q: JobCardFindOneQuery): JobCardFindOneQuery =>
  q.populate('manufacturerId', 'name').populate('jobberId', 'name');

export const jobCardService = {
  async create(input: CreateJobCardInput, actor: AuthenticatedUser): Promise<JobCardDTO> {
    const jobberId = requireJobber(actor);
    await manufacturerService.assertJobberMayUse(input.manufacturerId, jobberId);

    const doc = await JobCard.create({
      ...input,
      manufacturerId: input.manufacturerId,
      jobberId,
      createdBy: actor.id,
      updatedBy: actor.id,
    });

    if (doc.cutting?.patternImageFileId) {
      await fileService.linkToManufacturer(
        String(doc.cutting.patternImageFileId),
        String(doc.manufacturerId),
      );
    }

    await auditService.record({
      entityType: 'JobCard',
      entityId: doc._id,
      action: AuditAction.JOBCARD_CREATED,
      actor,
      metadata: { jobCardNumber: doc.jobCardNumber },
    });
    logger.info({ jobCardId: doc.id, jobberId }, 'Job card created');

    return toJobCardDTO(await withRefs(JobCard.findById(doc._id)) as JobCardDocument);
  },

  async list(
    query: ListJobCardsQuery,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<JobCardDTO>> {
    const opts = buildListQuery(query, {
      sortableFields: JOBCARD_SORTABLE_FIELDS,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });

    const filter: FilterQuery<IJobCard> = {
      ...ownershipFilter(actor),
      ...bucketFilter(query.bucket),
    };

    if (query.workStatus) {
      filter.workStatus = Array.isArray(query.workStatus)
        ? { $in: query.workStatus }
        : query.workStatus;
    }
    if (query.dispatchStatus) filter.dispatchStatus = query.dispatchStatus;
    if (query.manufacturerId && actor.role !== Role.MANUFACTURER) {
      filter.manufacturerId = query.manufacturerId;
    }
    if (query.jobberId && actor.role !== Role.JOBBER) {
      filter.jobberId = query.jobberId;
    }
    if (query.dateFrom || query.dateTo) {
      filter.jobCardDate = {};
      if (query.dateFrom) filter.jobCardDate.$gte = query.dateFrom;
      if (query.dateTo) filter.jobCardDate.$lte = query.dateTo;
    }
    if (opts.search) {
      const rx = { $regex: escapeRegex(opts.search), $options: 'i' };
      filter.$or = JOBCARD_SEARCHABLE_FIELDS.map((f) => ({ [f]: rx }));
    }

    const [docs, total] = await Promise.all([
      JobCard.find(filter)
        .populate('manufacturerId', 'name')
        .populate('jobberId', 'name')
        .sort(opts.sort)
        .skip(opts.skip)
        .limit(opts.limit),
      JobCard.countDocuments(filter),
    ]);

    return {
      items: docs.map((d) => toJobCardDTO(d)),
      pagination: buildPaginationMeta(total, opts.page, opts.limit),
    };
  },

  /** Raw document scoped to the actor — used internally + by the PDF builder. */
  async findScoped(id: string, actor: AuthenticatedUser): Promise<JobCardDocument> {
    const doc = await withRefs(JobCard.findOne({ _id: id, ...ownershipFilter(actor) }));
    if (!doc) throw ApiError.notFound('Job Card not found', ErrorCode.JOBCARD_NOT_FOUND);
    return doc as JobCardDocument;
  },

  async getById(id: string, actor: AuthenticatedUser): Promise<JobCardDTO> {
    return toJobCardDTO(await this.findScoped(id, actor));
  },

  async update(
    id: string,
    input: UpdateJobCardInput,
    actor: AuthenticatedUser,
  ): Promise<JobCardDTO> {
    requireJobber(actor);
    const doc = await this.findScoped(id, actor);

    if (doc.workStatus === WorkStatus.CANCELLED) {
      throw ApiError.badRequest('A cancelled Job Card cannot be edited', ErrorCode.INVALID_STATUS_TRANSITION);
    }

    Object.assign(doc, input);
    doc.updatedBy = actor.id as unknown as JobCardDocument['updatedBy'];
    await doc.save();

    if (doc.cutting?.patternImageFileId) {
      await fileService.linkToManufacturer(
        String(doc.cutting.patternImageFileId),
        String(doc.manufacturerId),
      );
    }

    await auditService.record({
      entityType: 'JobCard',
      entityId: doc._id,
      action: AuditAction.JOBCARD_UPDATED,
      actor,
      metadata: { fields: Object.keys(input) },
    });
    return toJobCardDTO(await this.findScoped(id, actor));
  },

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    requireJobber(actor);
    const doc = await this.findScoped(id, actor);
    await doc.softDelete(actor.id);
    await auditService.record({
      entityType: 'JobCard',
      entityId: doc._id,
      action: AuditAction.JOBCARD_UPDATED,
      actor,
      metadata: { deleted: true },
    });
    logger.info({ jobCardId: id, actorId: actor.id }, 'Job card soft-deleted');
  },

  async performWorkAction(
    id: string,
    action: WorkAction,
    actor: AuthenticatedUser,
    note?: string,
  ): Promise<JobCardDTO> {
    requireJobber(actor);
    const doc = await this.findScoped(id, actor);
    const rule = WORK_TRANSITIONS[action];

    if (!rule.from.includes(doc.workStatus)) {
      throw ApiError.badRequest(
        `Cannot "${action}" a Job Card that is ${doc.workStatus}`,
        ErrorCode.INVALID_STATUS_TRANSITION,
      );
    }

    doc.workStatus = rule.to;
    doc.updatedBy = actor.id as unknown as JobCardDocument['updatedBy'];
    await doc.save();

    await auditService.record({
      entityType: 'JobCard',
      entityId: doc._id,
      action: WORK_ACTION_AUDIT[action],
      actor,
      metadata: note ? { note } : undefined,
    });
    return toJobCardDTO(await this.findScoped(id, actor));
  },

  async performDispatchAction(
    id: string,
    action: DispatchAction,
    actor: AuthenticatedUser,
    note?: string,
  ): Promise<JobCardDTO> {
    requireJobber(actor);
    const doc = await this.findScoped(id, actor);
    const rule = DISPATCH_TRANSITIONS[action];

    if (!rule.from.includes(doc.dispatchStatus)) {
      throw ApiError.badRequest(
        `Cannot "${action}" — the Job Card is already ${doc.dispatchStatus}`,
        ErrorCode.INVALID_STATUS_TRANSITION,
      );
    }
    if (rule.requiresWorkStatus && !rule.requiresWorkStatus.includes(doc.workStatus)) {
      throw ApiError.badRequest(
        'Complete the work before dispatching',
        ErrorCode.INVALID_STATUS_TRANSITION,
      );
    }

    doc.dispatchStatus = rule.to;
    doc.updatedBy = actor.id as unknown as JobCardDocument['updatedBy'];
    await doc.save();

    await auditService.record({
      entityType: 'JobCard',
      entityId: doc._id,
      action: action === 'dispatch' ? AuditAction.DISPATCHED : AuditAction.BROUGHT_BACK,
      actor,
      metadata: note ? { note } : undefined,
    });
    return toJobCardDTO(await this.findScoped(id, actor));
  },

  async activity(id: string, actor: AuthenticatedUser): Promise<unknown[]> {
    await this.findScoped(id, actor); // access check
    const entries = await auditService.listForEntity('JobCard', id, 200);
    return entries.map((e) => e.toJSON());
  },

  // ---- aggregations for dashboards -----------------------------------------

  async summaryFor(
    actor: AuthenticatedUser,
    extra: FilterQuery<IJobCard> = {},
  ): Promise<JobCardSummary> {
    const match: FilterQuery<IJobCard> = {
      ...aggregationScope(actor),
      ...extra,
      isDeleted: { $ne: true },
    };
    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $in: ['$workStatus', [WorkStatus.DRAFT, WorkStatus.READY]] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$workStatus', WorkStatus.IN_PROGRESS] }, 1, 0] },
          },
          completed: { $sum: { $cond: [{ $eq: ['$workStatus', WorkStatus.COMPLETED] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$workStatus', WorkStatus.CANCELLED] }, 1, 0] } },
          dispatched: { $sum: { $cond: [{ $eq: ['$dispatchStatus', 'DISPATCHED'] }, 1, 0] } },
        },
      },
    ];
    const [row] = await JobCard.aggregate(pipeline);
    return {
      total: row?.total ?? 0,
      pending: row?.pending ?? 0,
      inProgress: row?.inProgress ?? 0,
      completed: row?.completed ?? 0,
      dispatched: row?.dispatched ?? 0,
      cancelled: row?.cancelled ?? 0,
    };
  },

  async statsForManufacturerJobber(
    actor: AuthenticatedUser,
    jobberId: string,
  ): Promise<JobCardSummary> {
    return this.summaryFor(actor, { jobberId: new Types.ObjectId(jobberId) });
  },

  async recentFor(actor: AuthenticatedUser, limit = 5): Promise<JobCardDTO[]> {
    const docs = await JobCard.find({ ...ownershipFilter(actor), isDeleted: { $ne: true } })
      .populate('manufacturerId', 'name')
      .populate('jobberId', 'name')
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 20));
    return docs.map((d) => toJobCardDTO(d));
  },
};
