import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth-utils';
import PromoCodesManager from '@/features/organizer/promo-codes-manager';

export const metadata = {
  title: 'Promo Codes & Discounts | Eventra',
  description: 'Manage event discount codes, coupons, and promotional campaigns.',
};

export default async function OrganizerPromosPage({
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
    <PromoCodesManager
      initialEvents={organizerEvents}
      defaultEventId={eventId}
    />
  );
}
