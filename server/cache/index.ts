export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

export class InMemoryCacheProvider implements CacheProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private store = new Map<string, { value: any, expiresAt?: number }>();

  async get<T>(key: string): Promise<T | null> {
    const record = this.store.get(key);
    if (!record) return null;
    if (record.expiresAt && record.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return record.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    // Basic prefix matching for pattern (e.g. "user:*")
    const prefix = pattern.replace('*', '');
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

// In the future, swap this with RedisCacheProvider
export const cacheProvider = new InMemoryCacheProvider();
