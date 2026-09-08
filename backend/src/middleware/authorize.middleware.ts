import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { hasPermission, Role, type PermissionValue, type RoleValue } from '../constants/roles';

/**
 * Centralised RBAC. Routes declare the permission(s) they need; controllers never
 * check roles directly.
 *
 *   router.post('/', authenticate, authorize(Permission.JOBCARD_CREATE), ctrl.create)
 *
 * This is layer 1 (role → permission). Layer 2 (ownership: this Manufacturer /
 * this Jobber only) is enforced in the service by scoping the query — see
 * `requireOwnershipScope`.
 */
export function authorize(...required: PermissionValue[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized('You are not signed in', ErrorCode.AUTH_REQUIRED));
    }
    const ok = required.every((p) => hasPermission(req.auth!.role, p));
    if (!ok) {
      return next(
        ApiError.forbidden(
          'Your role does not permit this action',
          ErrorCode.INSUFFICIENT_PERMISSIONS,
        ),
      );
    }
    next();
  };
}

export function requireRole(...roles: RoleValue[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      return next(ApiError.unauthorized('You are not signed in', ErrorCode.AUTH_REQUIRED));
    }
    if (!roles.includes(req.auth.role)) {
      return next(
        ApiError.forbidden('Your role does not permit this action', ErrorCode.INSUFFICIENT_PERMISSIONS),
      );
    }
    next();
  };
}

/**
 * Guarantees the caller has an ownership scope for their role before a handler
 * runs (a JOBBER must have `jobberId`, a MANUFACTURER must have `manufacturerId`).
 * ADMIN is exempt. The service still re-applies the scope to every query.
 */
export const requireOwnershipScope: RequestHandler = (req, _res, next) => {
  const auth = req.auth;
  if (!auth) return next(ApiError.unauthorized('You are not signed in', ErrorCode.AUTH_REQUIRED));

  if (auth.role === Role.JOBBER && !auth.jobberId) {
    return next(
      ApiError.forbidden('This Jobber account is not linked to a workshop', ErrorCode.OWNERSHIP_VIOLATION),
    );
  }
  if (auth.role === Role.MANUFACTURER && !auth.manufacturerId) {
    return next(
      ApiError.forbidden('This Manufacturer account is not linked', ErrorCode.OWNERSHIP_VIOLATION),
    );
  }
  next();
};
