'use server';

import { db } from '@/lib/db';
import { tickets, events, waitlist, ticketTiers, notifications, users } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, desc, lt, or, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { enforceRateLimit } from '@/lib/rate-limit';

import { logActivity } from '@/lib/activity-log';
import { awardXP } from '@/lib/gamification/awards';
import { generateQrPayload, generateEntryCode } from '@/core/utils/crypto';
import { sendEmail, constructConfirmationEmail } from '@/core/services/email';
import { logger } from '@/lib/logger';

function getErrorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    const message = error.message;
    const isBusinessError =
      message.includes('Already registered') ||
      message.includes('Event not found') ||
      message.includes('Ticket tier not found') ||
      message.includes('This ticket tier is sold out') ||
      message.includes('Event is full') ||
      message.includes('Already on waitlist') ||
      message.includes('No active reservation found') ||
      message.includes('Your reservation has expired') ||
      message.includes('Ticket not found') ||
      message.includes('Unauthorized') ||
      message.includes('Rate limit exceeded');

    if (isBusinessError) {
      return message;
    }
  }
  return fallback;
}

/**
 * Register a user for an event (Create a ticket or join waitlist)
 */
export async function registerForEvent(eventId: string, data?: { tierId?: string }) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    // Rate limit: 5 registrations per minute per user
    await enforceRateLimit({
      userId: user.id,
      scope: 'register-event',
      limit: 5,
      windowMs: 60_000,
    });

    // 1. Check if already registered
    const existing = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), eq(tickets.userId, user.id)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, message: 'Already registered' };
    }

    // 2. Get event details
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
      with: {
        ticketTiers: true
      }
    });

    if (!event) return { success: false, error: 'Event not found' };

    // 3. Handle Tier Logic
    let tier = null;
    
    if (data?.tierId) {
      tier = await db.query.ticketTiers.findFirst({
        where: eq(ticketTiers.id, data.tierId)
      });
      if (!tier) return { success: false, error: 'Ticket tier not found' };
      if (tier.capacity !== -1 && tier.registeredCount >= tier.capacity) {
        if (event.waitlistEnabled) return joinWaitlist(eventId, user.id);
        return { success: false, error: 'This ticket tier is sold out' };
      }
    } else if (event.capacity !== -1 && event.registeredCount >= event.capacity) {
      if (event.waitlistEnabled) return joinWaitlist(eventId, user.id);
      return { success: false, error: 'Event is full' };
    }

    // 4. Create free ticket for public registration
    const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const entryCode = generateEntryCode();
    const expiresAt = new Date(event.endDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.transaction(async (tx) => {
      await tx.insert(tickets).values({
        eventId,
        userId: user.id,
        tierId: data?.tierId,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price: '0',
        qrCode: generateQrPayload(ticketNumber),
        expiresAt,
      });

      // Update registration counts. The capacity guard is re-checked here, in
      // the same statement that increments, so two concurrent registrations
      // cannot both slip past the pre-check above and oversell the event.
      const [updatedEvent] = await tx
        .update(events)
        .set({ registeredCount: sql`${events.registeredCount} + 1` })
        .where(and(
          eq(events.id, eventId),
          or(eq(events.capacity, -1), lt(events.registeredCount, events.capacity))
        ))
        .returning();

      if (!updatedEvent) {
        throw new Error('Event is full');
      }

      // Milestone Logic (skip for unlimited capacity events)
      if (updatedEvent.capacity > 0) {
        const percentage = Math.round((updatedEvent.registeredCount / updatedEvent.capacity) * 100);
        const milestones = [50, 80, 100];

        if (milestones.includes(percentage)) {
          await tx.insert(notifications).values({
            userId: updatedEvent.organizerId,
            title: 'Event Milestone Reached!',
            message: `Congratulations! ${updatedEvent.title} is now ${percentage}% full.`,
            type: 'achievement',
            link: `/organizer/pulse/${eventId}`
          });

          await logActivity({
            userId: updatedEvent.organizerId,
            type: 'badge_awarded',
            content: `${updatedEvent.title} reached ${percentage}% capacity milestone!`,
            targetId: eventId
          });
        }
      }

      if (data?.tierId) {
        // Same atomic re-check pattern as the event-level update above: the
        // capacity guard is re-verified in the same statement that
        // increments, so two concurrent registrations for the same tier
        // cannot both slip past the pre-check and oversell the tier.
        const [updatedTier] = await tx
          .update(ticketTiers)
          .set({ registeredCount: sql`${ticketTiers.registeredCount} + 1` })
          .where(and(
            eq(ticketTiers.id, data.tierId),
            or(eq(ticketTiers.capacity, -1), lt(ticketTiers.registeredCount, ticketTiers.capacity))
          ))
          .returning();

        if (!updatedTier) {
          throw new Error('This ticket tier is sold out');
        }
      }

      // Create notification
      await tx.insert(notifications).values({
        userId: user.id,
        title: 'Registration Confirmed',
        message: `Your registration for ${event.title} is confirmed. Ticket: ${ticketNumber}`,
        type: 'success',
      });
    });

    // Send confirmation email asynchronously (don't block the response)
    if (user.email) {
      const emailContent = constructConfirmationEmail(user.name || 'Attendee', event.title, ticketNumber, entryCode);
      sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch((err: unknown) => logger.error('Failed to send confirmation email', err));
    }

    // Log Activity
    await logActivity({
      userId: user.id,
      type: 'registration',
      targetId: eventId,
      metadata: {
        eventTitle: event.title,
        ticketNumber
      }
    });

    // Award XP
    await awardXP(user.id, 100, `Registering for ${event.title}`);

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/tickets');
    
    return { success: true, ticketNumber };
  } catch (error: any) {
    logger.error('Registration failed', error);
    return { success: false, error: getErrorText(error, 'Registration failed') };
  }
}

