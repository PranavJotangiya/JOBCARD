import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import type { PageResult, QueryParams } from '../core/models/api.model';
import type {
  ActivityEntry,
  CreateJobCardPayload,
  JobCard,
  JobCardListFilters,
  StatusAction,
  UpdateJobCardPayload,
} from '../core/models/jobcard.model';

/**
 * Feature data access for Job Cards. Talks only to `ApiService` — the single
 * place the `/jobcards` endpoints are referenced from the frontend.
 */
@Injectable({ providedIn: 'root' })
export class JobcardService {
  private readonly api = inject(ApiService);
  private readonly base = '/jobcards';

  list(filters: JobCardListFilters = {}): Observable<PageResult<JobCard>> {
    const params: QueryParams = {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      bucket: filters.bucket && filters.bucket !== 'all' ? filters.bucket : undefined,
      manufacturerId: filters.manufacturerId,
      jobberId: filters.jobberId,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    };
    return this.api.getPaged<JobCard>(this.base, params);
  }

  getById(id: string): Observable<{ jobCard: JobCard }> {
    return this.api.get<{ jobCard: JobCard }>(`${this.base}/${id}`);
  }

  create(payload: CreateJobCardPayload): Observable<{ jobCard: JobCard }> {
    return this.api.post<{ jobCard: JobCard }>(this.base, payload);
  }

  update(id: string, payload: UpdateJobCardPayload): Observable<{ jobCard: JobCard }> {
    return this.api.put<{ jobCard: JobCard }>(`${this.base}/${id}`, payload);
  }

  remove(id: string): Observable<{ id: string }> {
    return this.api.delete<{ id: string }>(`${this.base}/${id}`);
  }

  runAction(id: string, action: StatusAction, note?: string): Observable<{ jobCard: JobCard }> {
    return this.api.post<{ jobCard: JobCard }>(`${this.base}/${id}/${action}`, note ? { note } : {});
  }

  activity(id: string): Observable<{ activity: ActivityEntry[] }> {
    return this.api.get<{ activity: ActivityEntry[] }>(`${this.base}/${id}/activity`);
  }

  pdfBlob(id: string): Observable<Blob> {
    return this.api.getBlob(`${this.base}/${id}/pdf`);
  }

  uploadPatternImage(file: File): Observable<{ file: { id: string; mimeType: string } }> {
    const form = new FormData();
    form.append('file', file);
    return this.api.upload<{ file: { id: string; mimeType: string } }>('/files', form);
  }

  fileRawUrl(fileId: string): string {
    return this.api.absoluteUrl(`/files/${fileId}/raw`);
  }
}
