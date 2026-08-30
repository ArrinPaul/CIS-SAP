'use server';

import { db } from '@/lib/db';
import { issues, events, users } from '@/lib/db/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { validateEventOwnership, validateRole } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export async function createIssue(data: {
  eventId: string;
  category: string;
  severity?: string;
  title: string;
  description: string;
}) {
  const user = await validateRole(['attendee', 'organizer', 'admin', 'student', 'professional', 'speaker', 'vendor']);
  if (!user) return { success: false, error: 'Authentication required' };

  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, data.eventId),
    });

    if (!event) return { success: false, error: 'Event not found' };

    const organizer = await db.query.users.findFirst({
      where: eq(users.id, event.organizerId),
    });

    await db.insert(issues).values({
      eventId: data.eventId,
      eventTitle: event.title,
      reportedBy: user.id,
      reporterName: user.name || 'Anonymous',
      reporterEmail: user.email,
      category: data.category,
      severity: data.severity || 'medium',
      title: data.title,
      description: data.description,
      organizer: event.organizerId,
      organizerEmail: organizer?.email || '',
    });

    revalidatePath(`/events/${data.eventId}/issues`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to create issue', error);
    return { success: false, error: 'Failed to create issue' };
  }
}

export async function getEventIssues(eventId: string, filters?: {
  status?: string;
  severity?: string;
  category?: string;
}) {
  // Issue rows carry the reporter's name and email, so scope to this event's
  // organisers rather than to the organizer role at large.
  const user = await validateEventOwnership(eventId);
  if (!user) return [];

  try {
    const conditions = [eq(issues.eventId, eventId)];

    if (filters?.status) conditions.push(eq(issues.status, filters.status));
    if (filters?.severity) conditions.push(eq(issues.severity, filters.severity));
    if (filters?.category) conditions.push(eq(issues.category, filters.category));

    const result = await db
      .select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(desc(issues.createdAt));

    return result;
  } catch (error) {
    logger.error('Failed to fetch issues', error);
    return [];
  }
}

export async function updateIssueStatus(issueId: string, status: string, adminNotes?: string) {
  const issue = await db.query.issues.findFirst({
    where: eq(issues.id, issueId),
    columns: { eventId: true },
  });
  if (!issue) return { success: false, error: 'Issue not found' };

  const user = await validateEventOwnership(issue.eventId);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    const updateData: any = { status, updatedAt: new Date() };
    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'resolved') updateData.resolvedAt = new Date();

    await db
      .update(issues)
      .set(updateData)
      .where(eq(issues.id, issueId));

    revalidatePath('/issues');
    return { success: true };
  } catch (error) {
    logger.error('Failed to update issue', error);
    return { success: false, error: 'Failed to update issue' };
  }
}
