import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { ApiList, ApiSuccess, PageResult, QueryParams } from '../models/api.model';

/**
 * The one HTTP entry point for the app.
 *
 * - Prefixes every path with `environment.apiBaseUrl` — no service hardcodes URLs.
 * - Unwraps the `{ success, data }` envelope so callers get `T`.
 * - Credentials (auth cookies), error normalisation and the loading indicator
 *   are handled by HTTP interceptors, not here.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  private url(path: string): string {
    return `${this.base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private params(params?: QueryParams): HttpParams {
    let p = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
      }
    }
    return p;
  }

  get<T>(path: string, params?: QueryParams, context?: HttpContext): Observable<T> {
    return this.http
      .get<ApiSuccess<T>>(this.url(path), { params: this.params(params), context })
      .pipe(map((r) => r.data));
  }

  getPaged<T>(path: string, params?: QueryParams, context?: HttpContext): Observable<PageResult<T>> {
    return this.http
      .get<ApiList<T>>(this.url(path), { params: this.params(params), context })
      .pipe(map((r) => ({ items: r.data, pagination: r.pagination })));
  }

  post<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.post<ApiSuccess<T>>(this.url(path), body, { context }).pipe(map((r) => r.data));
  }

  put<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.put<ApiSuccess<T>>(this.url(path), body, { context }).pipe(map((r) => r.data));
  }

  patch<T>(path: string, body: unknown, context?: HttpContext): Observable<T> {
    return this.http.patch<ApiSuccess<T>>(this.url(path), body, { context }).pipe(map((r) => r.data));
  }

  delete<T>(path: string, context?: HttpContext): Observable<T> {
    return this.http.delete<ApiSuccess<T>>(this.url(path), { context }).pipe(map((r) => r.data));
  }

  /** For binary downloads (PDF) — returns a Blob, still same-origin credentials. */
  getBlob(path: string, params?: QueryParams): Observable<Blob> {
    return this.http.get(this.url(path), { params: this.params(params), responseType: 'blob' });
  }

  /** multipart/form-data upload. */
  upload<T>(path: string, form: FormData): Observable<T> {
    return this.http.post<ApiSuccess<T>>(this.url(path), form).pipe(map((r) => r.data));
  }

  absoluteUrl(path: string): string {
    return this.url(path);
  }
}
