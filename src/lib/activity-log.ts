import 'server-only';

import { db } from '@/lib/db';
import { activityFeed } from '@/lib/db/schema';

export type ActivityType =
  | 'registration'
  | 'post'
  | 'comment'
  | 'event_created'
  | 'event_checkin'
  | 'badge_awarded'
  | 'community_joined';

/**
 * Log a new activity to the feed.
 *
 * Server-internal only: it writes an arbitrary userId/actorId, so it must not
 * sit behind a `'use server'` boundary where the client could call it directly
 * and forge entries for other people.
 */
export async function logActivity(data: {
  userId: string;
  type: ActivityType;
  actorId?: string;
  targetId?: string;
  content?: string;
  metadata?: any;
}) {
  try {
    const newActivity = await db.insert(activityFeed).values({
      userId: data.userId,
      type: data.type,
      actorId: data.actorId || data.userId,
      targetId: data.targetId,
      content: data.content,
      metadata: data.metadata,
    }).returning();

    return newActivity[0];
  } catch (error) {
    console.error('Failed to log activity:', error);
    return null;
  }
}
