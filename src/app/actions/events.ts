'use server';

import { db } from '@/lib/db';
import { events, users } from '@/lib/db/schema';
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { generateEmbedding } from '@/lib/ai';
import { RRule } from 'rrule';
import { z } from 'zod';

import { logActivity } from './feed';
import { awardXP } from '@/lib/gamification/awards';

export type ActionResponse<T> = {
  success: boolean;
  data?: T;
  error?: string | any;
};

// --- SCHEMAS ---

const eventSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  category: z.string(),
  type: z.enum(['physical', 'virtual', 'hybrid']).default('physical'),
  location: z.any(),
  capacity: z.number().int().min(-1),
  price: z.string().default('0'),
  isPaid: z.boolean().default(false),
  isRecurring: z.boolean().default(false),
  recurrenceRule: z.string().optional(),
  waitlistEnabled: z.boolean().default(false),
  visibility: z.enum(['public', 'private', 'unlisted']).default('public'),
  imageUrl: z.string().url().optional().or(z.literal('')),
  coOrganizerIds: z.array(z.string()).optional(),
});

// --- ACTIONS ---

/**
 * Fetch events with optimized filtering
 */
export async function getEvents(filters?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
  type?: string;
  organizerId?: string;
  status?: string;
  dateRange?: string; // 'today', 'this-week', 'this-month'
  priceType?: string; // 'free', 'paid'
}) {
  try {
    const conditions = [];

    if (filters?.status) {
      conditions.push(eq(events.status, filters.status as any));
    } else {
      conditions.push(eq(events.status, 'published'));
    }

    if (filters?.organizerId) {
      conditions.push(eq(events.organizerId, filters.organizerId));
    }

    if (filters?.category && filters.category !== 'All') {
      conditions.push(eq(events.category, filters.category));
    }

    if (filters?.type) {
      conditions.push(eq(events.type, filters.type as any));
    }

    if (filters?.search) {
      conditions.push(
        or(
          ilike(events.title, `%${filters.search}%`),
          ilike(events.description, `%${filters.search}%`)
        )
      );
    }
    
    if (filters?.priceType) {
      if (filters.priceType === 'free') conditions.push(eq(events.isPaid, false));
      if (filters.priceType === 'paid') conditions.push(eq(events.isPaid, true));
    }
    
    if (filters?.dateRange) {
      const now = new Date();
      if (filters.dateRange === 'today') {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        conditions.push(sql`${events.startDate} >= ${now.toISOString()} AND ${events.startDate} < ${tomorrow.toISOString()}`);
      } else if (filters.dateRange === 'this-week') {
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        conditions.push(sql`${events.startDate} >= ${now.toISOString()} AND ${events.startDate} < ${nextWeek.toISOString()}`);
      } else if (filters.dateRange === 'this-month') {
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        conditions.push(sql`${events.startDate} >= ${now.toISOString()} AND ${events.startDate} < ${nextMonth.toISOString()}`);
      }
    }

    const result = await db.select().from(events)
      .where(and(...conditions))
      .orderBy(desc(events.startDate))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    return result;
  } catch (error) {
    console.error('getEvents Error:', error);
    return [];
  }
}

/**
 * Fetch events for calendar view (published only)
 */
export async function getCalendarEvents() {
  try {
    const result = await db.select().from(events)
      .where(eq(events.status, 'published'))
      .orderBy(events.startDate);
    return result;
  } catch (error) {
    console.error('getCalendarEvents Error:', error);
    return [];
  }
}

/**
 * Fetch a single event by ID
 */
export async function getEventById(id: string) {
  try {
    const result = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    return result[0] || null;
  } catch (error) {
    console.error('getEventById Error:', id, error);
    return null;
  }
}

import { slugify } from '@/core/utils/slugify';

/**
 * Create a new event
 */
