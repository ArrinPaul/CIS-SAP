'use server';

import { aiTaskGenerationFlow } from '@/lib/ai';
import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function generateEventTasks(eventId: string) {
  const user = await validateRole(['organizer', 'admin']);
  try {
    await enforceRateLimit({ userId: user.id, scope: 'ai:event-tasks', limit: 5 });
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

    const result = await aiTaskGenerationFlow({
      eventTitle: event.title,
      eventDescription: event.description,
      eventType: event.type || 'physical',
      category: event.category,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate.toISOString(),
      capacity: event.capacity,
      isOnline: event.type === 'online',
      isPaid: event.isPaid || false,
    });

    return { success: true, tasks: result.tasks };
  } catch (error) {
    logger.error('AI task generation failed', error);
    return { success: false, error: 'Task generation failed' };
  }
}
