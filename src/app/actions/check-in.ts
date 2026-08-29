'use server';

import { db } from '@/lib/db';
import { tickets, events, activityFeed, eventStaff, notifications, users } from '@/lib/db/schema';
import { eq, and, sql, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateRole, validateEventOwnership, validateStaffPermission } from '@/lib/auth-utils';
import { enforceRateLimit } from '@/lib/rate-limit';
import { awardXP } from '@/lib/gamification/awards';
import { logActivity } from './feed';
import { parseQrPayload } from '@/core/utils/crypto';
import { logger } from '@/lib/logger';

/**
 * Fetch events that the user is authorized to scan for.
 * (Organizer's own events or all if admin)
 */
export async function getScannerEvents() {
  const user = await validateRole(['organizer', 'admin']);
  
  try {
    let result;
    if ((user as any).role === 'admin') {
      result = await db
        .select({
          id: events.id,
          title: events.title,
          registeredCount: events.registeredCount,
          capacity: events.capacity,
          organizerId: events.organizerId,
          startDate: events.startDate,
          endDate: events.endDate
        })
        .from(events);
    } else {
      // Find events where user is organizer OR staff
      const organizerEvents = db
        .select({ id: events.id })
        .from(events)
        .where(eq(events.organizerId, user.id!));
      
      const staffEvents = db
        .select({ id: eventStaff.eventId })
        .from(eventStaff)
        .where(eq(eventStaff.userId, user.id!));

      result = await db
        .select({
          id: events.id,
          title: events.title,
          registeredCount: events.registeredCount,
          capacity: events.capacity,
          organizerId: events.organizerId,
          startDate: events.startDate,
          endDate: events.endDate
        })
        .from(events)
        .where(
          sql`${events.id} IN (${organizerEvents}) OR ${events.id} IN (${staffEvents})`
        );
    }

    // Get check-in counts for each event
    const eventsWithStats = await Promise.all(result.map(async (event) => {
      const checkInCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(tickets)
        .where(and(
          eq(tickets.eventId, event.id),
          eq(tickets.status, 'checked-in')
        ));
      
      return {
        ...event,
        checkInCount: Number(checkInCount[0]?.count || 0)
      };
    }));

    return eventsWithStats;
  } catch (error) {
    logger.error('getScannerEvents Error', error);
    return [];
  }
}

/**
 * Process a check-in for a specific ticket payload and event.
 */
