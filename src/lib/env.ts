import { z } from 'zod';

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_DOMAIN: z.string().min(1).default('localhost:9002'),
});

export const serverEnvSchema = publicEnvSchema.extend({
  DATABASE_URL: z.string().min(1),
  DATABASE_POOLER_URL: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_FROM_NUMBER: z.string().min(1).optional(),
  GOOGLE_API_KEY: z.string().min(1).optional(),
  DODO_PAYMENTS_API_KEY: z.string().min(1).optional(),
  CRON_SECRET: process.env.NODE_ENV === 'production' ? z.string().min(1) : z.string().min(1).optional(),
  JWT_SECRET: z.string().min(16).optional(),
  AUTH_SECRET: z.string().min(16).optional(),
  SESSION_SECRET: z.string().min(16).optional(),
  QR_SECRET: process.env.NODE_ENV === 'production' ? z.string().min(16) : z.string().min(16).optional(),
  // Authenticate inbound Clerk (user sync) and Dodo (payment) webhooks.
  // Required in production so a missing secret fails app boot instead of
  // silently degrading to "signature verification skipped" per-request.
  CLERK_WEBHOOK_SECRET: process.env.NODE_ENV === 'production' ? z.string().min(1) : z.string().min(1).optional(),
  DODO_PAYMENTS_WEBHOOK_SECRET: process.env.NODE_ENV === 'production' ? z.string().min(1) : z.string().min(1).optional(),
  ALLOWED_ORIGINS: z.string().min(1).optional(),
});

let cachedServerEnv: z.infer<typeof serverEnvSchema> | null = null;
let cachedPublicEnv: z.infer<typeof publicEnvSchema> | null = null;

export function getServerEnv() {
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join('.') || issue.message).join(', ');
    throw new Error(`Invalid server environment variables: ${issues}`);
  }

  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

export function getPublicEnv() {
  if (cachedPublicEnv) return cachedPublicEnv;

  const parsed = publicEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => issue.path.join('.') || issue.message).join(', ');
    throw new Error(`Invalid public environment variables: ${issues}`);
  }

  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

/**
 * Returns the operational availability of external third-party integrations.
 */
export function getEnvironmentStatus() {
  return {
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    database: Boolean(process.env.DATABASE_URL || process.env.DATABASE_POOLER_URL),
    email: Boolean(process.env.RESEND_API_KEY),
    sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    ai: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
    payments: Boolean(process.env.DODO_PAYMENTS_API_KEY),
  };
}

export function isServiceConfigured(service: keyof ReturnType<typeof getEnvironmentStatus>): boolean {
  return getEnvironmentStatus()[service];
}
