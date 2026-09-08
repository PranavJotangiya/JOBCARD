import { z } from 'zod';

/**
 * Auth request validation. Password policy is simple but real (length + a digit +
 * mixed case); tighten in this one place as requirements evolve.
 */
export const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(40)
  .regex(/^[a-z0-9._-]+$/, 'Username may contain letters, digits, dot, underscore and hyphen only');

export const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Add a lowercase letter')
  .regex(/[A-Z]/, 'Add an uppercase letter')
  .regex(/\d/, 'Add a number');

export const personName = z.string().trim().min(2, 'Enter a name').max(120);

export const loginSchema = z
  .object({
    username,
    password: z.string().min(1, 'Enter your password'),
  })
  .strict();

export const firstAdminSetupSchema = z
  .object({
    name: personName,
    username,
    password: strongPassword,
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type FirstAdminSetupInput = z.infer<typeof firstAdminSetupSchema>;
