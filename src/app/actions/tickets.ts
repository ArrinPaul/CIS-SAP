'use server';

import { db } from '@/lib/db';
import { tickets } from '@/lib/db/schema';
import { eq, isNull, sql, or } from 'drizzle-orm';
import { validateRole, validateStaffPermission } from '@/lib/auth-utils';
import { refreshExpiredTicketStatuses } from '@/lib/ticket-status';
import { revalidatePath } from 'next/cache';

/**
 * Sync all tickets that have missing QR codes.
 * This ensures data integrity if the qr_code field was added later.
 */
export async function syncTicketQRCodes() {
  await validateRole(['admin']);

  try {
    const missingQRTickets = await db
      .select({ id: tickets.id, ticketNumber: tickets.ticketNumber })
      .from(tickets)
      .where(or(isNull(tickets.qrCode), eq(tickets.qrCode, '')));

    let updatedCount = 0;
    for (const ticket of missingQRTickets) {
      await db
        .update(tickets)
        .set({ qrCode: ticket.ticketNumber })
        .where(eq(tickets.id, ticket.id));
      updatedCount++;
    }

    return { success: true, updatedCount, error: null as string | null };
  } catch (error) {
    console.error('Failed to sync QR codes:', error);
    return { success: false, updatedCount: 0, error: 'QR sync failed' };
  }
}

/**
 * Automatically refresh ticket statuses based on event dates.
 * Marks confirmed tickets as 'expired' if the event has ended.
 */
export async function refreshTicketStatuses(eventId?: string, shouldRevalidate: boolean = true) {
  // Mass status mutation: admins only. Server components that just want the
  // sweep should call refreshExpiredTicketStatuses() directly.
  await validateRole(['admin']);

  try {
    const { updatedCount } = await refreshExpiredTicketStatuses(eventId);

    if (shouldRevalidate) {
      revalidatePath('/tickets');
      if (eventId) revalidatePath(`/events/${eventId}`);
    }

    return { success: true, updatedCount, error: null as string | null };
  } catch (error) {
    console.warn('Failed to refresh ticket statuses (non-blocking):', error);
    // Return gracefully instead of throwing - DB may be unavailable during build
    return { success: false, updatedCount: 0, error: 'Could not refresh ticket statuses' };
  }
}

/**
 * Get ticket details by ticket number (used for internal verification)
 */
export async function getTicketByNumber(ticketNumber: string) {
  // The record carries the entry code and the holder's contact details, so it
  // is only for staff who are allowed to scan for that event.
  const ticket = await db.query.tickets.findFirst({
    where: eq(tickets.ticketNumber, ticketNumber),
    columns: { eventId: true },
  });
  if (!ticket) return null;
  await validateStaffPermission(ticket.eventId, 'scan_tickets');

  try {
    const result = await db.query.tickets.findFirst({
      where: eq(tickets.ticketNumber, ticketNumber),
      with: {
        event: true,
        user: true,
        tier: true
      }
    });
    return result;
  } catch (error) {
    console.error('Failed to fetch ticket:', error);
    return null;
  }
}
