import { expect, test, describe } from 'vitest';
import { hasPermission } from '../../modules/auth/authorization';

describe('Authorization Helpers', () => {
  test('admin role has admin permission', async () => {
    const result = await hasPermission('admin', 'admin');
    expect(result).toBe(true);
  });

  test('admin role has user permission', async () => {
    const result = await hasPermission('admin', 'user');
    expect(result).toBe(true);
  });

  test('user role has user permission', async () => {
    const result = await hasPermission('user', 'user');
    expect(result).toBe(true);
  });

  test('user role does not have admin permission', async () => {
    const result = await hasPermission('user', 'admin');
    expect(result).toBe(false);
  });

  test('unknown role does not have user permission', async () => {
    const result = await hasPermission('guest', 'user');
    expect(result).toBe(false);
  });
});
