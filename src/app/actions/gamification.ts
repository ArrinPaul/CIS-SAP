'use server';

import { db } from '@/lib/db';
import { users, badges, userBadges, tickets, posts } from '@/lib/db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

/**
 * Get gamification stats for a specific user
 */
export async function getUserStats(userId: string) {
  const { userId: callerId } = await auth();
  if (!callerId) return null;
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user) return null;

    const [tCount] = await db.select({ value: count() }).from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.status, 'checked-in')));
    const [pCount] = await db.select({ value: count() }).from(posts).where(eq(posts.authorId, userId));
    const [bCount] = await db.select({ value: count() }).from(userBadges).where(eq(userBadges.userId, userId));

    return {
      level: user.level,
      xp: user.xp,
      points: user.points,
      attended: tCount.value,
      posts: pCount.value,
      badgeCount: bCount.value
    };
  } catch (error) {
    console.error('getUserStats Error:', error);
    return null;
  }
}

/**
 * Get all badges earned by a user
 */
export async function getUserBadges(userId: string) {
  const { userId: callerId } = await auth();
  if (!callerId) return [];
  try {
    const results = await db
      .select({
        badge: badges,
        awardedAt: userBadges.awardedAt
      })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.awardedAt));
    
    return results;
  } catch (error) {
    console.error('getUserBadges Error:', error);
    return [];
  }
}

/**
 * Get the global leaderboard
 */
export async function getLeaderboard(limit = 10) {
  const { userId: callerId } = await auth();
  if (!callerId) return [];
  // Clamp so a caller cannot request the entire user table.
  const take = Math.min(Math.max(1, limit), 100);
  try {
    const results = await db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        points: users.points,
        level: users.level,
      })
      .from(users)
      .orderBy(desc(users.points))
      .limit(take);
    
    return results;
  } catch (error) {
    console.error('Leaderboard error:', error);
    return [];
  }
}
