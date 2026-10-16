import { cacheProvider } from '../cache';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

export class RateLimiter {
  /**
   * Basic sliding/fixed window rate limiter relying on CacheProvider
   */
  async check(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const cacheKey = `ratelimit:${key}`;
    const now = Date.now();
    
    // Simplistic fixed window counting implementation for abstraction
    let record = await cacheProvider.get<{ count: number, resetAt: number }>(cacheKey);
    
    if (!record || record.resetAt < now) {
      record = { count: 0, resetAt: now + windowSeconds * 1000 };
    }
    
    record.count += 1;
    await cacheProvider.set(cacheKey, record, windowSeconds);

    return {
      allowed: record.count <= limit,
      limit,
      remaining: Math.max(0, limit - record.count),
      resetAt: record.resetAt,
    };
  }
}

export const rateLimiter = new RateLimiter();
