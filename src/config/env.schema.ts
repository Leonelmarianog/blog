import { z } from 'zod';

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
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
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
});

export type Env = z.infer<typeof envSchema>;
