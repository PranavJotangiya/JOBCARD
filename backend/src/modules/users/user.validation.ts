import { z } from 'zod';
import { Role } from '../../constants/roles';
import { personName, strongPassword, username } from '../auth/auth.validation';
import { listQuerySchema } from '../shared/common.validation';

/**
 * Admin user management. A MANUFACTURER / JOBBER user is created together with
 * (or linked to) its master record by name — the admin never has to pre-create
 * the Manufacturer/Jobber.
 */
export const createUserSchema = z
  .object({
    name: personName,
    username,
    password: strongPassword,
    role: z.nativeEnum(Role),
    /** Required when role is MANUFACTURER — the Manufacturer this user acts as. */
    manufacturerName: z.string().trim().min(2).max(160).optional(),
    /** Required when role is JOBBER — the Jobber (workshop) this user acts as. */
    jobberName: z.string().trim().min(2).max(160).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.role === Role.MANUFACTURER && !v.manufacturerName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['manufacturerName'], message: 'manufacturerName is required for a MANUFACTURER user' });
    }
    if (v.role === Role.JOBBER && !v.jobberName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['jobberName'], message: 'jobberName is required for a JOBBER user' });
    }
  });

export const listUsersQuerySchema = listQuerySchema.extend({
  role: z.nativeEnum(Role).optional(),
});

export const updateUserSchema = z
  .object({
    name: personName.optional(),
    password: strongPassword.optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: 'Provide at least one field to update' });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
