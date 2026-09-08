import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/environment';
import { ApiError } from '../utils/api-error';

/**
 * Basic in-memory rate limiting. Fine for a single-instance modular monolith;
 * swap the `store` for a shared one (e.g. Redis) if/when the API is scaled
 * horizontally — no call-site changes required.
 */
const baseConfig: Partial<Options> = {
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, _res, next) => next(ApiError.tooManyRequests()),
};

/** Applied to the whole API. */
export const apiRateLimiter = rateLimit({
  ...baseConfig,
  max: env.RATE_LIMIT_MAX,
});

/** Stricter limiter for authentication endpoints (brute-force protection). */
export const authRateLimiter = rateLimit({
  ...baseConfig,
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 10 : 100,
  skipSuccessfulRequests: true,
});
