'use server';

import { db } from '@/lib/db';
import { eventFeedback, events, users, tickets } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { 
  calculateNps, 
  calculateFeedbackAverages, 
  shouldPromptFeedback,
  FeedbackRecord 
} from '@/core/utils/nps-analytics';

export interface SubmitPostEventFeedbackInput {
  eventId: string;
  rating: number; // 1 to 5
  npsScore?: number; // 0 to 10
  venueRating?: number; // 1 to 5
  contentRating?: number; // 1 to 5
  organizationRating?: number; // 1 to 5
  comment?: string;
  highlight?: string;
  improvement?: string;
  allowTestimonial?: boolean;
}

/**
 * Submit post-event survey response (Attendee)
 */
export async function submitPostEventFeedback(input: SubmitPostEventFeedbackInput) {
  try {
    const user = await requireAuth();

    // Check if user is registered for the event
    const userTicket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.eventId, input.eventId as any),
        eq(tickets.userId, user.id)
      ),
    });

    if (!userTicket) {
      return { success: false, error: 'Only registered attendees can submit event feedback.' };
    }

    // Check if already submitted
    const existing = await db.query.eventFeedback.findFirst({
      where: and(
        eq(eventFeedback.eventId, input.eventId as any),
        eq(eventFeedback.userId, user.id)
      ),
    });

    if (existing) {
      // Update existing feedback
      await db.update(eventFeedback).set({
        rating: Math.min(5, Math.max(1, Math.round(input.rating))),
        npsScore: input.npsScore !== undefined ? Math.min(10, Math.max(0, input.npsScore)) : null,
        venueRating: input.venueRating || null,
        contentRating: input.contentRating || null,
        organizationRating: input.organizationRating || null,
        comment: input.comment?.trim() || null,
        highlight: input.highlight?.trim() || null,
        improvement: input.improvement?.trim() || null,
        allowTestimonial: input.allowTestimonial ?? false,
      }).where(eq(eventFeedback.id, existing.id));

      revalidatePath(`/events/${input.eventId}`);
      revalidatePath(`/organizer/feedback`);
      return { success: true, message: 'Your feedback has been updated! Thank you.' };
    }

    // Insert new feedback
    await db.insert(eventFeedback).values({
      eventId: input.eventId as any,
      userId: user.id,
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      npsScore: input.npsScore !== undefined ? Math.min(10, Math.max(0, input.npsScore)) : null,
      venueRating: input.venueRating || null,
      contentRating: input.contentRating || null,
      organizationRating: input.organizationRating || null,
      comment: input.comment?.trim() || null,
      highlight: input.highlight?.trim() || null,
      improvement: input.improvement?.trim() || null,
      allowTestimonial: input.allowTestimonial ?? false,
    });

    revalidatePath(`/events/${input.eventId}`);
    revalidatePath(`/organizer/feedback`);
    return { success: true, message: 'Thank you for sharing your feedback! 🎉' };
  } catch (error: any) {
    logger.error('Failed to submit post-event feedback:', error);
    return { success: false, error: error.message || 'Failed to submit feedback' };
  }
}

/**
 * Check if the logged-in user should see the post-event survey prompt
 */
export async function checkUserFeedbackEligibility(eventId: string) {
  try {
    const user = await requireAuth();

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId as any),
    });

    if (!event) return { shouldPrompt: false };

    const ticket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.eventId, eventId as any),
        eq(tickets.userId, user.id)
      ),
    });

    if (!ticket) return { shouldPrompt: false };

    const existingFeedback = await db.query.eventFeedback.findFirst({
      where: and(
        eq(eventFeedback.eventId, eventId as any),
        eq(eventFeedback.userId, user.id)
      ),
    });

    const isEligible = shouldPromptFeedback(
      { startDate: event.startDate, endDate: event.endDate, status: event.status },
      !!ticket,
      !!existingFeedback
    );

    return {
      shouldPrompt: isEligible,
      hasSubmitted: !!existingFeedback,
      eventTitle: event.title,
    };
  } catch {
    return { shouldPrompt: false };
  }
}

/**
 * Get comprehensive NPS and Feedback summary for Organizers
 */
export async function getEventNpsAndFeedback(eventId: string) {
  try {
    const user = await requireAuth();
    await validateEventOwnership(eventId);

    const feedbacks = await db.query.eventFeedback.findMany({
      where: eq(eventFeedback.eventId, eventId as any),
      with: {
        user: true,
      },
      orderBy: [desc(eventFeedback.createdAt)],
    });

    const feedbackRecords: FeedbackRecord[] = feedbacks.map((f) => ({
      rating: f.rating,
      npsScore: f.npsScore,
      venueRating: f.venueRating,
      contentRating: f.contentRating,
      organizationRating: f.organizationRating,
      comment: f.comment,
      highlight: f.highlight,
      improvement: f.improvement,
      allowTestimonial: f.allowTestimonial,
    }));

    const npsSummary = calculateNps(feedbackRecords);
    const averages = calculateFeedbackAverages(feedbackRecords);

    const testimonials = feedbacks
      .filter((f) => f.allowTestimonial && (f.comment || f.highlight))
      .map((f) => ({
        id: f.id,
        userName: f.user?.name || 'Verified Attendee',
        userRole: f.user?.role,
        rating: f.rating,
        quote: f.highlight || f.comment,
        createdAt: f.createdAt,
      }));

    return {
      success: true,
      feedbacks,
      npsSummary,
      averages,
      testimonials,
    };
  } catch (error: any) {
    logger.error('Failed to get event feedback summary:', error);
    return { success: false, error: error.message };
  }
}
