import { Routes } from '@angular/router';
import { roleCanMatch } from '../core/guards/role.guard';

/** A Manufacturer's Jobber contacts + per-Jobber Job Card view. */
export const MANUFACTURER_ROUTES: Routes = [
  {
    path: '',
    canMatch: [roleCanMatch('MANUFACTURER', 'ADMIN')],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/jobber-list/jobber-list').then((m) => m.JobberList),
        title: 'Jobbers · JOBCARD',
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./pages/jobber-detail/jobber-detail').then((m) => m.JobberDetail),
        title: 'Jobber · JOBCARD',
      },
    ],
  },
];
