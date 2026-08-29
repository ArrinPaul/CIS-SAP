import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-utils';
import SponsorsManager from '@/features/organizer/sponsors-manager';

export const metadata = {
  title: 'Sponsors & Exhibitors | Eventra',
  description: 'Manage event sponsors, virtual exhibitor booths, and attendee lead capture.',
};

export default async function OrganizerSponsorsPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const user = await requireAuth();
  const { eventId } = await searchParams;

  const organizerEvents = await db.query.events.findMany({
    where: (e, { eq, or }) => or(eq(e.organizerId, user.id)),
    orderBy: [desc(events.startDate)],
    columns: {
      id: true,
      title: true,
    },
  });

  return (
    <SponsorsManager
      initialEvents={organizerEvents}
      defaultEventId={eventId || organizerEvents[0]?.id}
    />
  );
}
