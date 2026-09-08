'use server';

import { db } from '@/lib/db';
import { activityFeed, users } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, desc, sql, inArray } from 'drizzle-orm';

/**
 * Get the global or user-specific activity feed
 */
export async function getActivityFeed(options?: { userId?: string, limit?: number }) {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    let query = db
      .select({
        activity: activityFeed,
        user: {
          id: users.id,
          name: users.name,
          image: users.image,
        },
        actor: {
          id: users.id,
          name: users.name,
          image: users.image,
        }
      })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.userId, users.id));

    if (options?.userId) {
      query = query.where(eq(activityFeed.userId, options.userId)) as any;
    }

    const results = await query
      .orderBy(desc(activityFeed.createdAt))
      .limit(options?.limit || 50);

    return results;
  } catch (error) {
    console.error('Failed to fetch activity feed:', error);
    return [];
  }
}

/**
 * Get personalized feed (from connections)
 */
export async function getPersonalizedFeed() {
  const { userId } = await auth();
  if (!userId) return getActivityFeed();

  try {
    // 1. Get user follows
    const userFollows = await db.execute(sql`
      SELECT following_id FROM follows WHERE follower_id = ${userId}
    `);
    
    const followingIds = (userFollows as any).map((f: any) => f.following_id);
    
    if (followingIds.length === 0) {
      return getActivityFeed();
    }

    // 2. Add self to the list
    followingIds.push(userId);

    // 3. Get activities from followed users
    const results = await db
      .select({
        activity: activityFeed,
        user: {
          id: users.id,
          name: users.name,
          image: users.image,
        }
      })
      .from(activityFeed)
      .innerJoin(users, eq(activityFeed.userId, users.id))
      .where(inArray(activityFeed.userId, followingIds))
      .orderBy(desc(activityFeed.createdAt))
      .limit(50);

    return results;
  } catch (error) {
    console.error('Failed to fetch personalized feed:', error);
    return getActivityFeed();
  }
}
