'use server';

import { getUserRegistrations } from './registrations';
import { getEvents } from './events';
import { getActivityFeed } from './feed';
import { getUserStats, getLeaderboard } from './gamification';
import { getOrganizerRevenueDashboard } from './analytics';
import { getAIConnectionRecommendations } from './ai-recommendations';
import { auth } from '@clerk/nextjs/server';
import { validateRole } from '@/lib/auth-utils';

/**
 * An expired or missing session is an expected condition, not a crash.
 * Throwing here surfaced an opaque "Unauthorized" server error in the RSC
 * stream and left the caller with no way to tell auth failure from a real
 * fault, so report it in the result instead.
 */
export async function getDashboardData() {
  const { userId } = await auth();
  if (!userId) {
    return {
      unauthorized: true as const,
      registrations: [],
      featuredEvents: [],
      activities: [],
      userStats: null,
      leaderboard: [],
      organizerStats: null,
      peopleSuggestions: [],
    };
  }

  // Check if organizer for relevant data
  let organizerStats = null;
  try {
    const user = await validateRole(['organizer', 'admin']);
    if (user) {
      organizerStats = await getOrganizerRevenueDashboard();
    }
  } catch (e) {
    // Not an organizer, skip
  }

  // Fetch all data in parallel on the server
  const [registrations, featuredEvents, activities, userStats, leaderboard, peopleSuggestions] = await Promise.all([
    getUserRegistrations(),
    getEvents({ limit: 4 }),
    getActivityFeed({ userId, limit: 5 }),
    getUserStats(userId),
    getLeaderboard(5),
    getAIConnectionRecommendations(userId)
  ]);

  return {
    unauthorized: false as const,
    registrations,
    featuredEvents,
    activities,
    userStats,
    leaderboard,
    organizerStats,
    peopleSuggestions
  };
}
