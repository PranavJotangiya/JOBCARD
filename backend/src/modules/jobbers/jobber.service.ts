import type { FilterQuery } from 'mongoose';
import { Jobber, type IJobber, type JobberDocument } from './jobber.model';
import { Manufacturer } from '../manufacturers/manufacturer.model';
import { Role } from '../../constants/roles';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { buildListQuery, buildPaginationMeta, escapeRegex } from '../../utils/pagination';
import { auditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.model';
import { logger } from '../../utils/logger';
import type { AuthenticatedUser, PaginatedResult } from '../../types/common.types';
import type { CreateJobberInput, ListJobbersQuery } from './jobber.validation';

/**
 * Jobber contacts, from a Manufacturer's point of view.
 *
 * Isolation: a Manufacturer only ever sees Jobbers whose `linkedManufacturerIds`
 * contains their own `manufacturerId`. Applied to EVERY query.
 */
const nameKeyOf = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

function manufacturerScope(actor: AuthenticatedUser): FilterQuery<IJobber> {
  if (actor.role === Role.ADMIN) return {};
  return { linkedManufacturerIds: actor.manufacturerId };
}

export const jobberService = {
  async addForManufacturer(
    input: CreateJobberInput,
    actor: AuthenticatedUser,
  ): Promise<JobberDocument> {
    if (!actor.manufacturerId) {
      throw ApiError.forbidden('Only a Manufacturer can add Jobbers', ErrorCode.OWNERSHIP_VIOLATION);
    }
    const nameKey = nameKeyOf(input.name);

    const jobber = await Jobber.findOneAndUpdate(
      { nameKey },
      {
        $setOnInsert: { name: input.name.trim(), nameKey, createdBy: actor.id },
        $set: { updatedBy: actor.id },
        $addToSet: { linkedManufacturerIds: actor.manufacturerId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    await Manufacturer.updateOne(
      { _id: actor.manufacturerId },
      { $addToSet: { linkedJobberIds: jobber._id } },
    );

    await auditService.record({
      entityType: 'Jobber',
      entityId: jobber._id,
      action: AuditAction.JOBBER_LINKED,
      actor,
      metadata: { name: jobber.name },
    });
    logger.info({ jobberId: jobber.id, manufacturerId: actor.manufacturerId }, 'Jobber linked to manufacturer');
    return jobber;
  },

  async list(
    query: ListJobbersQuery,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<JobberDocument>> {
    const opts = buildListQuery(query, {
      sortableFields: ['name', 'createdAt'],
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });

    const filter: FilterQuery<IJobber> = { ...manufacturerScope(actor) };
    if (opts.search) filter.name = { $regex: escapeRegex(opts.search), $options: 'i' };

    const [items, total] = await Promise.all([
      Jobber.find(filter).sort(opts.sort).skip(opts.skip).limit(opts.limit),
      Jobber.countDocuments(filter),
    ]);
    return { items, pagination: buildPaginationMeta(total, opts.page, opts.limit) };
  },

  async getForActor(id: string, actor: AuthenticatedUser): Promise<JobberDocument> {
    const jobber = await Jobber.findOne({ _id: id, ...manufacturerScope(actor) });
    if (!jobber) throw ApiError.notFound('Jobber not found', ErrorCode.JOBBER_NOT_FOUND);
    return jobber;
  },
};
