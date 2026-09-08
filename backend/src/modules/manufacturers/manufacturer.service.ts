import type { FilterQuery } from 'mongoose';
import { Manufacturer, type IManufacturer, type ManufacturerDocument } from './manufacturer.model';
import { Jobber } from '../jobbers/jobber.model';
import { Role } from '../../constants/roles';
import { ApiError } from '../../utils/api-error';
import { ErrorCode } from '../../constants/error-codes';
import { buildListQuery, buildPaginationMeta, escapeRegex } from '../../utils/pagination';
import { auditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit.model';
import { logger } from '../../utils/logger';
import type { AuthenticatedUser, PaginatedResult } from '../../types/common.types';
import type { CreateManufacturerInput, ListManufacturersQuery } from './manufacturer.validation';

/**
 * Manufacturer contacts, from a Jobber's point of view.
 *
 * Isolation: a Jobber only ever sees Manufacturers whose `linkedJobberIds`
 * contains their own `jobberId`. The scope is applied to EVERY query here — the
 * client cannot widen it.
 */
const nameKeyOf = (name: string): string => name.trim().toLowerCase().replace(/\s+/g, ' ');

function jobberScope(actor: AuthenticatedUser): FilterQuery<IManufacturer> {
  if (actor.role === Role.ADMIN) return {};
  return { linkedJobberIds: actor.jobberId };
}

export const manufacturerService = {
  /**
   * Jobber adds a Manufacturer by name. Idempotent: if a Manufacturer with the
   * same normalised name already exists it is reused and simply linked.
   */
  async addForJobber(
    input: CreateManufacturerInput,
    actor: AuthenticatedUser,
  ): Promise<ManufacturerDocument> {
    if (!actor.jobberId) {
      throw ApiError.forbidden('Only a Jobber can add Manufacturers', ErrorCode.OWNERSHIP_VIOLATION);
    }
    const nameKey = nameKeyOf(input.name);

    const manufacturer = await Manufacturer.findOneAndUpdate(
      { nameKey },
      {
        $setOnInsert: { name: input.name.trim(), nameKey, createdBy: actor.id },
        $set: { updatedBy: actor.id },
        $addToSet: { linkedJobberIds: actor.jobberId },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    // Keep the reciprocal link on the Jobber consistent.
    await Jobber.updateOne(
      { _id: actor.jobberId },
      { $addToSet: { linkedManufacturerIds: manufacturer._id } },
    );

    await auditService.record({
      entityType: 'Manufacturer',
      entityId: manufacturer._id,
      action: AuditAction.MANUFACTURER_LINKED,
      actor,
      metadata: { name: manufacturer.name },
    });
    logger.info({ manufacturerId: manufacturer.id, jobberId: actor.jobberId }, 'Manufacturer linked to jobber');
    return manufacturer;
  },

  async list(
    query: ListManufacturersQuery,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<ManufacturerDocument>> {
    const opts = buildListQuery(query, {
      sortableFields: ['name', 'createdAt'],
      defaultSortBy: 'name',
      defaultSortOrder: 'asc',
    });

    const filter: FilterQuery<IManufacturer> = { ...jobberScope(actor) };
    if (opts.search) filter.name = { $regex: escapeRegex(opts.search), $options: 'i' };

    const [items, total] = await Promise.all([
      Manufacturer.find(filter).sort(opts.sort).skip(opts.skip).limit(opts.limit),
      Manufacturer.countDocuments(filter),
    ]);
    return { items, pagination: buildPaginationMeta(total, opts.page, opts.limit) };
  },

  /** Fetch one, enforcing the caller's scope. */
  async getForActor(id: string, actor: AuthenticatedUser): Promise<ManufacturerDocument> {
    const manufacturer = await Manufacturer.findOne({ _id: id, ...jobberScope(actor) });
    if (!manufacturer) {
      throw ApiError.notFound('Manufacturer not found', ErrorCode.MANUFACTURER_NOT_FOUND);
    }
    return manufacturer;
  },

  /** Used by the job-card service to validate a Jobber may use a Manufacturer. */
  async assertJobberMayUse(manufacturerId: string, jobberId: string): Promise<void> {
    const exists = await Manufacturer.exists({ _id: manufacturerId, linkedJobberIds: jobberId });
    if (!exists) {
      throw ApiError.badRequest(
        'Select one of your Manufacturers',
        ErrorCode.RELATIONSHIP_NOT_FOUND,
      );
    }
  },
};
