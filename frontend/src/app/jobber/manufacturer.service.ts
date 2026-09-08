import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import type { PageResult } from '../core/models/api.model';
import type { Manufacturer } from '../core/models/contact.model';

/** A Jobber's Manufacturer contacts (`/manufacturers`). */
@Injectable({ providedIn: 'root' })
export class ManufacturerService {
  private readonly api = inject(ApiService);

  list(search?: string): Observable<PageResult<Manufacturer>> {
    return this.api.getPaged<Manufacturer>('/manufacturers', { limit: 100, search });
  }

  add(name: string): Observable<{ manufacturer: Manufacturer }> {
    return this.api.post<{ manufacturer: Manufacturer }>('/manufacturers', { name });
  }
}
