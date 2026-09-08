import pino from 'pino';
import { env } from '../config/environment';

/**
 * Structured application logger (pino).
 *
 * - JSON in production (machine-parseable, ready for log aggregation).
 * - Pretty-printed in development for readability.
 * - `redact` strips sensitive fields so passwords / tokens / credentials
 *   never reach the log stream even if accidentally passed in.
 */
const usePretty = env.PRETTY_LOGS || (env.isDevelopment && !env.isTest);

export const logger = pino({
  level: env.isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'jobcard-api', env: env.NODE_ENV },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'pin',
      '*.pin',
      'passwordHash',
      '*.passwordHash',
      'token',
      '*.token',
      'accessToken',
      'refreshToken',
      '*.accessToken',
      '*.refreshToken',
      'MONGODB_URI',
      'AUTH_SECRET',
      'authorization',
    ],
    censor: '[REDACTED]',
  },
  transport: usePretty
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname,service,env' },
      }
    : undefined,
});

export type Logger = typeof logger;
