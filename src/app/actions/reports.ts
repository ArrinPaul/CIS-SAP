'use server';

import { db } from '@/lib/db';
import { reports, events } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { validateEventOwnership, validateRole } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { generateEventReport } from './ai-reports';

export async function generateAndSaveReport(eventId: string, highlights?: string[]) {
  const user = await validateRole(['organizer', 'admin']);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const result = await generateEventReport(eventId, highlights);
    if (!result.success) return result;

    await db.insert(reports).values({
      eventId,
      organizerId: user.id,
      preparedBy: user.name || user.email,
      keyHighlights: highlights || [],
      generatedContent: JSON.stringify(result.report),
    });

    revalidatePath(`/events/${eventId}/report`);
    return { success: true, report: result.report };
  } catch (error) {
    logger.error('Failed to generate report', error);
    return { success: false, error: 'Failed to generate report' };
  }
}

export async function getEventReports(eventId: string) {
  // Reports include revenue and attendance figures.
  await validateEventOwnership(eventId);

  try {
    const result = await db
      .select()
      .from(reports)
      .where(eq(reports.eventId, eventId))
      .orderBy(desc(reports.createdAt));

    return result;
  } catch (error) {
    logger.error('Failed to fetch reports', error);
    return [];
  }
}
