import { Types } from 'mongoose';
import { AuditLog, type AuditActionValue } from './audit.model';
import type { AuthenticatedUser } from '../../types/common.types';
import { logger } from '../../utils/logger';

/**
 * Records important actions. Failures here are logged but never bubble up — an
 * audit write must not break the business operation that triggered it.
 */
export const auditService = {
  async record(params: {
    entityType: 'JobCard' | 'Manufacturer' | 'Jobber' | 'User';
    entityId: string | Types.ObjectId;
    action: AuditActionValue;
    actor?: Pick<AuthenticatedUser, 'id' | 'role' | 'name'> | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await AuditLog.create({
        entityType: params.entityType,
        entityId: new Types.ObjectId(String(params.entityId)),
        action: params.action,
        actorId: params.actor ? new Types.ObjectId(params.actor.id) : null,
        actorRole: params.actor?.role ?? null,
        actorName: params.actor?.name,
        metadata: params.metadata,
      });
    } catch (err) {
      logger.error({ err, action: params.action }, 'Failed to write audit log');
    }
  },

  /** Timeline for one entity, newest first. */
  async listForEntity(
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<InstanceType<typeof AuditLog>[]> {
    return AuditLog.find({ entityType, entityId: new Types.ObjectId(entityId) })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 200));
  },
};
