import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import type { Role } from '../models/auth.model';

/**
 * Route-level RBAC — mirrors the backend `authorize()`. Usage:
 *   { path: 'manufacturers', canMatch: [authCanMatch, roleCanMatch('JOBBER', 'ADMIN')], ... }
 */
export function roleCanMatch(...allowed: Role[]): CanMatchFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const notify = inject(NotificationService);
    if (auth.hasRole(...allowed)) return true;
    notify.warning('That area is not available for your role.');
    return router.createUrlTree(['/']);
  };
}
