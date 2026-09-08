import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Protects application routes. `AuthService.bootstrap()` has already resolved by
 * the time a guard runs (APP_INITIALIZER), so `isAuthenticated()` is reliable.
 */
function check(targetUrl: string): true | UrlTree {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login'], {
    queryParams: targetUrl && targetUrl !== '/' ? { returnUrl: targetUrl } : {},
  });
}

export const authCanMatch: CanMatchFn = (_r, segments) =>
  check('/' + segments.map((s) => s.path).join('/'));

export const authCanActivate: CanActivateFn = (_r, state) => check(state.url);