export async function createEvent(rawInput: any): Promise<ActionResponse<any>> {
  const user = await validateRole(['organizer', 'admin']);
  
  const validated = eventSchema.safeParse(rawInput);
  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  try {
    const slug = `${slugify(data.title)}-${Math.random().toString(36).substring(2, 7)}`;

    const newEvent = await db.insert(events).values({
      ...data,
      slug,
      isPaid: false, // Force free
      price: '0',    // Force free
      location: data.location || { venue: 'TBD' },
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      organizerId: user.id,
      status: 'published',
    }).returning();

    const parentEvent = newEvent[0];

    // Background tasks
    logActivity({
      userId: user.id,
      type: 'event_created',
      targetId: parentEvent.id,
      content: parentEvent.title,
      metadata: { category: parentEvent.category }
    }).catch(console.error);

    awardXP(user.id, 100, 'Creating an event').catch(console.error);
    updateEventEmbedding(parentEvent.id).catch(console.error);

    if (data.isRecurring && data.recurrenceRule) {
      generateRecurringInstances(parentEvent.id, data.recurrenceRule).catch(console.error);
    }

    revalidatePath('/explore');
    revalidatePath('/organizer');
    
    return { success: true, data: parentEvent };
  } catch (error) {
    console.error('createEvent Error:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

/**
 * Helper to generate child instances for a recurring event
 */
export async function generateRecurringInstances(parentId: string, ruleString: string) {
  const parent = await db.query.events.findFirst({ where: eq(events.id, parentId) });
  if (!parent) return;

  try {
    const rule = RRule.fromString(ruleString);
    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(now.getMonth() + 3);
    
    const dates = rule.between(now, threeMonthsFromNow, true).slice(1, 13);
    if (dates.length === 0) return;

    const duration = parent.endDate.getTime() - parent.startDate.getTime();

    const instances = dates.map(date => ({
      ...parent,
      id: crypto.randomUUID() as any, // Need new UUIDs
      startDate: date,
      endDate: new Date(date.getTime() + duration),
      isRecurring: false,
      parentEventId: parent.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      embedding: null,
    }));

    await db.insert(events).values(instances as any);
  } catch (error) {
    console.error('generateRecurringInstances Error:', error);
  }
}

/**
 * Update event
 */
export async function updateEvent(id: string, rawInput: any): Promise<ActionResponse<any>> {
  await validateEventOwnership(id);

  const validated = eventSchema.partial().safeParse(rawInput);
  if (!validated.success) {
    return { success: false, error: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  try {
    const updateData: any = { ...data };
    updateData.isPaid = false; // Force free
    updateData.price = '0';    // Force free
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    updateData.updatedAt = new Date();

    const result = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();

    if (data.title || data.description) {
      updateEventEmbedding(id).catch(console.error);
    }

    revalidatePath('/explore');
    revalidatePath(`/events/${id}`);
    revalidatePath('/organizer');
    
    return { success: true, data: result[0] };
  } catch (error) {
    console.error('updateEvent Error:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

/**
 * Delete event
 */
export async function deleteEvent(id: string) {
  await validateEventOwnership(id);

  try {
    await db.delete(events).where(eq(events.id, id));
    revalidatePath('/explore');
    revalidatePath('/organizer');
    return { success: true };
  } catch (error) {
    console.error('deleteEvent Error:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

/**
 * Clone an existing event
 */
export async function cloneEvent(id: string) {
  const user = await validateEventOwnership(id);

  try {
    const originalEvent = await db.query.events.findFirst({
      where: eq(events.id, id)
    });

    if (!originalEvent) return { success: false, error: 'Original event not found' };

    const { id: _, createdAt: __, updatedAt: ___, embedding: ____, ...cloneData } = originalEvent;

    const clonedEvent = await db.insert(events).values({
      ...cloneData,
      title: `${originalEvent.title} (Clone)`,
      status: 'draft',
      organizerId: user.id,
    } as any).returning();

    revalidatePath('/organizer');
    
    return { success: true, id: clonedEvent[0].id };
  } catch (error) {
    console.error('Failed to clone event:', error);
    return { success: false, error: 'Database operation failed' };
  }
}

/**
 * Store embedding for an event
 */
export async function updateEventEmbedding(eventId: string) {
  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId)
    });

    if (!event) return;

    const contentToEmbed = `${event.title} ${event.category} ${event.description}`;
    const embeddingResponse = await generateEmbedding(contentToEmbed);
    const vectorData = embeddingResponse?.[0]?.embedding;

    if (!vectorData) {
      console.warn('updateEventEmbedding skipped: embedding provider returned empty vector');
      return;
    }

    await db
      .update(events)
      .set({ embedding: vectorData })
      .where(eq(events.id, eventId));
  } catch (error) {
    console.error('updateEventEmbedding Error:', error);
  }
}

/**
 * Optimized vector similarity
 */
export async function getRecommendedEventsByVector(userId: string) {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });

    if (!user || !user.interests) return [];

    const userEmbeddingResponse = await generateEmbedding(user.interests);
    const userVectorRaw = userEmbeddingResponse?.[0]?.embedding;

    if (!userVectorRaw) {
      return [];
    }

    const userVector = JSON.stringify(userVectorRaw);

    const results = await db.execute(sql`
      SELECT id, title, category, image_url, start_date
      FROM events
      WHERE status = 'published' AND embedding IS NOT NULL
      ORDER BY embedding <=> ${userVector}::vector
      LIMIT 5
    `);

    return results as any;
  } catch (error) {
    console.error('getRecommendedEventsByVector Error:', error);
    return [];
  }
}

/**
 * Get events organized by a specific user.
 */
export async function getEventsByUser(userId: string, page: number = 1, limit: number = 10) {
  try {
    const offset = (page - 1) * limit;
    const result = await db
      .select()
      .from(events)
      .where(eq(events.organizerId, userId))
      .orderBy(desc(events.createdAt))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(eq(events.organizerId, userId));

    return {
      events: result,
      total: Number(countResult?.count || 0),
      page,
      totalPages: Math.ceil(Number(countResult?.count || 0) / limit),
    };
  } catch (error) {
    console.error('getEventsByUser Error:', error);
    return { events: [], total: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Get related events by category (excluding current event).
 */
export async function getRelatedEventsByCategory(category: string, currentEventId: string, limit: number = 4) {
  try {
    const result = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.category, category),
          eq(events.status, 'published'),
          sql`${events.id} != ${currentEventId}`
        )
      )
      .orderBy(desc(events.startDate))
      .limit(limit);

    return result;
  } catch (error) {
    console.error('getRelatedEventsByCategory Error:', error);
    return [];
  }
}
