import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { HttpInterceptorFn, provideHttpClient, withInterceptors } from '@angular/common/http';
import { credentialsInterceptor } from './interceptors/credentials.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { refreshInterceptor } from './interceptors/refresh.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { AuthService } from './services/auth.service';

/**
 * Core layer composition root — imported once from `app.config.ts`.
 *
 * Interceptor order (outermost first):
 *   credentials -> loading -> refresh(401 retry) -> error(normalise + toast)
 *
 * `provideAppInitializer` blocks the first render until the session probe
 * (`AuthService.bootstrap`) resolves, so guards never see an undecided state.
 */
export const HTTP_INTERCEPTORS: HttpInterceptorFn[] = [
  credentialsInterceptor,
  loadingInterceptor,
  refreshInterceptor,
  errorInterceptor,
];

export function provideCore(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors(HTTP_INTERCEPTORS)),
    provideAppInitializer(() => inject(AuthService).bootstrap()),
  ]);
}
