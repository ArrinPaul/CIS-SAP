'use server';

import { db } from '@/lib/db';
import { events, tickets, users, waitlist, notifications } from '@/lib/db/schema';
import { eq, and, lte, gt, lt, inArray } from 'drizzle-orm';
import { sendEmail, constructFeedbackEmail } from '@/core/services/email';
import { logger } from '@/lib/logger';

export interface LifecycleRunResult {
  activatedEventsCount: number;
  completedEventsCount: number;
  feedbackEmailsSentCount: number;
  expiredWaitlistCount: number;
  timestamp: string;
}

/**
 * Runs the full automated event lifecycle sync.
 * Designed to be called by a secure cron runner or admin trigger.
 */
export async function runEventLifecycleSync(): Promise<LifecycleRunResult> {
  const now = new Date();
  logger.info('[LifecycleSync] Starting automated event lifecycle processing...', { now: now.toISOString() });

  let activatedEventsCount = 0;
  let completedEventsCount = 0;
  let feedbackEmailsSentCount = 0;
  let expiredWaitlistCount = 0;

  try {
    // 1. Transition 'published' -> 'active' (event has started but not ended)
    const eventsToActivate = await db
      .select({ id: events.id, title: events.title })
      .from(events)
      .where(
        and(
          eq(events.status, 'published'),
          lte(events.startDate, now),
          gt(events.endDate, now)
        )
      );

    if (eventsToActivate.length > 0) {
      const idsToActivate = eventsToActivate.map(e => e.id);
      await db
        .update(events)
        .set({ status: 'active', updatedAt: now })
        .where(inArray(events.id, idsToActivate));

      activatedEventsCount = eventsToActivate.length;
      logger.info(`[LifecycleSync] Activated ${activatedEventsCount} events`, { ids: idsToActivate });
    }

    // 2. Transition 'active' (or 'published') -> 'completed' (event has ended)
    const eventsToComplete = await db
      .select({
        id: events.id,
        title: events.title,
        organizerId: events.organizerId,
        feedbackTemplateId: events.feedbackTemplateId,
      })
      .from(events)
      .where(
        and(
          inArray(events.status, ['active', 'published']),
          lte(events.endDate, now)
        )
      );

    if (eventsToComplete.length > 0) {
      const idsToComplete = eventsToComplete.map(e => e.id);
      await db
        .update(events)
        .set({ status: 'completed', updatedAt: now })
        .where(inArray(events.id, idsToComplete));

      completedEventsCount = eventsToComplete.length;
      logger.info(`[LifecycleSync] Completed ${completedEventsCount} events`, { ids: idsToComplete });

      // 3. Trigger Post-Event Automated Feedback & Notifications
      for (const event of eventsToComplete) {
        try {
          // Fetch confirmed/checked-in attendees for this event
          const attendeeTickets = await db
            .select({
              userId: tickets.userId,
              userName: users.name,
              userEmail: users.email,
            })
            .from(tickets)
            .innerJoin(users, eq(tickets.userId, users.id))
            .where(
              and(
                eq(tickets.eventId, event.id),
                inArray(tickets.status, ['confirmed', 'checked-in'])
              )
            );

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eventra.live';
          const feedbackUrl = `${appUrl}/events/${event.id}/feedback`;

          for (const attendee of attendeeTickets) {
            if (attendee.userEmail) {
              const emailContent = constructFeedbackEmail(
                attendee.userName || 'Attendee',
                event.title,
                feedbackUrl
              );

              // Dispatch feedback email asynchronously
              sendEmail({
                to: attendee.userEmail,
                subject: emailContent.subject,
                html: emailContent.html,
              }).catch(err => {
                logger.warn(`[LifecycleSync] Feedback email failed for ${attendee.userEmail}`, { error: String(err) });
              });

              feedbackEmailsSentCount++;
            }

            // Create In-App Notification
            await db.insert(notifications).values({
              userId: attendee.userId,
              title: `Feedback: ${event.title}`,
              message: `We hope you enjoyed ${event.title}! Share your thoughts with the organizers.`,
              type: 'system',
              link: `/events/${event.id}/feedback`,
              read: false,
            }).catch(() => {});
          }
        } catch (eventErr) {
          logger.error(`[LifecycleSync] Error dispatching post-event actions for event ${event.id}`, { error: String(eventErr) });
        }
      }
    }

    // 4. Expire Overdue Waitlist Reservations Across All Events
    const expiredEntries = await db
      .select({ id: waitlist.id, userId: waitlist.userId, eventId: waitlist.eventId })
      .from(waitlist)
      .where(
        and(
          eq(waitlist.status, 'reserved'),
          lt(waitlist.expiresAt, now)
        )
      );

    for (const entry of expiredEntries) {
      try {
        await db
          .update(waitlist)
          .set({ status: 'expired', updatedAt: now })
          .where(eq(waitlist.id, entry.id));

        await db.insert(notifications).values({
          userId: entry.userId,
          title: 'Reservation Expired',
          message: 'Your 24-hour window to claim your waitlist spot has expired.',
          type: 'info',
          read: false,
        }).catch(() => {});

        expiredWaitlistCount++;
      } catch (waitlistErr) {
        logger.warn(`[LifecycleSync] Failed waitlist cleanup for entry ${entry.id}`, { error: String(waitlistErr) });
      }
    }

  } catch (err) {
    logger.error('[LifecycleSync] Fatal error during lifecycle sync', { error: String(err) });
  }

  const result: LifecycleRunResult = {
    activatedEventsCount,
    completedEventsCount,
    feedbackEmailsSentCount,
    expiredWaitlistCount,
    timestamp: now.toISOString(),
  };

  logger.info('[LifecycleSync] Automated event lifecycle processing completed', result as any);
  return result;
}
