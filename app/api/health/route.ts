import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { cacheProvider } from '@/server/cache';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'liveness';

  // Liveness check: Just returns that the API process is running
  if (type === 'liveness') {
    return NextResponse.json({
      status: 'ok',
      type: 'liveness',
      timestamp: new Date().toISOString(),
    });
  }

  // Readiness check: Verifies connections to required dependencies (DB, Cache)
  if (type === 'readiness') {
    let dbStatus = 'ok';
    let cacheStatus = 'ok';

    try {
      await db.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'down';
    }

    try {
      await cacheProvider.set('health_check', 'ok', 5);
      const res = await cacheProvider.get('health_check');
      if (res !== 'ok') cacheStatus = 'down';
    } catch (e) {
      cacheStatus = 'down';
    }

    const isReady = dbStatus === 'ok' && cacheStatus === 'ok';

    return NextResponse.json({
      status: isReady ? 'ok' : 'down',
      type: 'readiness',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: dbStatus,
        cache: cacheStatus,
      }
    }, { status: isReady ? 200 : 503 });
  }

  return NextResponse.json({ error: 'Invalid check type. Use liveness or readiness.' }, { status: 400 });
}
