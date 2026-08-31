import { describe, it, expect, beforeEach } from 'vitest';
import { publicEnvSchema, getEnvironmentStatus, isServiceConfigured } from './env';

describe('Environment Validation & Service Status', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it('should validate public env schema with valid values', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.NEXT_PUBLIC_DOMAIN = 'localhost:9002';

    const result = publicEnvSchema.safeParse(process.env);
    expect(result.success).toBe(true);
  });

  it('should reject invalid Supabase URL', () => {
    const result = publicEnvSchema.safeParse({ NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('should reject empty anon key', () => {
    const result = publicEnvSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    });
    expect(result.success).toBe(false);
  });

  it('should report third-party service status accurately', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
    process.env.RESEND_API_KEY = 're_12345';
    delete process.env.TWILIO_ACCOUNT_SID;

    const status = getEnvironmentStatus();
    expect(status.supabase).toBe(true);
    expect(status.email).toBe(true);
    expect(status.sms).toBe(false);

    expect(isServiceConfigured('email')).toBe(true);
    expect(isServiceConfigured('sms')).toBe(false);
  });
});
