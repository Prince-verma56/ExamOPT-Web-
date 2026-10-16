/**
 * Prisma Client Singleton
 *
 * Prevents multiple Prisma Client instances in development
 * due to Next.js hot-reloading.
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // A failed hosted-database connection must produce an actionable API
    // response rather than leave dashboard requests pending indefinitely.
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 10_000,
    max: 5,
  });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

export const db =
  globalForPrisma.prisma ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
