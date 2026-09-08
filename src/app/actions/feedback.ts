'use server';

import { db } from '@/lib/db';
import { feedbackTemplates, eventFeedback, events, notifications, tickets } from '@/lib/db/schema';
import { eq, and, desc, sql, avg } from 'drizzle-orm';
import { validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { sendEmail, constructFeedbackEmail } from '@/core/services/email';
import { logger } from '@/lib/logger';

/**
 * Upsert a feedback template
 */
export async function upsertFeedbackTemplate(data: {
  id?: string;
  eventId?: string;
  title: string;
  description?: string;
  questions: any[];
  isDefault?: boolean;
}) {
  const user = await validateRole(['organizer', 'admin']);

  if (data.eventId) {
    await validateEventOwnership(data.eventId);
  }

  if (data.id) {
    // Authorise against the template's own event, not the supplied eventId.
    const existing = await db.query.feedbackTemplates.findFirst({
      where: eq(feedbackTemplates.id, data.id),
    });
    if (!existing) throw new Error('Feedback template not found');
    if (existing.eventId) {
      await validateEventOwnership(existing.eventId);
    } else {
      await validateRole(['admin']);
    }
  } else if (!data.eventId) {
    await validateRole(['admin']);
  }

  try {
    if (data.id) {
      const [updated] = await db
        .update(feedbackTemplates)
        .set({
          title: data.title,
          description: data.description,
          questions: data.questions,
          isDefault: data.isDefault ?? false,
        })
        .where(eq(feedbackTemplates.id, data.id))
        .returning();
      
      return updated;
    } else {
      const [created] = await db
        .insert(feedbackTemplates)
        .values({
          eventId: data.eventId,
          title: data.title,
          description: data.description,
          questions: data.questions,
          isDefault: data.isDefault ?? false,
        })
        .returning();
      
      // If linked to event, update event feedbackTemplateId
      if (data.eventId) {
        await db
          .update(events)
          .set({ feedbackTemplateId: created.id })
          .where(eq(events.id, data.eventId));
      }
      
      return created;
    }
  } catch (error) {
    console.error('upsertFeedbackTemplate Error:', error);
    throw new Error('Failed to save feedback template');
  }
}

/**
 * Get feedback templates
 */
export async function getFeedbackTemplates(eventId?: string) {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const conditions = [];
    if (eventId) {
      conditions.push(sql`${feedbackTemplates.eventId} = ${eventId} OR ${feedbackTemplates.isDefault} = true`);
    } else {
      conditions.push(eq(feedbackTemplates.isDefault, true));
    }

    return await db
      .select()
      .from(feedbackTemplates)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(feedbackTemplates.createdAt));
  } catch (error) {
    console.error('getFeedbackTemplates Error:', error);
    return [];
  }
}

/**
 * Submit feedback for an event
 */
export async function submitEventFeedback(data: {
  eventId: string;
  rating: number;
  comment?: string;
  responses?: any;
  isAnonymous?: boolean;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  // Attendance is required regardless of `isAnonymous`: anonymity affects how
  // the response is displayed, it is not a way around the eligibility check.
  const ticket = await db.query.tickets.findFirst({
    where: and(
      eq(tickets.eventId, data.eventId),
      eq(tickets.userId, userId),
      eq(tickets.status, 'checked-in')
    )
  });

  if (!ticket) {
    throw new Error('You can only leave feedback for events you have attended.');
  }

  // Verify the user hasn't already submitted feedback
  const existingFeedback = await db.query.eventFeedback.findFirst({
    where: and(
      eq(eventFeedback.eventId, data.eventId),
      eq(eventFeedback.userId, userId)
    )
  });

  if (existingFeedback) {
    throw new Error('You have already submitted feedback for this event.');
  }

  try {
    const [feedback] = await db
      .insert(eventFeedback)
      .values({
        eventId: data.eventId,
        userId: userId,
        rating: data.rating,
        comment: data.comment,
        responses: data.responses,
      })
      .returning();

    revalidatePath(`/events/${data.eventId}`);
    return feedback;
  } catch (error) {
    console.error('submitEventFeedback Error:', error);
    throw new Error('Failed to submit feedback');
  }
}

/**
 * Get feedback analytics for an event
 */
export async function getEventFeedbackAnalytics(eventId: string) {
  await validateEventOwnership(eventId);

  try {
    const feedbackList = await db
      .select()
      .from(eventFeedback)
      .where(eq(eventFeedback.eventId, eventId))
      .orderBy(desc(eventFeedback.createdAt));

    const averageRating = await db
      .select({ value: avg(eventFeedback.rating) })
      .from(eventFeedback)
      .where(eq(eventFeedback.eventId, eventId));

    // Calculate NPS (Net Promoter Score)
    // NPS = % Promoters (9-10) - % Detractors (0-6)
    // Since our rating is likely 1-5, let's map: 5=Promoter, 4=Passive, 1-3=Detractor
    const total = feedbackList.length;
    if (total === 0) return { averageRating: 0, nps: 0, total: 0, feedbackList: [] };

    const promoters = feedbackList.filter(f => f.rating === 5).length;
    const detractors = feedbackList.filter(f => f.rating <= 3).length;
    const nps = Math.round(((promoters - detractors) / total) * 100);

    return {
      averageRating: Number(averageRating[0]?.value || 0).toFixed(1),
      nps,
      total,
      feedbackList
    };
  } catch (error) {
    console.error('getEventFeedbackAnalytics Error:', error);
    throw new Error('Failed to load analytics');
  }
}

/**
 * Send feedback request emails to all attendees
 */
export async function sendFeedbackEmails(eventId: string) {
  const user = await validateRole(['organizer', 'admin']);
  await validateEventOwnership(eventId);

  try {
    const event = await db.query.events.findFirst({ where: eq(events.id, eventId) });
    if (!event) throw new Error('Event not found');

    const attendeeTickets = await db
      .select({ userId: tickets.userId })
      .from(tickets)
      .where(and(
        eq(tickets.eventId, eventId),
        eq(tickets.status, 'checked-in')
      ));

    let sent = 0;
    let failed = 0;

    for (const ticket of attendeeTickets) {
      const attendee = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, ticket.userId) });
      if (!attendee?.email) { failed++; continue; }

      try {
        const emailContent = constructFeedbackEmail(
          attendee.name || 'Attendee',
          event.title,
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/events/${eventId}/feedbacks`
        );
        await sendEmail({
          to: attendee.email,
          subject: emailContent.subject,
          html: emailContent.html,
        });
        sent++;
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        failed++;
      }
    }

    return { success: true, sent, failed };
  } catch (error) {
    logger.error('Failed to send feedback emails', error);
    throw new Error('Failed to send feedback emails');
  }
}
