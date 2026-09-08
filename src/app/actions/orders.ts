'use server';

import { db } from '@/lib/db';
import { orders, tickets, events } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { generateEntryCode, generateQrPayload } from '@/core/utils/crypto';
import { canAccessEventManagement } from '@/lib/auth-utils';
import { sendEmail, constructTicketConfirmationEmail } from '@/core/services/email';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';

export async function createOrder(data: {
  eventId: string;
  ticketCount: number;
  totalAmount: number;
  paymentId?: string;
}) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Authentication required' };

  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, data.eventId),
    });
    if (!event) return { success: false, error: 'Event not found' };

    const existing = await db.query.orders.findFirst({
      where: and(
        eq(orders.eventId, data.eventId),
        eq(orders.userId, userId)
      ),
    });
    if (existing) return { success: false, error: 'Already ordered for this event' };

    const paymentId = data.paymentId || `free-${Date.now()}`;

    const [order] = await db.insert(orders).values({
      paymentId,
      totalTickets: data.ticketCount,
      totalAmount: data.totalAmount.toString(),
      userId,
      eventId: data.eventId,
      status: 'completed',
    }).returning();

    const createdTickets = [];
    const expiresAt = new Date(event.endDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    for (let i = 0; i < data.ticketCount; i++) {
      const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const entryCode = generateEntryCode();

      const [ticket] = await db.insert(tickets).values({
        eventId: data.eventId,
        userId,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price: (data.totalAmount / data.ticketCount).toString(),
        qrCode: generateQrPayload(ticketNumber),
        expiresAt,
      }).returning();

      createdTickets.push({ ticketNumber, entryCode });
    }

    await db
      .update(events)
      .set({ registeredCount: sql`${events.registeredCount} + ${data.ticketCount}` })
      .where(eq(events.id, data.eventId));

    const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, userId) });

    if (user?.email) {
      const emailContent = constructTicketConfirmationEmail(
        user.name || 'Attendee',
        event.title,
        format(event.startDate, 'PPP'),
        'TBA',
        'TBD',
        createdTickets
      );
      sendEmail({
        to: user.email,
        subject: emailContent.subject,
        html: emailContent.html,
      }).catch((err) => logger.error('Failed to send confirmation email', err));
    }

    revalidatePath(`/events/${data.eventId}`);
    revalidatePath('/tickets');

    return { success: true, orderId: order.id, tickets: createdTickets };
  } catch (error) {
    logger.error('Order creation failed', error);
    return { success: false, error: 'Order creation failed' };
  }
}

export async function getOrder(orderId: string) {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });
    if (!order) return null;

    // An order is visible to the buyer or to whoever manages the event.
    if (order.userId !== userId && !(await canAccessEventManagement(userId, order.eventId))) {
      return null;
    }

    return order;
  } catch (error) {
    logger.error('Failed to fetch order', error);
    return null;
  }
}

export async function getUserOrders() {
  const { userId } = await auth();
  if (!userId) return [];

  try {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    return result;
  } catch (error) {
    logger.error('Failed to fetch user orders', error);
    return [];
  }
}

export async function getEventOrders(eventId: string) {
  const { userId } = await auth();
  if (!userId) return [];
  if (!(await canAccessEventManagement(userId, eventId))) return [];

  try {
    const result = await db
      .select()
      .from(orders)
      .where(eq(orders.eventId, eventId))
      .orderBy(desc(orders.createdAt));

    return result;
  } catch (error) {
    logger.error('Failed to fetch event orders', error);
    return [];
  }
}

/**
 * Refund without an authorization check.
 *
 * Only for trusted server-side callers that have already established the
 * request is legitimate (the signature-verified payment webhook). Everything
 * reachable from the client must go through `refundOrder` instead.
 */
export async function refundOrderInternal(orderId: string) {
  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) return { success: false, error: 'Order not found' };
    if (order.status === 'refunded') return { success: false, error: 'Already refunded' };

    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: 'refunded', updatedAt: new Date() })
        .where(eq(orders.id, orderId));

      await tx
        .update(tickets)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(and(
          eq(tickets.eventId, order.eventId),
          eq(tickets.userId, order.userId)
        ));

      await tx
        .update(events)
        .set({ registeredCount: sql`GREATEST(${events.registeredCount} - ${order.totalTickets}, 0)` })
        .where(eq(events.id, order.eventId));
    });

    revalidatePath('/tickets');
    return { success: true };
  } catch (error) {
    logger.error('Refund failed', error);
    return { success: false, error: 'Refund failed' };
  }
}

/**
 * Refund an order. Only the event's organisers/staff (or an admin) may do this.
 */
export async function refundOrder(orderId: string) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Authentication required' };

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
  });
  if (!order) return { success: false, error: 'Order not found' };

  if (!(await canAccessEventManagement(userId, order.eventId))) {
    return { success: false, error: 'Unauthorized' };
  }

  return refundOrderInternal(orderId);
}
