'use server';

import { db } from '@/lib/db';
import { stakeholders, events, users } from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { validateEventOwnership, validateRole } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export async function createStakeholder(data: {
  eventId: string;
  name: string;
  email: string;
  role: string;
}) {
  const user = await validateEventOwnership(data.eventId);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const existing = await db.query.stakeholders.findFirst({
      where: and(
        eq(stakeholders.eventId, data.eventId),
        eq(stakeholders.email, data.email)
      ),
    });

    if (existing) {
      return { success: false, error: 'Stakeholder already exists for this event' };
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    await db.insert(stakeholders).values({
      eventId: data.eventId,
      name: data.name,
      email: data.email,
      role: data.role,
      userId: targetUser?.id || null,
      importedBy: user.id,
    });

    revalidatePath(`/organizer/collab/${data.eventId}`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to create stakeholder', error);
    return { success: false, error: 'Failed to create stakeholder' };
  }
}

export async function getEventStakeholders(eventId: string, filters?: {
  role?: string;
  search?: string;
}) {
  // Rows carry names and email addresses, so this is organiser-only.
  await validateEventOwnership(eventId);

  try {
    const conditions = [eq(stakeholders.eventId, eventId)];

    if (filters?.role) conditions.push(eq(stakeholders.role, filters.role));

    const result = await db
      .select()
      .from(stakeholders)
      .where(and(...conditions))
      .orderBy(desc(stakeholders.createdAt));

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      return result.filter(s =>
        s.name.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search)
      );
    }

    return result;
  } catch (error) {
    logger.error('Failed to fetch stakeholders', error);
    return [];
  }
}

export async function getStakeholderStats(eventId: string) {
  await validateEventOwnership(eventId);

  try {
    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stakeholders)
      .where(eq(stakeholders.eventId, eventId));

    const [volunteers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stakeholders)
      .where(and(eq(stakeholders.eventId, eventId), eq(stakeholders.role, 'volunteer')));

    const [speakers] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stakeholders)
      .where(and(eq(stakeholders.eventId, eventId), eq(stakeholders.role, 'speaker')));

    const [attended] = await db
      .select({ count: sql<number>`count(*)` })
      .from(stakeholders)
      .where(and(eq(stakeholders.eventId, eventId), eq(stakeholders.attendanceStatus, 'attended')));

    return {
      total: Number(total?.count || 0),
      volunteers: Number(volunteers?.count || 0),
      speakers: Number(speakers?.count || 0),
      attended: Number(attended?.count || 0),
    };
  } catch (error) {
    logger.error('Failed to fetch stakeholder stats', error);
    return { total: 0, volunteers: 0, speakers: 0, attended: 0 };
  }
}

export async function deleteStakeholder(stakeholderId: string) {
  const existing = await db.query.stakeholders.findFirst({
    where: eq(stakeholders.id, stakeholderId),
    columns: { eventId: true },
  });
  if (!existing) return { success: false, error: 'Stakeholder not found' };

  const user = await validateEventOwnership(existing.eventId);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    await db.delete(stakeholders).where(eq(stakeholders.id, stakeholderId));
    revalidatePath('/collab');
    return { success: true };
  } catch (error) {
    logger.error('Failed to delete stakeholder', error);
    return { success: false, error: 'Failed to delete stakeholder' };
  }
}
