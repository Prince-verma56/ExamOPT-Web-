/**
 * Tests - Unit
 *
 * Example unit test file.
 * Run: npm run test:unit
 */

import { describe, it, expect } from 'vitest';
import { generateId } from '@/lib/utils';

describe('generateId', () => {
  it('should generate a string of the default length', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate different IDs', () => {
    const a = generateId();
    const b = generateId();
    expect(a).not.toBe(b);
  });
});
