import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    const start = Date.now();
    await db.execute(sql`SELECT 1`);
    const latency = Date.now() - start;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Eventra',
      database: {
        status: 'operational',
        latency: `${latency}ms`,
      },
    });
  } catch (error: any) {
    logger.error('Health check failed', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'Eventra',
        database: {
          status: 'down',
        },
      },
      { status: 503 }
    );
  }
}
