'use server';

import { db } from '@/lib/db';
import { eventUpdates, events, tickets, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { validateEventOwnership, validateRole } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { sendEmail, constructAnnouncementEmail } from '@/core/services/email';

export async function createEventUpdate(data: {
  eventId: string;
  title: string;
  content: string;
  type?: string;
  sendEmail?: boolean;
  recipientRoles?: string[];
}) {
  // This publishes to — and emails — the event's attendees, so it has to be
  // scoped to that event's organisers.
  const user = await validateEventOwnership(data.eventId);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, data.eventId),
    });

    if (!event) return { success: false, error: 'Event not found' };

    await db.insert(eventUpdates).values({
      eventId: data.eventId,
      title: data.title,
      content: data.content,
      type: data.type || 'general',
      status: 'published',
      publishedAt: new Date(),
      createdBy: user.id,
      sendEmail: data.sendEmail ?? true,
      emailStats: { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, failed: 0 },
    });

    if (data.sendEmail) {
      const attendeeTickets = await db
        .select({ userId: tickets.userId })
        .from(tickets)
        .where(and(
          eq(tickets.eventId, data.eventId),
          eq(tickets.status, 'checked-in')
        ));

      let sent = 0;
      for (const ticket of attendeeTickets) {
        const attendee = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, ticket.userId) });
        if (!attendee?.email) continue;

        try {
          const emailContent = constructAnnouncementEmail(
            attendee.name || 'Attendee',
            event.title,
            data.content,
            data.type || 'general'
          );
          await sendEmail({
            to: attendee.email,
            subject: emailContent.subject,
            html: emailContent.html,
          });
          sent++;
          await new Promise(r => setTimeout(r, 100));
        } catch (e) {
          logger.error('Failed to send update email', e);
        }
      }

      logger.info(`Sent ${sent} update emails for ${event.title}`);
    }

    revalidatePath(`/events/${data.eventId}/notifications`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to create event update', error);
    return { success: false, error: 'Failed to create update' };
  }
}

export async function getEventUpdates(eventId: string) {
  try {
    const result = await db
      .select()
      .from(eventUpdates)
      .where(eq(eventUpdates.eventId, eventId))
      .orderBy(desc(eventUpdates.createdAt));

    return result;
  } catch (error) {
    logger.error('Failed to fetch event updates', error);
    return [];
  }
}

export async function deleteEventUpdate(updateId: string) {
  const existing = await db.query.eventUpdates.findFirst({
    where: eq(eventUpdates.id, updateId),
    columns: { eventId: true },
  });
  if (!existing) return { success: false, error: 'Update not found' };

  const user = await validateEventOwnership(existing.eventId);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    await db.delete(eventUpdates).where(eq(eventUpdates.id, updateId));
    revalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    logger.error('Failed to delete event update', error);
    return { success: false, error: 'Failed to delete update' };
  }
}
