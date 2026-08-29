import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-utils';
import AgendaManager from '@/features/organizer/agenda-manager';

export const metadata = {
  title: 'Agenda & Multi-Track Studio | Eventra',
  description: 'Manage conference agenda, multi-track time grids, speakers, and calendar exports.',
};

export default async function OrganizerAgendaPage({
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
    <AgendaManager
      initialEvents={organizerEvents}
      defaultEventId={eventId || organizerEvents[0]?.id}
    />
  );
}
