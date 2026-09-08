'use server';

import { db } from '@/lib/db';
import { activityFeed, notifications, tickets, events, users } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { validateEventOwnership, validateRole } from '@/lib/auth-utils';
import { sendEmail, constructAnnouncementEmail } from '@/core/services/email';
import { logger } from '@/lib/logger';

export type AnnouncementType = 'info' | 'warning' | 'urgent';

export type AnnouncementItem = {
  id: string;
  content: string;
  type: AnnouncementType;
  expiresAt: number | null;
  active: boolean;
  createdAt: Date;
};

export async function listAnnouncements(eventId: string): Promise<AnnouncementItem[]> {
  await validateEventOwnership(eventId);

  try {
    const rows = await db
      .select()
      .from(activityFeed)
      .where(and(eq(activityFeed.type, 'organizer_announcement'), eq(activityFeed.targetId, eventId)))
      .orderBy(desc(activityFeed.createdAt));

    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as { type?: AnnouncementType; expiresAt?: number | null; active?: boolean };
      return {
        id: row.id,
        content: row.content ?? '',
        type: meta.type ?? 'info',
        expiresAt: meta.expiresAt ?? null,
        active: meta.active ?? true,
        createdAt: row.createdAt,
      };
    });
  } catch (error) {
    console.error('listAnnouncements Error:', error);
    return [];
  }
}

export async function createAnnouncement(input: {
  eventId: string;
  content: string;
  type: AnnouncementType;
  expiresHours: number;
}) {
  const user = await validateRole(['organizer', 'admin']);
  await validateEventOwnership(input.eventId);

  try {
    const event = await db.query.events.findFirst({ where: eq(events.id, input.eventId) });
    if (!event) throw new Error('Event not found');

    const expiresAt = Date.now() + Math.max(1, input.expiresHours) * 60 * 60 * 1000;
    
    const result = await db.transaction(async (tx) => {
      // 1. Create Feed Entry
      const [row] = await tx
        .insert(activityFeed)
        .values({
          userId: user.id,
          actorId: user.id,
          type: 'organizer_announcement',
          targetId: input.eventId,
          content: input.content,
          metadata: { type: input.type, expiresAt, active: true },
        })
        .returning();

      // 2. Get all attendees with emails
      const attendees = await tx
        .select({ 
          userId: tickets.userId,
          userEmail: users.email,
          userName: users.name
        })
        .from(tickets)
        .innerJoin(users, eq(tickets.userId, users.id))
        .where(and(eq(tickets.eventId, input.eventId), eq(tickets.status, 'confirmed')));

      // 3. Create Notifications
      if (attendees.length > 0) {
        const notifs = attendees.map(a => ({
          userId: a.userId,
          title: `Announcement: ${input.type.toUpperCase()}`,
          message: input.content,
          type: input.type === 'urgent' ? 'alert' : 'info',
          link: `/events/${input.eventId}`
        }));
        await tx.insert(notifications).values(notifs);

        // 4. Send Emails asynchronously (don't block the transaction response, but we're inside tx, careful)
        // Actually, we should probably do this AFTER the transaction.
      }

      return { row, attendees };
    });

    // 4. Send Emails AFTER transaction
    const { attendees } = result;
    if (attendees.length > 0) {
      for (const attendee of attendees) {
        if (attendee.userEmail) {
          const emailContent = constructAnnouncementEmail(
            attendee.userName || 'Attendee',
            event.title,
            input.content,
            input.type
          );
          sendEmail({
            to: attendee.userEmail,
            subject: emailContent.subject,
            html: emailContent.html,
          }).catch(err => logger.error('Announcement email failed', err));
        }
      }
    }

    return { success: true, id: result.row.id };
  } catch (error) {
    console.error('createAnnouncement Error:', error);
    return { success: false, id: null as string | null };
  }
}

