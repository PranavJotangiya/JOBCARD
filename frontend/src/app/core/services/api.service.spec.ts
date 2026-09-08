import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let api: ApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('prefixes the base URL and unwraps the { data } envelope', () => {
    let result: unknown;
    api.get<{ ok: boolean }>('/jobcards/1').subscribe((r) => (result = r));

    const req = http.expectOne(`${environment.apiBaseUrl}/jobcards/1`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: { ok: true } });

    expect(result).toEqual({ ok: true });
  });

  it('serialises defined query params only', () => {
    api.getPaged('/jobcards', { page: 2, search: '', bucket: 'pending', empty: undefined }).subscribe();
    const req = http.expectOne((r) => r.url === `${environment.apiBaseUrl}/jobcards`);
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('bucket')).toBe('pending');
    expect(req.request.params.has('search')).toBe(false);
    expect(req.request.params.has('empty')).toBe(false);
    req.flush({ success: true, data: [], pagination: {} });
  });

  it('returns pagination alongside items for list calls', () => {
    let out: unknown;
    api.getPaged('/jobcards').subscribe((r) => (out = r));
    const req = http.expectOne(`${environment.apiBaseUrl}/jobcards`);
    req.flush({
      success: true,
      data: [{ id: 'a' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    });
    expect(out).toEqual({
      items: [{ id: 'a' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false },
    });
  });
});
