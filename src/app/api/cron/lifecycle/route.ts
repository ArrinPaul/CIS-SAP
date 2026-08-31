import { NextRequest, NextResponse } from 'next/server';
import { runEventLifecycleSync } from '@/app/actions/event-lifecycle';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds maximum execution

/**
 * Automated Cron Trigger for Event Lifecycle, Feedback, and Waitlist Processing.
 * Secured with CRON_SECRET authorization header.
 */
export async function GET(request: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    const xCronHeader = request.headers.get('x-cron-secret');

    const providedSecret = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : xCronHeader;

    // If CRON_SECRET is configured in production, enforce strict authentication
    if (cronSecret && cronSecret !== providedSecret) {
      logger.warn('[Cron:Lifecycle] Unauthorized attempt to invoke lifecycle cron');
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid cron secret' },
        { status: 401 }
      );
    }

    const result = await runEventLifecycleSync();

    return NextResponse.json({
      success: true,
      message: 'Event lifecycle sync completed successfully',
      data: result,
    });
  } catch (error) {
    logger.error('[Cron:Lifecycle] Error executing lifecycle cron', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error during lifecycle sync' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
