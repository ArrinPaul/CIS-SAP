'use server';

import { db } from '@/lib/db';
import { agendaSessions, agendaBookmarks, events, users } from '@/lib/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth, validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export interface CreateAgendaSessionInput {
  eventId: string;
  title: string;
  description?: string;
  track?: string;
  startTime: string; // ISO date
  endTime: string;   // ISO date
  speakerName?: string;
  speakerTitle?: string;
  speakerAvatar?: string;
  roomLocation?: string;
  sessionType?: 'keynote' | 'talk' | 'workshop' | 'panel' | 'networking' | 'break';
}

/**
 * Create a new Agenda Session
 */
export async function createAgendaSession(input: CreateAgendaSessionInput) {
  try {
    const user = await requireAuth();
    await validateEventOwnership(input.eventId);

    const [created] = await db.insert(agendaSessions).values({
      eventId: input.eventId as any,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      track: input.track?.trim() || 'Main Stage',
      startTime: new Date(input.startTime),
      endTime: new Date(input.endTime),
      speakerName: input.speakerName?.trim() || null,
      speakerTitle: input.speakerTitle?.trim() || null,
      speakerAvatar: input.speakerAvatar?.trim() || null,
      roomLocation: input.roomLocation?.trim() || null,
      sessionType: input.sessionType || 'talk',
    }).returning();

    revalidatePath(`/events/${input.eventId}`);
    revalidatePath(`/organizer/agenda`);
    return { success: true, session: created };
  } catch (error: any) {
    logger.error('Failed to create agenda session:', error);
    return { success: false, error: error.message || 'Failed to create session' };
  }
}

/**
 * Update an Agenda Session
 */
export async function updateAgendaSession(sessionId: string, input: Partial<CreateAgendaSessionInput>) {
  try {
    const user = await requireAuth();

    const existing = await db.query.agendaSessions.findFirst({
      where: eq(agendaSessions.id, sessionId as any),
    });

    if (!existing) {
      return { success: false, error: 'Session not found' };
    }

    await validateEventOwnership(existing.eventId);

    const [updated] = await db.update(agendaSessions).set({
      ...(input.title ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.track ? { track: input.track.trim() } : {}),
      ...(input.startTime ? { startTime: new Date(input.startTime) } : {}),
      ...(input.endTime ? { endTime: new Date(input.endTime) } : {}),
      ...(input.speakerName !== undefined ? { speakerName: input.speakerName?.trim() || null } : {}),
      ...(input.speakerTitle !== undefined ? { speakerTitle: input.speakerTitle?.trim() || null } : {}),
      ...(input.speakerAvatar !== undefined ? { speakerAvatar: input.speakerAvatar?.trim() || null } : {}),
      ...(input.roomLocation !== undefined ? { roomLocation: input.roomLocation?.trim() || null } : {}),
      ...(input.sessionType ? { sessionType: input.sessionType } : {}),
      updatedAt: new Date(),
    }).where(eq(agendaSessions.id, sessionId as any)).returning();

    revalidatePath(`/events/${existing.eventId}`);
    revalidatePath(`/organizer/agenda`);
    return { success: true, session: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete an Agenda Session
 */
export async function deleteAgendaSession(sessionId: string) {
  try {
    const user = await requireAuth();

    const existing = await db.query.agendaSessions.findFirst({
      where: eq(agendaSessions.id, sessionId as any),
    });

    if (!existing) {
      return { success: false, error: 'Session not found' };
    }

    await validateEventOwnership(existing.eventId);

    await db.delete(agendaSessions).where(eq(agendaSessions.id, sessionId as any));

    revalidatePath(`/events/${existing.eventId}`);
    revalidatePath(`/organizer/agenda`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all agenda sessions for an event, with user bookmark flags
 */
export async function getEventAgenda(eventId: string) {
  try {
    let currentUserId: string | null = null;
    try {
      const user = await requireAuth();
      currentUserId = user.id;
    } catch {
      // Guest view allowed
    }

    const sessions = await db.query.agendaSessions.findMany({
      where: eq(agendaSessions.eventId, eventId as any),
      orderBy: [asc(agendaSessions.startTime), asc(agendaSessions.track)],
      with: {
        bookmarks: true,
      },
    });

    const formatted = sessions.map((s) => ({
      ...s,
      bookmarkCount: s.bookmarks.length,
      isBookmarked: currentUserId ? s.bookmarks.some((b) => b.userId === currentUserId) : false,
    }));

    // Extract unique tracks
    const tracks = [...new Set(sessions.map((s) => s.track))];

    return {
      success: true,
      sessions: formatted,
      tracks,
    };
  } catch (error: any) {
    logger.error('Failed to get event agenda:', error);
    return { success: false, sessions: [], tracks: [], error: error.message };
  }
}

/**
 * Toggle bookmark on an agenda session
 */
export async function toggleSessionBookmark(sessionId: string) {
  try {
    const user = await requireAuth();

    const existing = await db.query.agendaBookmarks.findFirst({
      where: and(
        eq(agendaBookmarks.sessionId, sessionId as any),
        eq(agendaBookmarks.userId, user.id)
      ),
    });

    if (existing) {
      await db.delete(agendaBookmarks).where(eq(agendaBookmarks.id, existing.id));
      return { success: true, isBookmarked: false };
    }

    await db.insert(agendaBookmarks).values({
      sessionId: sessionId as any,
      userId: user.id,
    });

    return { success: true, isBookmarked: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
