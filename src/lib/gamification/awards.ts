import 'server-only';

/**
 * Privileged gamification writes.
 *
 * These are deliberately NOT server actions. Under a 'use server' directive
 * every export becomes a publicly callable endpoint, which let any caller
 * grant arbitrary XP or badges to any user id. They are internal helpers,
 * invoked only by actions that have already authorised the caller.
 */

import { db } from '@/lib/db';
import { users, notifications, badges, userBadges, tickets, posts } from '@/lib/db/schema';
import { eq, and, sql, desc, count } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/app/actions/feed';

/**
 * Award a badge to a user
 */
export async function awardBadge(userId: string, badgeCode: string) {
  try {
    const badge = await db.query.badges.findFirst({
      where: eq(badges.name, badgeCode),
    });

    if (!badge) return null;

    const existing = await db.query.userBadges.findFirst({
      where: and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badge.id)),
    });

    if (existing) return null;

    await db.insert(userBadges).values({
      userId,
      badgeId: badge.id,
    });

    // Notify
    await db.insert(notifications).values({
      userId,
      title: 'New badge earned',
      message: `You earned the "${badge.name}" badge.`,
      type: 'success',
    });

    // ACTIVITY FEED INTEGRATION: Log badge unlock
    await logActivity({
      userId,
      type: 'badge_awarded',
      targetId: badge.id,
      content: `Earned the "${badge.name}" badge.`,
      metadata: { badgeName: badge.name, badgeIcon: badge.icon }
    });

    return { success: true, badge };
  } catch (error) {
    console.error('Failed to award badge:', error);
    return null;
  }
}

/**
 * Check and award badges based on user's current stats and activities
 */
export async function checkAndAwardBadges(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return;

    // Fetch all available badges
    const allBadges = await db.select().from(badges);
    
    // Fetch user's current badges
    const userBadgeRecords = await db.select().from(userBadges).where(eq(userBadges.userId, userId));
    const userBadgeIds = new Set(userBadgeRecords.map(ub => ub.badgeId));

    for (const badge of allBadges) {
      if (userBadgeIds.has(badge.id)) continue;

      const criteria = badge.criteria as any;
      let eligible = false;

      switch (criteria.type) {
        case 'level':
          if (user.level >= criteria.value) eligible = true;
          break;
        case 'points':
          if (user.points >= criteria.value) eligible = true;
          break;
        case 'account_created':
          eligible = true; // They exist, so true
          break;
        case 'registration_count':
          const rCount = await db.select({ value: count() }).from(tickets).where(eq(tickets.userId, userId));
          if (rCount[0].value >= (criteria.count || 1)) eligible = true;
          break;
        case 'attendance_count':
        case 'events_attended':
          const tCount = await db.select({ value: count() }).from(tickets).where(and(eq(tickets.userId, userId), eq(tickets.status, 'checked-in')));
          if (tCount[0].value >= (criteria.count || criteria.value)) eligible = true;
          break;
        case 'post_count':
        case 'community_posts':
          const pCount = await db.select({ value: count() }).from(posts).where(eq(posts.authorId, userId));
          if (pCount[0].value >= (criteria.count || criteria.value)) eligible = true;
          break;
      }

      if (eligible) {
        await awardBadge(userId, badge.name);
      }
    }
  } catch (error) {
    console.error('Failed to check badges:', error);
  }
}

/**
 * Award XP to a user and handle level-ups
 */
export async function awardXP(userId: string, amount: number, reason: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) return null;

    const newXP = user.xp + amount;
    const newPoints = user.points + amount;
    
    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
    const leveledUp = newLevel > user.level;

    await db.update(users).set({
      xp: newXP,
      points: newPoints,
      level: newLevel,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    // Notify user of XP gain
    await db.insert(notifications).values({
      userId,
      title: `+${amount} XP!`,
      message: `You earned XP for: ${reason}`,
      type: 'success',
    });

    if (leveledUp) {
      await db.insert(notifications).values({
        userId,
        title: 'Level up',
        message: `You reached level ${newLevel}.`,
        type: 'success',
      });

      // ACTIVITY FEED INTEGRATION: Log level up
      await logActivity({
        userId,
        type: 'badge_awarded',
        content: `Reached level ${newLevel}.`,
        metadata: { level: newLevel }
      });
    }

    // Check for badge triggers in background
    checkAndAwardBadges(userId).catch(err => console.error('Badge check failed:', err));

    revalidatePath('/');
    return { success: true, newLevel, leveledUp };
  } catch (error) {
    console.error('Failed to award XP:', error);
    return null;
  }
}
