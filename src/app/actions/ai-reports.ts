'use server';

import { aiReportGenerationFlow } from '@/lib/ai';
import { db } from '@/lib/db';
import { events, tickets, eventFeedback } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function generateEventReport(eventId: string, highlights?: string[]) {
  const user = await validateRole(['organizer', 'admin']);
  // Report generation is an LLM call; keep it well under the general budget.
  try {
    await enforceRateLimit({ userId: user.id, scope: 'ai:event-report', limit: 5 });
  } catch {
    return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
  }

  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    if (event.organizerId !== user.id && (user as any).role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    const [feedbackResult] = await db
      .select({
        count: sql<number>`count(*)`,
        avgRating: sql<number>`coalesce(avg(${eventFeedback.rating}), 0)`,
      })
      .from(eventFeedback)
      .where(eq(eventFeedback.eventId, eventId));

    const feedback = await db
      .select({
        rating: eventFeedback.rating,
        comment: eventFeedback.comment,
      })
      .from(eventFeedback)
      .where(eq(eventFeedback.eventId, eventId))
      .limit(50);

    const totalRevenue = Number(event.price) * event.registeredCount;

    const result = await aiReportGenerationFlow({
      eventTitle: event.title,
      eventDescription: event.description,
      category: event.category,
      totalAttendees: event.registeredCount,
      capacity: event.capacity,
      totalRevenue,
      budget: 0,
      feedback: feedback.map(f => ({
        rating: f.rating,
        comment: f.comment || undefined,
      })),
      keyHighlights: highlights,
    });

    return {
      success: true,
      report: {
        ...result,
        eventTitle: event.title,
        totalAttendees: event.registeredCount,
        totalRevenue,
        averageRating: Number(feedbackResult?.avgRating || 0),
        totalFeedback: Number(feedbackResult?.count || 0),
        generatedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    logger.error('AI report generation failed', error);
    return { success: false, error: 'Report generation failed' };
  }
}
