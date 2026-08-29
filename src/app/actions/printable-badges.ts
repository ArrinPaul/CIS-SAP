'use server';

import { db } from '@/lib/db';
import { events, tickets, users, ticketTiers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { generateQrPayload } from '@/core/utils/crypto';
import { BadgeAttendeeData } from '@/core/utils/badge-generator';
import { format } from 'date-fns';

/**
 * Fetch all verified attendees for an event formatted for printable physical badges
 */
export async function getEventBadgeData(eventId: string): Promise<{
  success: boolean;
  event?: any;
  badges: BadgeAttendeeData[];
  error?: string;
}> {
  try {
    const user = await requireAuth();
    await validateEventOwnership(eventId);

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return { success: false, badges: [], error: 'Event not found' };
    }

    const eventTickets = await db.query.tickets.findMany({
      where: eq(tickets.eventId, eventId),
      with: {
        tier: true,
      },
      orderBy: [desc(tickets.createdAt)],
    });

    // Fetch user profiles for these tickets
    const userIds = [...new Set(eventTickets.map(t => t.userId))];
    const userRecords = await db.query.users.findMany({
      where: (u, { inArray }) => inArray(u.id, userIds),
    });

    const userMap = new Map(userRecords.map(u => [u.id, u]));

    const venue = typeof event.location === 'string'
      ? event.location
      : (event.location as any)?.venue || (event.location as any)?.address || 'Main Campus Stage';

    const badges: BadgeAttendeeData[] = eventTickets.map((t) => {
      const u = userMap.get(t.userId);
      const tierName = t.tier?.name?.toLowerCase() || '';

      let role: BadgeAttendeeData['role'] = 'attendee';
      if (tierName.includes('vip')) role = 'vip';
      else if (tierName.includes('speaker')) role = 'speaker';
      else if (tierName.includes('sponsor')) role = 'sponsor';
      else if (u?.role === 'organizer' || u?.id === event.organizerId) role = 'organizer';
      else if (u?.role === 'volunteer') role = 'volunteer';

      // Generate HMAC-SHA256 signed QR payload
      const qrPayload = generateQrPayload(t.ticketNumber);

      return {
        id: t.id,
        name: u?.name || 'Attendee',
        email: u?.email || '',
        role,
        companyOrCollege: u?.company || u?.college || '',
        designationOrDegree: u?.designation || u?.degree || '',
        ticketNumber: t.ticketNumber,
        entryCode: t.entryCode || undefined,
        qrPayload,
        eventTitle: event.title,
        eventDate: format(new Date(event.startDate), 'MMM dd, yyyy'),
        venueName: venue,
      };
    });

    return {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        startDate: event.startDate,
        venue,
      },
      badges,
    };
  } catch (error: any) {
    logger.error('Failed to get event badge data:', error);
    return { success: false, badges: [], error: error.message || 'Failed to load badge data' };
  }
}
