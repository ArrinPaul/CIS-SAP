'use server';

import { db } from '@/lib/db';
import { activityFeed } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { validateRole } from '@/lib/auth-utils';
import { awardXP } from '@/lib/gamification/awards';

export type ChallengeDefinition = {
  id: string;
  title: string;
  description: string;
  target: number;
  xpReward: number;
  status: 'active';
};

const CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'c-register-3',
    title: 'Momentum Builder',
    description: 'Register for 3 events this month.',
    target: 3,
    xpReward: 150,
    status: 'active',
  },
  {
    id: 'c-post-5',
    title: 'Community Voice',
    description: 'Create 5 community posts.',
    target: 5,
    xpReward: 100,
    status: 'active',
  },
  {
    id: 'c-checkin-2',
    title: 'Show Up Pro',
    description: 'Check in to 2 events.',
    target: 2,
    xpReward: 120,
    status: 'active',
  },
];

export type UserChallenge = {
  challengeId: string;
  progress: number;
  completed: boolean;
  createdAt: Date;
};

export async function getChallenges(): Promise<ChallengeDefinition[]> {
  await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  return CHALLENGES;
}

export async function getUserChallenges(): Promise<UserChallenge[]> {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    const rows = await db
      .select()
      .from(activityFeed)
      .where(and(eq(activityFeed.type, 'challenge_join'), eq(activityFeed.userId, user.id)))
      .orderBy(desc(activityFeed.createdAt));

    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as { progress?: number; completed?: boolean };
      return {
        challengeId: row.targetId || '',
        progress: Number(meta.progress || 0),
        completed: Boolean(meta.completed),
        createdAt: row.createdAt,
      };
    });
  } catch (error) {
    console.error('getUserChallenges Error:', error);
    return [];
  }
}

export async function joinChallenge(challengeId: string) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);

  try {
    const exists = await db.query.activityFeed.findFirst({
      where: and(
        eq(activityFeed.type, 'challenge_join'),
        eq(activityFeed.userId, user.id),
        eq(activityFeed.targetId, challengeId)
      ),
    });

    if (exists) {
      return { 
        success: true, 
        participation: {
          challengeId,
          progress: 0,
          completed: false,
          createdAt: exists.createdAt,
        }
      };
    }

    const [row] = await db.insert(activityFeed).values({
      userId: user.id,
      actorId: user.id,
      type: 'challenge_join',
      targetId: challengeId,
      content: 'Joined challenge',
      metadata: { progress: 0, completed: false },
    }).returning();

    await awardXP(user.id, 10, `Joined challenge ${challengeId}`);
    return { 
      success: true,
      participation: {
        challengeId,
        progress: 0,
        completed: false,
        createdAt: row.createdAt,
      }
    };
  } catch (error) {
    console.error('joinChallenge Error:', error);
    return { success: false, error: 'Failed to join challenge' };
  }
}
