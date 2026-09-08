import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { ALL_ROLES, type RoleValue } from '../../constants/roles';
import { toJSONPlugin } from '../../models/plugins/to-json.plugin';

/**
 * Append-only audit / activity log. Never soft-deleted, never mutated — it is the
 * permanent record behind the Job Card "Activity" timeline.
 */
export const AuditAction = {
  JOBCARD_CREATED: 'JOBCARD_CREATED',
  JOBCARD_UPDATED: 'JOBCARD_UPDATED',
  WORK_READY: 'WORK_READY',
  WORK_STARTED: 'WORK_STARTED',
  WORK_COMPLETED: 'WORK_COMPLETED',
  WORK_CANCELLED: 'WORK_CANCELLED',
  DISPATCHED: 'DISPATCHED',
  BROUGHT_BACK: 'BROUGHT_BACK',
  MANUFACTURER_LINKED: 'MANUFACTURER_LINKED',
  JOBBER_LINKED: 'JOBBER_LINKED',
} as const;
export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];

export interface IAuditLog {
  entityType: 'JobCard' | 'Manufacturer' | 'Jobber' | 'User';
  entityId: Types.ObjectId;
  action: AuditActionValue;
  actorId: Types.ObjectId | null;
  actorRole: RoleValue | null;
  actorName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export type AuditLogDocument = HydratedDocument<IAuditLog>;
type AuditLogModel = Model<IAuditLog>;

const auditSchema = new Schema<IAuditLog, AuditLogModel>(
  {
    entityType: {
      type: String,
      required: true,
      enum: ['JobCard', 'Manufacturer', 'Jobber', 'User'],
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorRole: { type: String, enum: [...ALL_ROLES, null], default: null },
    actorName: { type: String, trim: true },
    metadata: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { collection: 'audit_logs', versionKey: false },
);

auditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

toJSONPlugin(auditSchema as unknown as Schema);

export const AuditLog = model<IAuditLog, AuditLogModel>('AuditLog', auditSchema);
