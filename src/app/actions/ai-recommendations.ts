'use server';

import { createHash } from 'node:crypto';
import { validateRole } from '@/lib/auth-utils';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { aiRecommendationCache, events, users, tickets, eventFeedback, communityMembers, communities } from '@/lib/db/schema';
import { and, eq, ne, desc } from 'drizzle-orm';
import { recommendationFlow, contentRecommendationFlow, connectionRecommendationFlow, generateEmbedding } from '@/lib/ai';
import { sql } from 'drizzle-orm';

export interface RecommendationBundle {
	events: Array<{ id: string; title: string; category?: string; score?: number }>;
	sessions: Array<{ id: string; title: string; track?: string; score?: number }>;
	people: Array<{ id: string; name: string; role?: string; score?: number }>;
}

export type AIEventRecommendation = {
  eventId: string;
  relevanceScore: number;
  reason: string;
};

export type AIContentRecommendation = {
  contentId: string;
  relevanceScore: number;
  reason: string;
};

export type AIConnectionRecommendation = {
  userId: string;
  name: string;
  image?: string | null;
  role: string;
  strength: number;
  conversationStarter: string;
};

const RECOMMENDATION_CACHE_TTL_MS = 1000 * 60 * 15;

function buildRecommendationCacheKey(payload: {
  userId: string;
  userRole: string | null;
  interests: string[];
  eventIds: string[];
}) {
  const normalized = {
    userId: payload.userId,
    userRole: payload.userRole ?? 'unknown',
    interests: payload.interests.map((interest) => interest.toLowerCase()).sort(),
    eventIds: payload.eventIds.sort(),
  };

  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}

function isCacheFresh(updatedAt: Date) {
  return Date.now() - updatedAt.getTime() < RECOMMENDATION_CACHE_TTL_MS;
}

/**
 * Get personalized event recommendations using Vector search + Genkit
 */
export async function getAIRecommendations(userId?: string): Promise<AIEventRecommendation[]> {
  const caller = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  const targetUserId = userId || caller.id;

  if (targetUserId !== caller.id && caller.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  try {
    // 1. Get User Profile & Embedding
    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!user) throw new Error('User not found');

    let userEmbedding = user.embedding;

    // If user has no embedding, generate one from bio + interests
    if (!userEmbedding && (user.interests || user.bio)) {
      const textToEmbed = `${user.name} interests: ${user.interests || ''}. Bio: ${user.bio || ''}`;
      const embeddingResult = await generateEmbedding(textToEmbed);
      // ai.embed() resolves to [{ embedding: number[] }], not { embedding: { values } }.
      const vector = embeddingResult?.[0]?.embedding;
      if (vector) {
        userEmbedding = vector;
        // Update user record with the new embedding
        await db.update(users).set({ embedding: userEmbedding }).where(eq(users.id, targetUserId));
      }
    }

    // 2. Get User Interactions for context enrichment
    const [pastRegistrations, userFeedback] = await Promise.all([
      db.select({ eventTitle: events.title, category: events.category })
        .from(tickets)
        .innerJoin(events, eq(tickets.eventId, events.id))
        .where(eq(tickets.userId, targetUserId))
        .limit(5),
      db.select({ rating: eventFeedback.rating, comment: eventFeedback.comment })
        .from(eventFeedback)
        .where(eq(eventFeedback.userId, targetUserId))
        .limit(5)
    ]);

    // 3. Find Candidate Events via Vector Similarity (Hybrid approach)
    let candidateEvents;
    
    // Get already registered event IDs to exclude
    const registeredEventIds = pastRegistrations.map(r => r.eventTitle); // This is titles, need IDs
    const regTickets = await db.select({ eventId: tickets.eventId }).from(tickets).where(eq(tickets.userId, targetUserId));
    const excludedIds = regTickets.map(t => t.eventId);

    if (userEmbedding) {
      const userVector = JSON.stringify(userEmbedding);
      candidateEvents = await db.execute(sql`
        SELECT id, title, description, category
        FROM events
        WHERE status = 'published'
          AND embedding IS NOT NULL
          ${excludedIds.length > 0 ? sql`AND id NOT IN (${sql.join(excludedIds.map(id => sql`${id}`), sql`, `)})` : sql``}
        ORDER BY embedding <=> ${userVector}::vector
        LIMIT 15
      `);
    } else {
      candidateEvents = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          category: events.category,
        })
        .from(events)
        .where(and(
          ne(events.status, 'cancelled'),
          excludedIds.length > 0 ? sql`id NOT IN (${sql.join(excludedIds.map(id => sql`${id}`), sql`, `)})` : sql``
        ))
        .limit(15);
    }

    // 4. Run AI Recommendation Flow for final reasoning
    const interests = user.interests
      ? user.interests.split(',').map((i: string) => i.trim()).filter(Boolean)
      : [];
    
    const enrichedInterests = Array.from(new Set([...interests, ...pastRegistrations.map(r => r.category)]));

    const { recommendations } = await recommendationFlow({
      userInterests: enrichedInterests,
      userRole: user.role,
      availableEvents: (candidateEvents as any).rows || (candidateEvents as any),
    });

    return (recommendations || []) as AIEventRecommendation[];
  } catch (error) {
    console.error('Recommendation Error:', error);
    return [];
  }
}

