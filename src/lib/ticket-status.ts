import 'server-only';

import { db } from '@/lib/db';
import { events, tickets } from '@/lib/db/schema';
import { and, eq, inArray, lt, or } from 'drizzle-orm';

/**
 * Mark confirmed/pending tickets as expired once their event has ended.
 *
 * This is a maintenance sweep, not a user-facing action: it lives outside the
 * `'use server'` boundary so it cannot be invoked directly from the client.
 * Callers are server components and the admin-gated action in
 * `@/app/actions/tickets`.
 */
export async function refreshExpiredTicketStatuses(eventId?: string) {
  const now = new Date();

  const finishedEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eventId ? and(eq(events.id, eventId), lt(events.endDate, now)) : lt(events.endDate, now));

  if (finishedEvents.length === 0) return { updatedCount: 0 };

  const eventIds = finishedEvents.map((e) => e.id);

  await db
    .update(tickets)
    .set({ status: 'expired' })
    .where(
      and(
        inArray(tickets.eventId, eventIds),
        or(eq(tickets.status, 'confirmed'), eq(tickets.status, 'pending'))
      )
    );

  return { updatedCount: finishedEvents.length };
}
