import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * `/setup` is reachable only while no ADMIN exists. `/login` bounces to `/setup`
 * in that same window (handled by the login page). Both call GET
 * /auth/setup-status.
 */
export const setupOnlyWhenRequired: CanMatchFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  try {
    const { setupRequired } = await firstValueFrom(auth.isSetupRequired());
    return setupRequired ? true : router.createUrlTree(['/login']);
  } catch {
    return router.createUrlTree(['/login']);
  }
};
