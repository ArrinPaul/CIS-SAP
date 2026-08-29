'use server';

import { db } from '@/lib/db';
import { tags, eventTags } from '@/lib/db/schema';
import { eq, desc, sql, ilike, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { auth } from '@clerk/nextjs/server';
import { validateEventOwnership, validateRole } from '@/lib/auth-utils';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createTag(name: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };
  try {
    const slug = slugify(name);
    const existing = await db.query.tags.findFirst({
      where: eq(tags.name, name.trim()),
    });

    if (existing) {
      return { success: false, error: 'Tag already exists', tag: existing };
    }

    const [newTag] = await db.insert(tags).values({
      name: name.trim(),
      slug,
    }).returning();

    return { success: true, tag: newTag };
  } catch (error) {
    logger.error('Failed to create tag', error);
    return { success: false, error: 'Failed to create tag' };
  }
}

export async function getTags(search?: string, limit: number = 50) {
  const { userId } = await auth();
  if (!userId) return [];
  const take = Math.min(Math.max(1, limit), 100);
  try {
    if (search) {
      return await db
        .select()
        .from(tags)
        .where(ilike(tags.name, `%${search}%`))
        .orderBy(desc(tags.eventCount))
        .limit(take);
    }
    return await db
      .select()
      .from(tags)
      .orderBy(desc(tags.eventCount))
      .limit(take);
  } catch (error) {
    logger.error('Failed to fetch tags', error);
    return [];
  }
}

export async function getEventTags(eventId: string) {
  const { userId } = await auth();
  if (!userId) return [];
  try {
    const result = await db
      .select({ id: tags.id, name: tags.name, slug: tags.slug })
      .from(eventTags)
      .innerJoin(tags, eq(eventTags.tagId, tags.id))
      .where(eq(eventTags.eventId, eventId));

    return result;
  } catch (error) {
    logger.error('Failed to fetch event tags', error);
    return [];
  }
}

export async function addTagToEvent(eventId: string, tagName: string) {
  // Tagging an event is event management, not a global write.
  try {
    await validateEventOwnership(eventId);
  } catch {
    return { success: false, error: 'Unauthorized' };
  }
  try {
    let tag = await db.query.tags.findFirst({
      where: eq(tags.name, tagName.trim()),
    });

    if (!tag) {
      const result = await createTag(tagName);
      if (!result.success || !result.tag) return result;
      tag = result.tag;
    }

    const existing = await db.query.eventTags.findFirst({
      where: and(
        eq(eventTags.eventId, eventId),
        eq(eventTags.tagId, tag!.id)
      ),
    });

    if (!existing) {
      await db.insert(eventTags).values({
        eventId,
        tagId: tag!.id,
      });

      await db
        .update(tags)
        .set({ eventCount: sql`${tags.eventCount} + 1` })
        .where(eq(tags.id, tag!.id));
    }

    revalidatePath('/explore');
    return { success: true, tag };
  } catch (error) {
    logger.error('Failed to add tag to event', error);
    return { success: false, error: 'Failed to add tag' };
  }
}

export async function removeTagFromEvent(eventId: string, tagId: string) {
  try {
    await validateEventOwnership(eventId);
  } catch {
    return { success: false, error: 'Unauthorized' };
  }
  try {
    await db
      .delete(eventTags)
      .where(and(
        eq(eventTags.eventId, eventId),
        eq(eventTags.tagId, tagId)
      ));

    await db
      .update(tags)
      .set({ eventCount: sql`GREATEST(${tags.eventCount} - 1, 0)` })
      .where(eq(tags.id, tagId));

    revalidatePath('/explore');
    return { success: true };
  } catch (error) {
    logger.error('Failed to remove tag from event', error);
    return { success: false, error: 'Failed to remove tag' };
  }
}

export async function deleteTag(tagId: string) {
  try {
    await validateRole(['admin']);
  } catch {
    return { success: false, error: 'Unauthorized' };
  }
  try {
    await db.delete(tags).where(eq(tags.id, tagId));
    return { success: true };
  } catch (error) {
    logger.error('Failed to delete tag', error);
    return { success: false, error: 'Failed to delete tag' };
  }
}