export async function checkInTicket(payload: string, eventId: string) {
  // 1. Security check: Ensure the user has granular permission to scan
  const staffUser = await validateStaffPermission(eventId, 'scan_tickets');

  const { ticketNumber, isValid } = parseQrPayload(payload);

  // Determine lookup method: QR code, ticket number, or 6-digit entry code
  let targetTicketNumber: string | null = null;
  let isEntryCode = false;

  if (isValid) {
    targetTicketNumber = ticketNumber;
  } else if (payload.startsWith('TKT-')) {
    targetTicketNumber = payload;
  } else if (/^\d{6}$/.test(payload)) {
    isEntryCode = true;
  } else {
    throw new Error('Invalid input: Expected QR code, ticket number (TKT-...), or 6-digit entry code');
  }

  try {
    // Rate limit check-in scans: 60 scans per minute per staff member
    await enforceRateLimit({
      userId: staffUser.id,
      scope: 'ticket-checkin',
      limit: 60,
      windowMs: 60_000,
    });

    // 2. Find the ticket and event details
    const ticket = await db.query.tickets.findFirst({
      where: isEntryCode
        ? and(eq(tickets.entryCode, payload), eq(tickets.eventId, eventId))
        : and(eq(tickets.ticketNumber, targetTicketNumber!), eq(tickets.eventId, eventId)),
      with: {
        user: true,
        event: true
      }
    });

    if (!ticket) {
      throw new Error('Invalid Ticket: No matching record found for this event');
    }

    // 3. Event Timing Validation
    const now = new Date();
    const event = ticket.event;
    
    // Buffer for early check-in (e.g., 2 hours before)
    const checkInStartTime = new Date(event.startDate.getTime() - (2 * 60 * 60 * 1000));
    
    if (now < checkInStartTime) {
      throw new Error(`Too Early: Check-in for this event starts at ${checkInStartTime.toLocaleTimeString()}`);
    }
    
    if (now > event.endDate) {
      throw new Error(`Event Finished: This event ended at ${event.endDate.toLocaleString()}`);
    }

    // 4. State Machine & Anti-Fraud Logic
    if (ticket.status === 'checked-in') {
      throw new Error(`Already Scanned: This ticket was checked in at ${ticket.updatedAt?.toLocaleString() || 'an earlier time'}`);
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      throw new Error(`Invalid Ticket: This registration has been ${ticket.status}`);
    }

    if (ticket.status === 'expired') {
      throw new Error('Invalid Ticket: This ticket has expired');
    }

    // 5. Perform Check-in (with race-condition protection)
    const checkInTime = new Date();
    const updatedTicket = await db.transaction(async (tx) => {
      const [result] = await tx
        .update(tickets)
        .set({
          status: 'checked-in',
          verifiedAt: checkInTime,
          verifiedBy: staffUser.id,
          updatedAt: checkInTime,
        })
        .where(and(
          eq(tickets.id, ticket.id),
          eq(tickets.status, 'confirmed')
        ))
        .returning();

      return result;
    });

    if (!updatedTicket) {
      const currentTicket = await db.query.tickets.findFirst({
        where: eq(tickets.id, ticket.id)
      });
      if (currentTicket && currentTicket.status === 'checked-in') {
        throw new Error(`Already Scanned: This ticket was checked in at ${currentTicket.updatedAt?.toLocaleString() || 'an earlier time'}`);
      }
      throw new Error('Check-in failed: Ticket status was modified concurrently by another scan.');
    }

    // 6. Post-Check-in Actions (Background)
    
    // Award XP to the attendee for showing up
    awardXP(ticket.userId, 50, `Attending ${ticket.event.title}`).catch((err) => logger.error('Award XP failed', err));
    
    // Log Activity for the attendee
    logActivity({
      userId: ticket.userId,
      type: 'event_checkin',
      targetId: eventId,
      content: `Checked into ${ticket.event.title}`,
      metadata: { ticketNumber }
    }).catch((err) => logger.error('Log check-in activity failed', err));

    // Schedule Feedback Notification
    db.insert(notifications).values({
      userId: ticket.userId,
      title: 'How was the event?',
      message: `We hope you're enjoying ${ticket.event.title}! Don't forget to share your feedback.`,
      type: 'info',
      link: `/events/${eventId}/feedback`
    }).catch((err) => logger.error('Insert check-in notification failed', err));

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/check-in-scanner');

    return {
      success: true,
      ticket: {
        ...updatedTicket,
        userName: ticket.user.name,
        userImage: ticket.user.image,
        entryCode: ticket.entryCode,
        verifiedAt: now,
      }
    };
  } catch (error: any) {
    logger.error('Check-in processing error', error, { scope: 'ticket-checkin' });
    const message = error?.message || '';
    const isBusinessError =
      message.includes('Invalid QR Code') ||
      message.includes('Rate limit exceeded') ||
      message.includes('Invalid Ticket') ||
      message.includes('Too Early') ||
      message.includes('Event Finished') ||
      message.includes('Already Scanned') ||
      message.includes('Check-in failed: Ticket status') ||
      message.includes('Unauthorized') ||
      message.includes('Event not found');

    if (isBusinessError) {
      throw error;
    }
    throw new Error('Check-in failed due to an internal error');
  }
}

/**
 * Mark all un-scanned tickets as expired for an event.
 */
export async function finalizeEvent(eventId: string) {
  await validateStaffPermission(eventId, 'manage_content');

  try {
    const result = await db
      .update(tickets)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(and(
        eq(tickets.eventId, eventId),
        eq(tickets.status, 'confirmed')
      ))
      .returning();

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/check-in-scanner');

    return { success: true, expiredCount: result.length };
  } catch (error: any) {
    logger.error('Finalize Event Error', error);
    throw new Error('Failed to finalize event');
  }
}

/**
 * Fetch all confirmed tickets for an event (for offline verification).
 */
export async function getAttendeeList(eventId: string) {
  await validateStaffPermission(eventId, 'scan_tickets');

  try {
    const result = await db
      .select({
        ticketNumber: tickets.ticketNumber,
        qrCode: tickets.qrCode,
        status: tickets.status,
        userName: users.name,
        userImage: users.image
      })
      .from(tickets)
      .innerJoin(users, eq(tickets.userId, users.id))
      .where(eq(tickets.eventId, eventId));

    return result;
  } catch (error) {
    logger.error('getAttendeeList Error', error);
    return [];
  }
}
