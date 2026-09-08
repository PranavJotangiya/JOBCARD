import { Routes } from '@angular/router';
import { roleCanMatch } from '../core/guards/role.guard';

/** Job Cards feature — lazy per page. `/new` and `/:id/edit` are Jobber-only. */
export const JOBCARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/jobcard-list/jobcard-list').then((m) => m.JobcardList),
    title: 'Job Cards · JOBCARD',
  },
  {
    path: 'new',
    canMatch: [roleCanMatch('JOBBER')],
    loadComponent: () =>
      import('./pages/jobcard-create/jobcard-create').then((m) => m.JobcardCreate),
    title: 'New Job Card · JOBCARD',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/jobcard-detail/jobcard-detail').then((m) => m.JobcardDetail),
    title: 'Job Card · JOBCARD',
  },
  {
    path: ':id/edit',
    canMatch: [roleCanMatch('JOBBER')],
    loadComponent: () => import('./pages/jobcard-edit/jobcard-edit').then((m) => m.JobcardEdit),
    title: 'Edit Job Card · JOBCARD',
  },
];
