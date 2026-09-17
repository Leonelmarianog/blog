import { z } from 'zod';

/**
 * Parses an env-var boolean. `z.coerce.boolean()` is wrong here: `Boolean('false')` is `true`
 * (any non-empty string is truthy), so `SMTP_SECURE=false` / `S3_FORCE_PATH_STYLE=false` would
 * silently coerce to `true`. Accept only `'true'` / `'1'` (case-insensitive) as truthy; booleans
 * pass through (for `default(false)`).
 */
const envBool = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return /^(true|1)$/i.test(v);
  return false;
}, z.boolean());

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().trim().min(1),
  SESSION_SECRET: z.string().trim().min(16),
  REDIS_URL: z.string().trim().min(1),
  STORAGE_DRIVER: z.enum(['s3', 'local']).default('local'),
  STORAGE_MAX_BYTES: z.coerce.number().int().positive().default(5_242_880),
  STORAGE_LOCAL_DIR: z.string().trim().default('./.storage'),
  S3_ENDPOINT: z.string().trim().default(''),
  S3_REGION: z.string().trim().default(''),
  S3_BUCKET: z.string().trim().default(''),
  S3_ACCESS_KEY_ID: z.string().trim().default(''),
  S3_SECRET_ACCESS_KEY: z.string().trim().default(''),
  S3_PUBLIC_BASE: z.string().trim().default(''),
  S3_FORCE_PATH_STYLE: envBool.default(true),
  // Rate limiting (Plan 7b). TTLs in seconds. Register/resend/reset TTLs are code constants.
  RATE_LIMIT_GLOBAL_TTL: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_GLOBAL_LIMIT: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_LOGIN_TTL: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_LOGIN_LIMIT: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_REGISTER_LIMIT: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_RESEND_LIMIT: z.coerce.number().int().positive().default(3),
  RATE_LIMIT_RESET_LIMIT: z.coerce.number().int().positive().default(5),
  // Number of proxy hops to trust for X-Forwarded-For (0 = off; req.ips stays empty).
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Mail / queue (Plan 7c). QUEUE_DB is a code constant (3), not env — mirrors CACHE_DB/THROTTLE_DB.
  MAIL_DRIVER: z.enum(['smtp', 'log']).default('log'),
  SMTP_HOST: z.string().trim().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().trim().default(''),
  SMTP_PASS: z.string().trim().default(''),
  SMTP_SECURE: envBool.default(false),
  MAIL_FROM: z.string().trim().default('no-reply@localhost'),
  APP_URL: z.string().trim().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;
