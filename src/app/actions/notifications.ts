'use server';

import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Get notifications for the current user
 */
export async function getNotifications(limit = 20) {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
    
    return results;
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Auth required');

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    throw new Error('Failed to update notification');
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsRead() {
  const { userId } = await auth();
  if (!userId) throw new Error('Auth required');

  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    throw new Error('Failed to update notifications');
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error('Auth required');

  try {
    await db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
    
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    throw new Error('Failed to delete notification');
  }
}
