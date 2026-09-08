import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import type { PageResult } from '../core/models/api.model';
import type { ContactStats, Jobber } from '../core/models/contact.model';

/** A Manufacturer's Jobber contacts (`/jobbers`). */
@Injectable({ providedIn: 'root' })
export class JobberContactsService {
  private readonly api = inject(ApiService);

  list(search?: string): Observable<PageResult<Jobber>> {
    return this.api.getPaged<Jobber>('/jobbers', { limit: 100, search });
  }

  add(name: string): Observable<{ jobber: Jobber }> {
    return this.api.post<{ jobber: Jobber }>('/jobbers', { name });
  }

  getWithStats(id: string): Observable<{ jobber: Jobber; stats: ContactStats }> {
    return this.api.get<{ jobber: Jobber; stats: ContactStats }>(`/jobbers/${id}`);
  }
}
