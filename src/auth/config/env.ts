import { z } from 'zod';

const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  ARGON2_SECRET: z.string().min(16).optional(),
  SESSION_SECRET: z.string().min(32),
  APP_URL: z.string().url(),
  
  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().min(12).optional(),
  ADMIN_SEED_FIRST_NAME: z.string().min(1).optional(),
  ADMIN_SEED_LAST_NAME: z.string().min(1).optional(),
  ADMIN_SEED_EMPLOYEE_ID: z.string().min(1).optional(),
  ADMIN_SEED_DEPARTMENT: z.string().min(1).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
