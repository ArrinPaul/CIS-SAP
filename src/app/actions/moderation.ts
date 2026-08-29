'use server';

import { validateRole } from '@/lib/auth-utils';
import { aiModerationFlow } from '@/lib/ai';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * Moderate content using AI
 */
export async function moderateContent(content: string) {
  // Guard: Authenticated
  const moderator = await validateRole(['attendee', 'organizer', 'admin', 'professional', 'student', 'speaker', 'vendor']);
  try {
    await enforceRateLimit({ userId: moderator.id, scope: 'ai:moderate', limit: 30 });
  } catch {
    return { isFlagged: false, approved: true, reason: 'Rate limited' };
  }

  try {
    const result = await aiModerationFlow({ content });
    return {
      ...result,
      approved: !result.isFlagged
    };
  } catch (error) {
    console.error('Moderation Error:', error);
    return { isFlagged: false, approved: true }; // Default to safe if AI fails
  }
}
