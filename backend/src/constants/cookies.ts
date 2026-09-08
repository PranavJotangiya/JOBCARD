import type { CookieOptions } from 'express';
import { env } from '../config/environment';

/** Names of the auth cookies set on browser clients. */
export const COOKIE_NAMES = {
  ACCESS: 'jc_access',
  REFRESH: 'jc_refresh',
} as const;

/** Base cookie flags — HttpOnly always; Secure/SameSite/Domain from env. */
function base(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
    path: '/',
  };
}

const parseMs = (ttl: string): number => {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) return 15 * 60 * 1000;
  const n = Number(m[1]);
  const unit = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 }[m[2] as 's' | 'm' | 'h' | 'd'];
  return n * unit;
};

export const accessCookieOptions = (): CookieOptions => ({
  ...base(),
  maxAge: parseMs(env.ACCESS_TOKEN_TTL),
});

export const refreshCookieOptions = (): CookieOptions => ({
  ...base(),
  maxAge: parseMs(env.REFRESH_TOKEN_TTL),
  // The refresh cookie is only ever needed by the refresh endpoint.
  path: `${env.API_PREFIX}/auth`,
});

export const clearCookieOptions = (): CookieOptions => ({ ...base() });
export const clearRefreshCookieOptions = (): CookieOptions => ({
  ...base(),
  path: `${env.API_PREFIX}/auth`,
});
