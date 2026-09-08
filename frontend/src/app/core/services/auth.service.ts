import { HttpContext } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom, tap } from 'rxjs';
import { ApiService } from './api.service';
import { SKIP_ERROR_TOAST, SKIP_REFRESH } from '../interceptors/http-context.tokens';
import type {
  FirstAdminPayload,
  LoginPayload,
  Profile,
  Role,
  SessionUser,
} from '../models/auth.model';

/**
 * Owns the authenticated session.
 *
 * Auth is COOKIE-based (HttpOnly access + refresh cookies set by the API), so
 * this service never handles a raw token. State is exposed as signals for guards,
 * shell and components.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);

  private readonly _user = signal<Profile | null>(null);
  private readonly _ready = signal(false);

  readonly user = this._user.asReadonly();
  /** true once the initial `/auth/me` probe has resolved (see APP_INITIALIZER). */
  readonly ready = this._ready.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly role = computed<Role | null>(() => this._user()?.role ?? null);

  /** Runs once at startup — restores the session from the cookie if present. */
  async bootstrap(): Promise<void> {
    try {
      const { user } = await firstValueFrom(
        this.api.get<{ user: Profile }>('/auth/me', undefined, quiet()),
      );
      this._user.set(user);
    } catch {
      this._user.set(null);
    } finally {
      this._ready.set(true);
    }
  }

  isSetupRequired(): Observable<{ setupRequired: boolean }> {
    return this.api.get<{ setupRequired: boolean }>('/auth/setup-status', undefined, quiet());
  }

  login(payload: LoginPayload): Observable<{ user: SessionUser }> {
    return this.api
      .post<{ user: SessionUser }>('/auth/login', payload, new HttpContext().set(SKIP_REFRESH, true))
      .pipe(tap(({ user }) => this.refreshProfile(user)));
  }

  completeSetup(payload: FirstAdminPayload): Observable<{ user: SessionUser }> {
    return this.api
      .post<{ user: SessionUser }>('/auth/setup', payload, new HttpContext().set(SKIP_REFRESH, true))
      .pipe(tap(({ user }) => this.refreshProfile(user)));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.api.post('/auth/logout', {}, quiet()));
    } catch {
      /* ignore — clear locally regardless */
    }
    this._user.set(null);
  }

  clearSession(): void {
    this._user.set(null);
  }

  hasRole(...roles: Role[]): boolean {
    const r = this._user()?.role;
    return r !== undefined && roles.includes(r);
  }

  /** The landing route for the current user's role. */
  homePath(): string {
    return '/'; // the shell + dashboard route is role-aware
  }

  private refreshProfile(fallback: SessionUser): void {
    // Optimistically set from login response, then hydrate names via /auth/me.
    this._user.set({ ...fallback, manufacturerName: null, jobberName: null, lastLoginAt: null });
    this.api.get<{ user: Profile }>('/auth/me', undefined, quiet()).subscribe({
      next: ({ user }) => this._user.set(user),
      error: () => undefined,
    });
  }
}

function quiet(): HttpContext {
  return new HttpContext().set(SKIP_ERROR_TOAST, true).set(SKIP_REFRESH, true);
}