export async function updateAnnouncement(input: {
  id: string;
  content: string;
  type: AnnouncementType;
  expiresHours: number;
}) {
  await validateRole(['organizer', 'admin']);

  try {
    const existing = await db.query.activityFeed.findFirst({ where: eq(activityFeed.id, input.id) });
    if (!existing || existing.type !== 'organizer_announcement') {
      return { success: false };
    }

    await validateEventOwnership(existing.targetId || '');

    const expiresAt = Date.now() + Math.max(1, input.expiresHours) * 60 * 60 * 1000;
    await db
      .update(activityFeed)
      .set({
        content: input.content,
        metadata: { type: input.type, expiresAt, active: true },
      })
      .where(eq(activityFeed.id, input.id));

    return { success: true };
  } catch (error) {
    console.error('updateAnnouncement Error:', error);
    return { success: false };
  }
}

export async function deactivateAnnouncement(id: string) {
  await validateRole(['organizer', 'admin']);

  try {
    const existing = await db.query.activityFeed.findFirst({ where: eq(activityFeed.id, id) });
    if (!existing || existing.type !== 'organizer_announcement') return { success: false };
    await validateEventOwnership(existing.targetId || '');

    const current = (existing.metadata ?? {}) as Record<string, unknown>;
    await db
      .update(activityFeed)
      .set({ metadata: { ...current, active: false } })
      .where(eq(activityFeed.id, id));

    return { success: true };
  } catch (error) {
    console.error('deactivateAnnouncement Error:', error);
    return { success: false };
  }
}

export type WebhookItem = {
  id: string;
  url: string;
  events: string[];
  secret: string;
  createdAt: Date;
};

function randomSecret(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export async function listWebhooks(eventId?: string): Promise<WebhookItem[]> {
  const user = await validateRole(['organizer', 'admin']);

  try {
    const conditions = [eq(activityFeed.type, 'organizer_webhook')];

    if (user.role !== 'admin') {
      if (eventId) {
        await validateEventOwnership(eventId);
        conditions.push(eq(activityFeed.targetId, eventId));
      } else {
        conditions.push(eq(activityFeed.userId, user.id));
      }
    } else if (eventId) {
      conditions.push(eq(activityFeed.targetId, eventId));
    }

    const rows = await db
      .select()
      .from(activityFeed)
      .where(and(...conditions))
      .orderBy(desc(activityFeed.createdAt));

    return rows.map((row) => {
      const meta = (row.metadata ?? {}) as { events?: string[]; secret?: string };
      return {
        id: row.id,
        url: row.content || '',
        events: Array.isArray(meta.events) ? meta.events : [],
        secret: meta.secret || '',
        createdAt: row.createdAt,
      };
    });
  } catch (error) {
    console.error('listWebhooks Error:', error);
    return [];
  }
}

export async function createWebhook(input: { eventId?: string; url: string; events: string[] }) {
  const user = await validateRole(['organizer', 'admin']);
  if (input.eventId) await validateEventOwnership(input.eventId);

  try {
    const [row] = await db
      .insert(activityFeed)
      .values({
        userId: user.id,
        actorId: user.id,
        type: 'organizer_webhook',
        targetId: input.eventId || null,
        content: input.url,
        metadata: { events: input.events, secret: randomSecret() },
      })
      .returning();

    return { success: true, id: row.id };
  } catch (error) {
    console.error('createWebhook Error:', error);
    return { success: false, id: null as string | null };
  }
}

export async function deleteWebhook(id: string) {
  const user = await validateRole(['organizer', 'admin']);

  try {
    const existing = await db.query.activityFeed.findFirst({ where: eq(activityFeed.id, id) });
    if (!existing || existing.type !== 'organizer_webhook') return { success: false };

    let isAuthorized = user.role === 'admin';
    if (!isAuthorized) {
      if (existing.targetId) {
        await validateEventOwnership(existing.targetId);
        isAuthorized = true;
      } else {
        isAuthorized = existing.userId === user.id;
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'Unauthorized' };
    }

    await db.delete(activityFeed).where(eq(activityFeed.id, id));
    return { success: true };
  } catch (error) {
    console.error('deleteWebhook Error:', error);
    return { success: false };
  }
}