/**
 * Get personalized connection suggestions (Similar tastes/interests)
 */
export async function getAIConnectionRecommendations(userId?: string): Promise<AIConnectionRecommendation[]> {
  const { userId: callerId } = await auth();
  // No session means no suggestions — not an error worth crashing the caller.
  if (!callerId) return [];

  // Suggestions are derived from the target's private profile, so they are only
  // ever computed for the caller themselves.
  const targetUserId = callerId;
  void userId;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!user) {
      console.warn(`[ai-recommendations] User not found for connections: ${targetUserId}`);
      return [];
    }

    let userEmbedding = user.embedding;
    if (!userEmbedding && (user.interests || user.bio)) {
      const textToEmbed = `User Profile - Interests: ${user.interests || ''}. Bio: ${user.bio || ''}`;
      const embeddingResult = await generateEmbedding(textToEmbed);
      // ai.embed() resolves to [{ embedding: number[] }], not { embedding: { values } }.
      const vector = embeddingResult?.[0]?.embedding;
      if (vector) {
        userEmbedding = vector;
        await db.update(users).set({ embedding: userEmbedding }).where(eq(users.id, targetUserId));
      }
    }

    // 1. Get similar users via vector search
    let potentialMatches;
    if (userEmbedding) {
      const userVector = JSON.stringify(userEmbedding);
      // Find top 10 users with similar interests, excluding self
      const results = await db.execute(sql`
        SELECT id, name, role, interests, bio, image
        FROM users
        WHERE id != ${targetUserId}
          AND embedding IS NOT NULL
        ORDER BY embedding <=> ${userVector}::vector
        LIMIT 10
      `);
      potentialMatches = (results as any).rows || results;
    } else {
      potentialMatches = await db
        .select({
          id: users.id,
          name: users.name,
          role: users.role,
          interests: users.interests,
          image: users.image,
          bio: users.bio
        })
        .from(users)
        .where(ne(users.id, targetUserId))
        .limit(10);
    }

    // 2. Filter out people they are already following/connected with
    const userFollows = await db.execute(sql`
      SELECT following_id FROM follows WHERE follower_id = ${targetUserId}
    `);
    const followingIds = new Set((((userFollows as any).rows || userFollows) as any[]).map((f: any) => f.following_id));
    
    const filteredMatches = (potentialMatches as any[]).filter(m => !followingIds.has(m.id));

    if (filteredMatches.length === 0) return [];

    // 3. Use AI to generate "Conversation Starters" and refine matches
    const { connections } = await connectionRecommendationFlow({
      userProfile: {
        id: user.id,
        name: user.name,
        interests: user.interests,
        role: user.role
      },
      network: filteredMatches.map(m => ({
        id: m.id,
        name: m.name,
        interests: m.interests,
        role: m.role
      })),
    });

    // 4. Map back to the full user objects
    const result: AIConnectionRecommendation[] = (connections || []).map(conn => {
      const fullUser = filteredMatches.find(m => m.id === conn.userId);
      return {
        userId: conn.userId,
        name: fullUser?.name || 'Unknown',
        image: fullUser?.image,
        role: fullUser?.role || 'Attendee',
        strength: conn.strength,
        conversationStarter: conn.conversationStarter
      };
    });

    return result;
  } catch (error) {
    console.error('Connection Recommendation Error:', error);
    return [];
  }
}

// Additional recommendation streams (Content - Recommend Communities)
export async function getAIContentRecommendations(userId?: string): Promise<AIContentRecommendation[]> {
  const caller = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  const targetUserId = userId || caller.id;

  if (targetUserId !== caller.id && caller.role !== 'admin') {
    throw new Error('Unauthorized');
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, targetUserId)
    });

    if (!user) throw new Error('User not found');

    const interests = user.interests ? user.interests.split(',').map((i: string) => i.trim()) : [];

    // Fetch communities as content
    const availableCommunities = await db
      .select({ id: communities.id, title: communities.name, category: communities.category })
      .from(communities)
      .limit(20);

    const { recommendedContent } = await contentRecommendationFlow({
      userInterests: interests,
      availableContent: availableCommunities.map(c => ({ contentId: c.id, ...c })),
    });

    return (recommendedContent || []) as AIContentRecommendation[];
  } catch (error) {
    console.error('Content Recommendation Error:', error);
    return [];
  }
}
