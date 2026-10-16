import { expect, test, describe, vi, beforeEach } from 'vitest';
import { isFeatureEnabled, features } from '../../config/features';

describe('Feature Flags', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  test('preloader flag exists', () => {
    expect(features).toHaveProperty('preloader');
  });

  test('auth flag exists', () => {
    expect(features).toHaveProperty('auth');
  });

  test('isFeatureEnabled correctly returns boolean', () => {
    // Relying on the static export from features.ts where defaults are set
    // It's technically evaluated at import time, so we just verify the output is boolean
    expect(typeof isFeatureEnabled('preloader')).toBe('boolean');
    expect(typeof isFeatureEnabled('auth')).toBe('boolean');
  });
});