/**
 * Join the waitlist for an event
 */
async function joinWaitlist(eventId: string, userId: string) {
  try {
    const existing = await db
      .select()
      .from(waitlist)
      .where(and(eq(waitlist.eventId, eventId), eq(waitlist.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, message: 'Already on waitlist' };
    }

    // Get current max position
    const lastEntry = await db
      .select()
      .from(waitlist)
      .where(eq(waitlist.eventId, eventId))
      .orderBy(desc(waitlist.position))
      .limit(1);

    const position = (lastEntry[0]?.position || 0) + 1;

    await db.insert(waitlist).values({
      eventId,
      userId,
      position,
      status: 'waiting',
    });

    revalidatePath(`/events/${eventId}`);
    return { success: true, message: 'Added to waitlist', position };
  } catch (error) {
    logger.error('Waitlist join failed', error);
    return { success: false, error: 'Could not join waitlist' };
  }
}

/**
 * Promote the next person from waitlist (Reservation model)
 * Grants the user a 24-hour window to claim their spot.
 * If targetUserId is provided, it attempts to promote that specific user.
 */
export async function autoPromoteFromWaitlist(eventId: string, tx?: any, targetUserId?: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const executePromotion = async (transaction: any) => {
    // 1. Find the person to promote
    const query = transaction
      .select({
        id: waitlist.id,
        userId: waitlist.userId,
        user: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(waitlist)
      .innerJoin(users, eq(waitlist.userId, users.id));
    
    if (targetUserId) {
      query.where(and(eq(waitlist.eventId, eventId), eq(waitlist.userId, targetUserId), eq(waitlist.status, 'waiting')));
    } else {
      query.where(and(eq(waitlist.eventId, eventId), eq(waitlist.status, 'waiting'))).orderBy(waitlist.position);
    }

    const nextInLine = await query.limit(1);

    if (nextInLine.length === 0) return null;

    const entry = nextInLine[0];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24-hour window

    // 2. Mark waitlist entry as reserved
    await transaction
      .update(waitlist)
      .set({ 
        status: 'reserved', 
        expiresAt: expiresAt 
      })
      .where(eq(waitlist.id, entry.id));

    // 3. Notify the user
    await transaction.insert(notifications).values({
      userId: entry.userId,
      title: 'A spot is available!',
      message: `A spot opened up for your waitlisted event. You have 24 hours to claim it before it goes to the next person.`,
      type: 'achievement',
      link: `/events/${eventId}/claim-spot`
    });

    return entry.userId;
  };

  if (tx) return await executePromotion(tx);
  return await db.transaction(async (t) => await executePromotion(t));
}

/**
 * Cleanup expired waitlist reservations and promote the next person
 */
export async function processWaitlistReservations(eventId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  try {
    const now = new Date();
    
    // 1. Find expired reservations
    const expiredEntries = await db
      .select()
      .from(waitlist)
      .where(and(
        eq(waitlist.eventId, eventId),
        eq(waitlist.status, 'reserved'),
        sql`${waitlist.expiresAt} < ${now}`
      ));

    if (expiredEntries.length === 0) return { processed: 0 };

    await db.transaction(async (tx) => {
      for (const entry of expiredEntries) {
        // Mark as expired
        await tx
          .update(waitlist)
          .set({ status: 'expired' })
          .where(eq(waitlist.id, entry.id));
        
        // Notify user about loss of spot
        await tx.insert(notifications).values({
          userId: entry.userId,
          title: 'Reservation Expired',
          message: `Your 24-hour window to claim your spot has expired.`,
          type: 'info'
        });

        // Trigger next promotion
        await autoPromoteFromWaitlist(eventId, tx);
      }
    });

    return { processed: expiredEntries.length };
  } catch (error) {
    logger.error('processWaitlistReservations Error', error);
    return { processed: 0 };
  }
}

/**
 * Claim a reserved spot from the waitlist
 */
export async function claimWaitlistSpot(eventId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Auth required' };

  try {
    // Rate limit waitlist spot claim: 5 attempts per minute per user
    await enforceRateLimit({
      userId,
      scope: 'claim-waitlist',
      limit: 5,
      windowMs: 60_000,
    });

    const result = await db.transaction(async (tx) => {
      // 1. Verify reservation
      const entry = await tx.query.waitlist.findFirst({
        where: and(
          eq(waitlist.eventId, eventId),
          eq(waitlist.userId, userId),
          eq(waitlist.status, 'reserved')
        )
      });

      if (!entry) throw new Error('No active reservation found');
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        throw new Error('Your reservation has expired');
      }

      // 2. Create the real ticket
      const ticketNumber = `TKT-WAIT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const entryCode = generateEntryCode();

      const event = await tx.query.events.findFirst({ where: eq(events.id, eventId) });
      const expiresAt = new Date(event?.endDate || Date.now());
      expiresAt.setHours(expiresAt.getHours() + 24);

      await tx.insert(tickets).values({
        eventId,
        userId: userId,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price: '0',
        qrCode: generateQrPayload(ticketNumber),
        expiresAt,
      });

      // 3. Mark waitlist as promoted (fulfilled)
      await tx
        .update(waitlist)
        .set({ status: 'promoted' })
        .where(eq(waitlist.id, entry.id));

      // 4. Update event count
      await tx
        .update(events)
        .set({ registeredCount: sql`${events.registeredCount} + 1` })
        .where(eq(events.id, eventId));

      return { success: true, ticketNumber };
    });

    revalidatePath('/tickets');
    revalidatePath(`/events/${eventId}`);
    return result;
  } catch (error: any) {
    return { success: false, error: getErrorText(error, 'Failed to claim spot') };
  }
}


/**
 * Cancel a registration and trigger waitlist promotion
 */
export async function cancelRegistration(ticketId: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin']);

  try {
    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, ticketId)
    });

    if (!ticket) return { success: false, error: 'Ticket not found' };
    if (ticket.userId !== user.id && (user as any).role !== 'admin') {
      return { success: false, error: 'Unauthorized' };
    }

    await db.transaction(async (tx) => {
      // 1. Mark ticket as cancelled
      await tx
        .update(tickets)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(tickets.id, ticketId));

      // 2. Decrement count
      await tx
        .update(events)
        .set({ registeredCount: sql`${events.registeredCount} - 1` })
        .where(eq(events.id, ticket.eventId));

      // 3. Trigger waitlist promotion
      await autoPromoteFromWaitlist(ticket.eventId, tx);
    });

    revalidatePath('/tickets');
    revalidatePath(`/events/${ticket.eventId}`);
    return { success: true };
  } catch (error: any) {
    logger.error('Cancellation failed', error);
    return { success: false, error: getErrorText(error, 'Cancellation failed') };
  }
}

/**
 * Check if a user is registered for an event
 */
export async function getRegistrationStatus(eventId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const result = await db
      .select()
      .from(tickets)
      .where(
        and(
          eq(tickets.eventId, eventId),
          eq(tickets.userId, userId)
        )
      )
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Get all registrations for the current user
 */
export async function getUserRegistrations() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const result = await db
      .select({
        ticket: tickets,
        event: events,
      })
      .from(tickets)
      .innerJoin(events, eq(tickets.eventId, events.id))
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.purchaseDate));
    
    return result;
  } catch (error) {
    logger.error('Failed to fetch user registrations', error);
    return [];
  }
}

/**
 * Bulk import attendees (guests) for an event
 */
export async function importAttendees(eventId: string, guestList: { email: string, name?: string, tierId?: string }[]) {
  const user = await validateRole(['organizer', 'admin']);
  await validateEventOwnership(eventId);
  
  try {
    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const guest of guestList) {
      try {
        // 1. Find user
        const targetUser = await db.query.users.findFirst({
          where: eq(users.email, guest.email)
        });

        if (!targetUser) {
          results.failed++;
          results.errors.push(`User not found: ${guest.email}`);
          continue;
        }

        // 2. Check if already registered
        const existing = await db.query.tickets.findFirst({
          where: and(eq(tickets.eventId, eventId), eq(tickets.userId, targetUser.id))
        });

        if (existing) {
          results.failed++;
          results.errors.push(`Already registered: ${guest.email}`);
          continue;
        }

        // 3. Create ticket
        const ticketNumber = `TKT-GUEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const entryCode = generateEntryCode();

        const eventData = await db.query.events.findFirst({ where: eq(events.id, eventId) });
        const expiresAt = new Date(eventData?.endDate || Date.now());
        expiresAt.setHours(expiresAt.getHours() + 24);

        await db.transaction(async (tx) => {
          await tx.insert(tickets).values({
            eventId,
            userId: targetUser.id,
            tierId: guest.tierId || null,
            ticketNumber,
            entryCode,
            status: 'confirmed',
            price: '0',
            qrCode: generateQrPayload(ticketNumber),
            expiresAt,
          });

          await tx
            .update(events)
            .set({ registeredCount: sql`${events.registeredCount} + 1` })
            .where(eq(events.id, eventId));
        });

        results.success++;
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${guest.email}: ${e.message}`);
      }
    }

    revalidatePath(`/organizer/events/${eventId}`);
    return results;
  } catch (error: any) {
    logger.error('importAttendees Error', error);
    throw new Error('Failed to process guest list');
  }
}
