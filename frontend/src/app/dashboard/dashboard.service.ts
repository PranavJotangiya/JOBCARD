import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import type { DashboardData } from '../core/models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  get(): Observable<DashboardData> {
    return this.api.get<DashboardData>('/dashboard');
  }
}
