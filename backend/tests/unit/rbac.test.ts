import { Permission, Role, ROLE_PERMISSIONS, hasPermission } from '../../src/constants/roles';

describe('RBAC — role → permission mapping', () => {
  it('MANUFACTURER is read-only on job cards', () => {
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBCARD_READ)).toBe(true);
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBCARD_EXPORT)).toBe(true);
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBCARD_CREATE)).toBe(false);
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBCARD_UPDATE)).toBe(false);
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBCARD_DELETE)).toBe(false);
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBCARD_STATUS)).toBe(false);
  });

  it('JOBBER can create / update / delete / progress job cards', () => {
    for (const p of [
      Permission.JOBCARD_CREATE,
      Permission.JOBCARD_READ,
      Permission.JOBCARD_UPDATE,
      Permission.JOBCARD_DELETE,
      Permission.JOBCARD_STATUS,
    ]) {
      expect(hasPermission(Role.JOBBER, p)).toBe(true);
    }
  });

  it('JOBBER manages Manufacturers, MANUFACTURER manages Jobbers — not the reverse', () => {
    expect(hasPermission(Role.JOBBER, Permission.MANUFACTURER_MANAGE)).toBe(true);
    expect(hasPermission(Role.JOBBER, Permission.JOBBER_MANAGE)).toBe(false);
    expect(hasPermission(Role.MANUFACTURER, Permission.JOBBER_MANAGE)).toBe(true);
    expect(hasPermission(Role.MANUFACTURER, Permission.MANUFACTURER_MANAGE)).toBe(false);
  });

  it('only ADMIN can manage users', () => {
    expect(hasPermission(Role.ADMIN, Permission.USER_MANAGE)).toBe(true);
    expect(hasPermission(Role.JOBBER, Permission.USER_MANAGE)).toBe(false);
    expect(hasPermission(Role.MANUFACTURER, Permission.USER_MANAGE)).toBe(false);
  });

  it('ADMIN has every permission', () => {
    for (const p of Object.values(Permission)) {
      expect(ROLE_PERMISSIONS[Role.ADMIN]).toContain(p);
    }
  });
});
