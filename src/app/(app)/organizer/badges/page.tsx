import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-utils';
import BadgePrintManager from '@/features/badges/badge-print-manager';

export const metadata = {
  title: 'Printable Name Badges | Eventra',
  description: 'Generate and bulk print attendee badges and name tags with HMAC verification.',
};

export default async function OrganizerBadgesPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireAuth();
  const { eventId } = await searchParams;

  // Fetch organizer events
  const organizerEvents = await db.query.events.findMany({
    where: (e, { eq, or }) => or(eq(e.organizerId, user.id)),
    orderBy: [desc(events.startDate)],
    columns: {
      id: true,
      title: true,
    },
  });

  return (
    <BadgePrintManager
      initialEvents={organizerEvents}
      defaultEventId={eventId || organizerEvents[0]?.id}
    />
  );
}
