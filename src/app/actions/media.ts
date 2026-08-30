'use server';

import { db } from '@/lib/db';
import { eventMedia, events, users } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { validateRole, validateEventOwnership, validateStaffPermission } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';

function sanitizeMediaError(error: any, fallback: string): never {
  const message = error?.message || '';
  const isBusinessError =
    message.includes('Media not found') ||
    message.includes('Unauthorized') ||
    message.includes('permission') ||
    message.includes('Event not found');

  if (isBusinessError) {
    throw error;
  }
  throw new Error(fallback);
}

function isSafeMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Upload event media (Attendee or Organizer)
 */
export async function uploadEventMedia(data: {
  eventId: string;
  url: string;
  storageId: string;
  caption?: string;
  metadata?: any;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error('Authentication required');

  // The URL is rendered as an <img> src and handed back to every gallery
  // viewer, so only http(s) is accepted here.
  if (!isSafeMediaUrl(data.url)) {
    throw new Error('Media URL must be an http(s) URL');
  }

  try {
    // 1. Check if user is organizer/staff (Auto-approve) or attendee
    const event = await db.query.events.findFirst({
      where: eq(events.id, data.eventId)
    });
    if (!event) throw new Error('Event not found');

    const isStaff = event.organizerId === userId || event.coOrganizerIds?.includes(userId);
    
    // 2. Insert media record
    const [media] = await db
      .insert(eventMedia)
      .values({
        eventId: data.eventId,
        authorId: userId,
        url: data.url,
        storageId: data.storageId,
        caption: data.caption,
        isApproved: isStaff, // Auto-approve if organizer/staff
        visibility: 'public',
        metadata: data.metadata || {},
      })
      .returning();

    revalidatePath(`/events/${data.eventId}`);
    return media;
  } catch (error: any) {
    console.error('uploadEventMedia Error:', error);
    throw new Error('Failed to upload media');
  }
}

/**
 * Get approved media for an event
 */
export async function getEventGallery(eventId: string) {
  try {
    const result = await db
      .select({
        id: eventMedia.id,
        url: eventMedia.url,
        caption: eventMedia.caption,
        viewCount: eventMedia.viewCount,
        downloadCount: eventMedia.downloadCount,
        createdAt: eventMedia.createdAt,
        author: {
          id: users.id,
          name: users.name,
          image: users.image,
        }
      })
      .from(eventMedia)
      .innerJoin(users, eq(eventMedia.authorId, users.id))
      .where(and(
        eq(eventMedia.eventId, eventId),
        eq(eventMedia.isApproved, true),
        eq(eventMedia.visibility, 'public')
      ))
      .orderBy(desc(eventMedia.createdAt));

    return result;
  } catch (error) {
    console.error('getEventGallery Error:', error);
    return [];
  }
}

/**
 * Get pending media for moderation (Organizer Only)
 */
export async function getPendingMedia(eventId: string) {
  await validateStaffPermission(eventId, 'manage_content');

  try {
    const result = await db
      .select({
        id: eventMedia.id,
        url: eventMedia.url,
        caption: eventMedia.caption,
        author: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(eventMedia)
      .innerJoin(users, eq(eventMedia.authorId, users.id))
      .where(and(
        eq(eventMedia.eventId, eventId),
        eq(eventMedia.isApproved, false)
      ))
      .orderBy(desc(eventMedia.createdAt));

    return result;
  } catch (error) {
    console.error('getPendingMedia Error:', error);
    return [];
  }
}

/**
 * Approve or Reject media
 */
export async function moderateMedia(mediaId: string, action: 'approve' | 'reject') {
  try {
    const media = await db.query.eventMedia.findFirst({
      where: eq(eventMedia.id, mediaId)
    });
    if (!media) throw new Error('Media not found');

    await validateStaffPermission(media.eventId, 'manage_content');

    if (action === 'approve') {
      await db
        .update(eventMedia)
        .set({ isApproved: true, updatedAt: new Date() })
        .where(eq(eventMedia.id, mediaId));
    } else {
      await db
        .delete(eventMedia)
        .where(eq(eventMedia.id, mediaId));
    }

    revalidatePath(`/events/${media.eventId}`);
    revalidatePath(`/organizer/media/${media.eventId}`);
    return { success: true };
  } catch (error: any) {
    sanitizeMediaError(error, 'Moderation failed');
  }
}

/**
 * Toggle media visibility
 */
export async function toggleMediaVisibility(mediaId: string, visibility: 'public' | 'private') {
  try {
    const media = await db.query.eventMedia.findFirst({
      where: eq(eventMedia.id, mediaId)
    });
    if (!media) throw new Error('Media not found');

    await validateStaffPermission(media.eventId, 'manage_content');

    await db
      .update(eventMedia)
      .set({ visibility, updatedAt: new Date() })
      .where(eq(eventMedia.id, mediaId));

    revalidatePath(`/events/${media.eventId}`);
    return { success: true };
  } catch (error: any) {
    sanitizeMediaError(error, 'Visibility toggle failed');
  }
}

/**
 * Track media view or download
 */
export async function trackMediaEngagement(mediaId: string, type: 'view' | 'download') {
  const { userId } = await auth();
  if (!userId) return { success: false };

  try {
    if (type === 'view') {
      await db
        .update(eventMedia)
        .set({ viewCount: sql`${eventMedia.viewCount} + 1` })
        .where(eq(eventMedia.id, mediaId));
    } else {
      await db
        .update(eventMedia)
        .set({ downloadCount: sql`${eventMedia.downloadCount} + 1` })
        .where(eq(eventMedia.id, mediaId));
    }
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
