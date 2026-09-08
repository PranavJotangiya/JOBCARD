/**
 * Roles & RBAC.
 *
 * Authorization is centralised: routes declare a required `Permission` and the
 * `authorize()` middleware checks it against the caller's role. Ownership /
 * data-isolation (Manufacturer A ≠ Manufacturer B) is enforced separately in the
 * service layer by scoping every query to `req.auth.manufacturerId` /
 * `req.auth.jobberId` — never by trusting a client-supplied id.
 */
export const Role = {
  ADMIN: 'ADMIN',
  MANUFACTURER: 'MANUFACTURER',
  JOBBER: 'JOBBER',
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];
export const ALL_ROLES: RoleValue[] = Object.values(Role);

export const Permission = {
  // Job cards
  JOBCARD_CREATE: 'jobcard:create',
  JOBCARD_READ: 'jobcard:read',
  JOBCARD_UPDATE: 'jobcard:update',
  JOBCARD_DELETE: 'jobcard:delete',
  JOBCARD_STATUS: 'jobcard:status',
  JOBCARD_EXPORT: 'jobcard:export',

  // Contacts (a Jobber manages Manufacturers; a Manufacturer manages Jobbers)
  MANUFACTURER_MANAGE: 'manufacturer:manage',
  MANUFACTURER_READ: 'manufacturer:read',
  JOBBER_MANAGE: 'jobber:manage',
  JOBBER_READ: 'jobber:read',

  // Dashboards
  DASHBOARD_VIEW: 'dashboard:view',

  // Admin
  USER_MANAGE: 'user:manage',
} as const;

export type PermissionValue = (typeof Permission)[keyof typeof Permission];

/**
 * Role → permissions. The MANUFACTURER role is deliberately READ-ONLY on job
 * cards (view / export only) — see requirement 18.
 */
export const ROLE_PERMISSIONS: Record<RoleValue, PermissionValue[]> = {
  [Role.ADMIN]: Object.values(Permission),

  [Role.JOBBER]: [
    Permission.JOBCARD_CREATE,
    Permission.JOBCARD_READ,
    Permission.JOBCARD_UPDATE,
    Permission.JOBCARD_DELETE,
    Permission.JOBCARD_STATUS,
    Permission.JOBCARD_EXPORT,
    Permission.MANUFACTURER_MANAGE,
    Permission.MANUFACTURER_READ,
    Permission.DASHBOARD_VIEW,
  ],

  [Role.MANUFACTURER]: [
    Permission.JOBCARD_READ,
    Permission.JOBCARD_EXPORT,
    Permission.JOBBER_MANAGE,
    Permission.JOBBER_READ,
    Permission.DASHBOARD_VIEW,
  ],
};

export function hasPermission(role: RoleValue, permission: PermissionValue): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
