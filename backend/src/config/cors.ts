import type { CorsOptions } from 'cors';
import { env } from './environment';
import { logger } from '../utils/logger';

/**
 * CORS policy.
 *
 * Only origins listed in CLIENT_URL (comma-separated) may call the API with
 * credentials. Requests with no `Origin` header (curl, server-to-server,
 * same-origin) are allowed through.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || env.clientOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin }, 'Blocked by CORS policy');
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86_400,
};
