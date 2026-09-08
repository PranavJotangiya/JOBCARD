import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { ALL_ROLES, type RoleValue } from '../../constants/roles';
import { applyBaseSchema } from '../../models/plugins/base-schema';
import type { SoftDeleteFields } from '../../models/plugins/soft-delete.plugin';

/**
 * Application user + RBAC subject.
 *
 * A JOBBER user is linked to exactly one `jobberId`; a MANUFACTURER user to one
 * `manufacturerId`; an ADMIN to neither. These links are the ownership scope for
 * data isolation and are copied into the access token.
 *
 * The password is stored only as a bcrypt hash in `passwordHash`
 * (`select: false`, stripped from JSON).
 */
export interface IUser extends SoftDeleteFields {
  name: string;
  username: string;
  passwordHash: string;
  role: RoleValue;
  manufacturerId: Types.ObjectId | null;
  jobberId: Types.ObjectId | null;
  isActive: boolean;
  /** bump to revoke every outstanding refresh token for this user */
  tokenVersion: number;
  lastLoginAt: Date | null;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  softDelete(userId?: Types.ObjectId | string): Promise<UserDocument>;
  restore(): Promise<UserDocument>;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      minlength: 3,
      maxlength: 40,
      match: [/^[a-z0-9._-]+$/, 'Username may contain letters, digits, dot, underscore and hyphen only'],
    },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: { values: ALL_ROLES, message: '`{VALUE}` is not a valid role' },
      required: true,
      index: true,
    },
    manufacturerId: { type: Schema.Types.ObjectId, ref: 'Manufacturer', default: null, index: true },
    jobberId: { type: Schema.Types.ObjectId, ref: 'Jobber', default: null, index: true },
    isActive: { type: Boolean, default: true, index: true },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { collection: 'users' },
);

applyBaseSchema(userSchema, { privateFields: ['passwordHash'], softDelete: true });

userSchema.index({ role: 1, isActive: 1 });

export const User = model<IUser, UserModel>('User', userSchema);
