'use server';

import { db } from '@/lib/db';
import { networkingMeetings, users, events } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export interface RequestMeetingInput {
  eventId: string;
  recipientId: string;
  title: string;
  message?: string;
  startTime: string; // ISO date
  durationMinutes?: number; // 15 or 30 mins default
  meetingType?: 'virtual' | 'in_person';
  locationDetails?: string;
}

/**
 * Pure conflict detection helper
 */
export function checkSlotConflict(
  newStart: Date,
  newEnd: Date,
  existingMeetings: { startTime: Date; endTime: Date; status: string }[]
): boolean {
  return existingMeetings.some((m) => {
    if (m.status === 'declined' || m.status === 'cancelled') return false;
    const start = new Date(m.startTime);
    const end = new Date(m.endTime);
    // Overlap check: startA < endB && endA > startB
    return newStart < end && newEnd > start;
  });
}

/**
 * Pure available slot generation helper
 */
export function generateAvailableSlots(
  baseDate: Date,
  startHour: number = 9,
  endHour: number = 18,
  durationMinutes: number = 15
): { startTime: Date; endTime: Date; label: string }[] {
  const slots: { startTime: Date; endTime: Date; label: string }[] = [];
  const current = new Date(baseDate);
  current.setHours(startHour, 0, 0, 0);

  const endOfDay = new Date(baseDate);
  endOfDay.setHours(endHour, 0, 0, 0);

  while (current < endOfDay) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + durationMinutes * 60 * 1000);

    const timeLabel = slotStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    slots.push({
      startTime: slotStart,
      endTime: slotEnd,
      label: timeLabel,
    });

    current.setTime(current.getTime() + durationMinutes * 60 * 1000);
  }

  return slots;
}

/**
 * Request a 1-on-1 meeting with an attendee / speaker
 */
export async function requestMeeting(input: RequestMeetingInput) {
  try {
    const user = await requireAuth();

    if (user.id === input.recipientId) {
      return { success: false, error: 'You cannot book a 1-on-1 meeting with yourself.' };
    }

    const duration = input.durationMinutes || 15;
    const startDate = new Date(input.startTime);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    if (startDate < new Date()) {
      return { success: false, error: 'Meeting time must be in the future.' };
    }

    // Check existing meetings of recipient to prevent double bookings
    const recipientMeetings = await db.query.networkingMeetings.findMany({
      where: and(
        eq(networkingMeetings.recipientId, input.recipientId),
        eq(networkingMeetings.eventId, input.eventId as any)
      ),
    });

    const hasConflict = checkSlotConflict(startDate, endDate, recipientMeetings);
    if (hasConflict) {
      return {
        success: false,
        error: 'This attendee already has a scheduled meeting at this time slot. Please choose another slot.',
      };
    }

    const roomId = `meet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const [created] = await db.insert(networkingMeetings).values({
      eventId: input.eventId as any,
      requesterId: user.id,
      recipientId: input.recipientId,
      title: input.title.trim(),
      message: input.message?.trim() || null,
      startTime: startDate,
      endTime: endDate,
      durationMinutes: duration,
      status: 'pending',
      meetingType: input.meetingType || 'virtual',
      locationDetails: input.locationDetails || (input.meetingType === 'in_person' ? 'Networking Lounge' : 'Virtual Stage Room'),
      roomId,
    }).returning();

    revalidatePath('/networking');
    return { success: true, meeting: created };
  } catch (error: any) {
    logger.error('Failed to request meeting:', error);
    return { success: false, error: error.message || 'Failed to request meeting' };
  }
}

/**
 * Respond to an incoming meeting request ('accept' | 'decline')
 */
export async function respondToMeeting(meetingId: string, action: 'accept' | 'decline') {
  try {
    const user = await requireAuth();

    const meeting = await db.query.networkingMeetings.findFirst({
      where: eq(networkingMeetings.id, meetingId as any),
    });

    if (!meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    if (meeting.recipientId !== user.id) {
      return { success: false, error: 'Unauthorized: Only the recipient can respond to this request.' };
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    await db.update(networkingMeetings).set({
      status: newStatus,
      updatedAt: new Date(),
    }).where(eq(networkingMeetings.id, meetingId as any));

    revalidatePath('/networking');
    return { success: true, status: newStatus };
  } catch (error: any) {
    logger.error('Failed to respond to meeting:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancel a meeting (requester or recipient)
 */
export async function cancelMeeting(meetingId: string) {
  try {
    const user = await requireAuth();

    const meeting = await db.query.networkingMeetings.findFirst({
      where: eq(networkingMeetings.id, meetingId as any),
    });

    if (!meeting) {
      return { success: false, error: 'Meeting not found' };
    }

    if (meeting.requesterId !== user.id && meeting.recipientId !== user.id) {
      return { success: false, error: 'Unauthorized to cancel this meeting.' };
    }

    await db.update(networkingMeetings).set({
      status: 'cancelled',
      updatedAt: new Date(),
    }).where(eq(networkingMeetings.id, meetingId as any));

    revalidatePath('/networking');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all meetings (incoming & outgoing) for current user
 */
export async function getUserMeetings(eventId?: string) {
  try {
    const user = await requireAuth();

    const queryWhere = eventId
      ? and(
          or(
            eq(networkingMeetings.requesterId, user.id),
            eq(networkingMeetings.recipientId, user.id)
          ),
          eq(networkingMeetings.eventId, eventId as any)
        )
      : or(
          eq(networkingMeetings.requesterId, user.id),
          eq(networkingMeetings.recipientId, user.id)
        );

    const list = await db.query.networkingMeetings.findMany({
      where: queryWhere,
      with: {
        requester: true,
        recipient: true,
        event: true,
      },
      orderBy: [desc(networkingMeetings.startTime)],
    });

    const incoming = list.filter((m) => m.recipientId === user.id);
    const outgoing = list.filter((m) => m.requesterId === user.id);
    const confirmed = list.filter((m) => m.status === 'accepted');

    return {
      success: true,
      meetings: list,
      incoming,
      outgoing,
      confirmed,
    };
  } catch (error: any) {
    logger.error('Failed to get user meetings:', error);
    return {
      success: false,
      meetings: [],
      incoming: [],
      outgoing: [],
      confirmed: [],
      error: error.message,
    };
  }
}
