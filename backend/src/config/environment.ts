import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Centralised, validated environment configuration.
 *
 * process.env is read ONLY here. If a required variable is missing or malformed
 * the process exits immediately with a clear message.
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const NodeEnv = z.enum(['development', 'test', 'production']);

/** Parses "true"/"1"/"yes" (case-insensitive) as true; everything else false. */
const boolish = (defaultValue: boolean): z.ZodType<boolean, z.ZodTypeDef, unknown> =>
  z.preprocess((v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') return ['true', '1', 'yes', 'on'].includes(v.trim().toLowerCase());
    return defaultValue;
  }, z.boolean());

const envSchema = z
  .object({
    NODE_ENV: NodeEnv.default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    API_PREFIX: z
      .string()
      .default('/api/v1')
      .transform((v) => (v.endsWith('/') ? v.slice(0, -1) : v)),

    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    MONGODB_DB_NAME: z.string().default('jobcard'),

    CLIENT_URL: z.string().default('http://localhost:4200'),

    AUTH_SECRET: z.string().min(1, 'AUTH_SECRET is required'),
    AUTH_ACCESS_SECRET: z.string().optional(),
    AUTH_REFRESH_SECRET: z.string().optional(),
    COOKIE_SECRET: z.string().optional(),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL: z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),

    COOKIE_SECURE: boolish(false).default(false),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_DOMAIN: z.string().optional(),

    STORAGE_DRIVER: z.enum(['local']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('uploads'),
    MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(8),

    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    REQUEST_BODY_LIMIT: z.string().default('1mb'),

    PRETTY_LOGS: boolish(false).optional(),
  })
  .transform((cfg) => ({
    ...cfg,
    AUTH_ACCESS_SECRET: cfg.AUTH_ACCESS_SECRET || `${cfg.AUTH_SECRET}:access`,
    AUTH_REFRESH_SECRET: cfg.AUTH_REFRESH_SECRET || `${cfg.AUTH_SECRET}:refresh`,
    COOKIE_SECRET: cfg.COOKIE_SECRET || `${cfg.AUTH_SECRET}:cookie`,
  }))
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === 'production') {
      if (cfg.AUTH_SECRET.length < 32 || /change-?me|secret|please/i.test(cfg.AUTH_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['AUTH_SECRET'],
          message: 'AUTH_SECRET must be a strong random string (>= 32 chars) in production',
        });
      }
      if (!cfg.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be true in production (HTTPS)',
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('\n✖ Invalid environment configuration:\n');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
  }
  // eslint-disable-next-line no-console
  console.error('\nCopy backend/.env.example to backend/.env and fill in the values.\n');
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isDevelopment: data.NODE_ENV === 'development',
  isProduction: data.NODE_ENV === 'production',
  isTest: data.NODE_ENV === 'test',
  clientOrigins: data.CLIENT_URL.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxUploadBytes: data.MAX_UPLOAD_MB * 1024 * 1024,
} as const;

export type Env = typeof env;
