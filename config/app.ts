/**
 * Application Configuration
 *
 * Centralized app-level settings. Import this instead of
 * scattering process.env reads across the codebase.
 */

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || 'Hackathon App',
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',

  database: {
    url: process.env.DATABASE_URL || '',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    maxSteps: parseInt(process.env.AI_MAX_STEPS || '10', 10),
  },

  auth: {
    provider: process.env.AUTH_PROVIDER || 'credentials',
    secret: process.env.AUTH_SECRET || '',
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || 'mailpit',
    from: process.env.EMAIL_FROM || 'noreply@example.com',
  },

  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    bucket: process.env.STORAGE_BUCKET || 'uploads',
  },

  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'mock',
  },

  otp: {
    mode: process.env.OTP_MODE || 'mock',
    expirySeconds: parseInt(process.env.OTP_EXPIRY_SECONDS || '300', 10),
    maxAttempts: parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10),
  },
} as const;
