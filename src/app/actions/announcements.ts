'use server';

import { db } from '@/lib/db';
import { activityFeed } from '@/lib/db/schema';
import { and, desc, eq, gt, or, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function getActiveAnnouncements(eventId: string) {
  // Organizer announcements are addressed to attendees, not the public.
  const { userId } = await auth();
  if (!userId) return [];
  try {
    const rows = await db
      .select()
      .from(activityFeed)
      .where(
        and(
          eq(activityFeed.type, 'organizer_announcement'),
          eq(activityFeed.targetId, eventId),
          // JSON check for active and not expired
          sql`${activityFeed.metadata}->>'active' = 'true'`,
          sql`(${activityFeed.metadata}->>'expiresAt')::bigint > ${Date.now()}`
        )
      )
      .orderBy(desc(activityFeed.createdAt));

    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as { type?: string; expiresAt?: number | null; active?: boolean };
      return {
        id: row.id,
        content: row.content ?? '',
        type: (meta.type || 'info') as 'info' | 'warning' | 'urgent',
        createdAt: row.createdAt,
      };
    });
  } catch (error) {
    console.error('getActiveAnnouncements Error:', error);
    return [];
  }
}
