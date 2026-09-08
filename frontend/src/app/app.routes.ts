import { Routes } from '@angular/router';
import { AppShell } from './layout/app-shell';
import { AuthShell } from './layout/auth-shell';
import { authCanMatch } from './core/guards/auth.guard';
import { guestCanMatch } from './core/guards/guest.guard';
import { setupOnlyWhenRequired } from './core/guards/setup.guard';

/**
 * Top-level routing.
 *
 *  - `/login`, `/setup`  → AuthShell (guest only)
 *  - everything else     → AppShell (authenticated); the empty path is the
 *                          role-aware dashboard
 *
 * `/login` and `/setup` are declared with their own real paths (each wrapped in
 * AuthShell) rather than as children of an empty-path parent, so the index `/`
 * resolves unambiguously to the AppShell route — whose `authCanMatch` redirects
 * to `/login` when there is no session. No redirect loops.
 */
export const routes: Routes = [
  {
    path: 'login',
    component: AuthShell,
    canMatch: [guestCanMatch],
    children: [
      {
        path: '',
        loadComponent: () => import('./auth/pages/login/login').then((m) => m.Login),
        title: 'Sign in · JOBCARD',
      },
    ],
  },
  {
    path: 'setup',
    component: AuthShell,
    canMatch: [guestCanMatch, setupOnlyWhenRequired],
    children: [
      {
        path: '',
        loadComponent: () => import('./auth/pages/setup/setup').then((m) => m.Setup),
        title: 'Setup · JOBCARD',
      },
    ],
  },
  {
    path: '',
    component: AppShell,
    canMatch: [authCanMatch],
    children: [
      {
        path: '',
        loadChildren: () => import('./dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'jobcards',
        loadChildren: () => import('./jobcards/jobcards.routes').then((m) => m.JOBCARD_ROUTES),
      },
      {
        path: 'manufacturers',
        loadChildren: () => import('./jobber/jobber.routes').then((m) => m.JOBBER_ROUTES),
      },
      {
        path: 'jobbers',
        loadChildren: () =>
          import('./manufacturer/manufacturer.routes').then((m) => m.MANUFACTURER_ROUTES),
      },
      {
        path: 'reports',
        loadChildren: () => import('./reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
