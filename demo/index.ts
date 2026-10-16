/**
 * Demo Module
 *
 * Seed data, demo users, and reset utilities for hackathon presentations.
 */

export const DEMO_USERS = {
  user: {
    email: 'demo@hackathon.dev',
    name: 'Demo User',
    role: 'user' as const,
  },
  admin: {
    email: 'admin@hackathon.dev',
    name: 'Admin User',
    role: 'admin' as const,
  },
} as const;

/**
 * Demo-specific configuration.
 * Only active when FEATURE_DEMO_MODE=true.
 */
export const demoConfig = {
  users: DEMO_USERS,
  mockOtp: '123456',
} as const;
