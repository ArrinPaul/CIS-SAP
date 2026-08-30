'use server';

import { db } from '@/lib/db';
import { kanbanTasks } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export async function getEventTasks(eventId: string) {
  await validateEventOwnership(eventId);

  try {
    const result = await db
      .select()
      .from(kanbanTasks)
      .where(eq(kanbanTasks.eventId, eventId));

    return result;
  } catch (error) {
    logger.error('Failed to fetch tasks', error);
    return [];
  }
}

export async function saveEventTasks(eventId: string, tasks: any[]) {
  // Ownership, not just the organizer role: this replaces the whole board.
  const user = await validateEventOwnership(eventId);
  if (!user) return { success: false, error: 'Unauthorized' };

  try {
    await db.delete(kanbanTasks).where(eq(kanbanTasks.eventId, eventId));

    for (const task of tasks) {
      await db.insert(kanbanTasks).values({
        taskId: task.id,
        content: task.content,
        column: task.column,
        priority: task.priority,
        estimatedDuration: task.estimatedDuration,
        completed: task.completed || false,
        subtasks: task.subtasks || [],
        eventId,
        organizerId: user.id,
      });
    }

    revalidatePath(`/events/${eventId}/plan`);
    return { success: true };
  } catch (error) {
    logger.error('Failed to save tasks', error);
    return { success: false, error: 'Failed to save tasks' };
  }
}

export async function updateTaskColumn(taskId: string, column: string) {
  const task = await db.query.kanbanTasks.findFirst({
    where: eq(kanbanTasks.taskId, taskId),
    columns: { eventId: true },
  });
  if (!task) return { success: false, error: 'Task not found' };
  await validateEventOwnership(task.eventId);

  try {
    await db
      .update(kanbanTasks)
      .set({ column, updatedAt: new Date() })
      .where(eq(kanbanTasks.taskId, taskId));

    return { success: true };
  } catch (error) {
    logger.error('Failed to update task', error);
    return { success: false, error: 'Failed to update task' };
  }
}
