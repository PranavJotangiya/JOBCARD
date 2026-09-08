import { Routes } from '@angular/router';
import { roleCanMatch } from '../core/guards/role.guard';

/** A Jobber's Manufacturer contacts. */
export const JOBBER_ROUTES: Routes = [
  {
    path: '',
    canMatch: [roleCanMatch('JOBBER', 'ADMIN')],
    loadComponent: () =>
      import('./pages/manufacturer-list/manufacturer-list').then((m) => m.ManufacturerList),
    title: 'Manufacturers · JOBCARD',
  },
];
