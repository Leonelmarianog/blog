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
});

export type Env = z.infer<typeof envSchema>;
