'use server';

import { db } from '@/lib/db';
import { events, tickets } from '@/lib/db/schema';
import { eq, and, lt, or, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { generateEntryCode } from '@/core/utils/crypto';

export async function createCheckoutSession(eventId: string, tierId?: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    if (!event.isPaid || Number(event.price) === 0) {
      return { success: false, error: 'This is a free event' };
    }

    const existing = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), eq(tickets.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'Already registered for this event' };
    }

    if (event.capacity !== -1 && event.registeredCount >= event.capacity) {
      return { success: false, error: 'Event is sold out' };
    }

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Payment system not configured' };
    }

    let productId = event.externalId;

    if (!productId) {
      const response = await fetch('https://api.dodopayments.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: event.title,
          description: `Tickets for ${event.title}`,
          price: {
            price: Math.round(Number(event.price) * 100),
            currency: 'INR',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const product = await response.json();
      productId = product.product_id;

      await db
        .update(events)
        .set({ externalId: productId })
        .where(eq(events.id, eventId));
    }

    const checkoutResponse = await fetch('https://api.dodopayments.com/v1/checkout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_cart: [
          {
            product_id: productId!,
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          eventId,
          tierId: tierId || '',
        },
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/events/${eventId}?payment=success`,
      }),
    });

    if (!checkoutResponse.ok) {
      throw new Error('Failed to create checkout session');
    }

    const checkout = await checkoutResponse.json();

    return {
      success: true,
      checkoutUrl: checkout.checkout_url,
    };
  } catch (error) {
    logger.error('Payment checkout failed', error);
    return { success: false, error: 'Payment processing failed' };
  }
}

export async function processFreeRegistration(eventId: string, tierId?: string) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Authentication required' };
  }

  try {
    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    const existing = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), eq(tickets.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: 'Already registered' };
    }

    if (event.capacity !== -1 && event.registeredCount >= event.capacity) {
      if (event.waitlistEnabled) {
        return { success: false, error: 'Event is full - please join the waitlist' };
      }
      return { success: false, error: 'Event is sold out' };
    }

    const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const entryCode = generateEntryCode();
    const expiresAt = new Date(event.endDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.transaction(async (tx) => {
      await tx.insert(tickets).values({
        eventId,
        userId,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price: '0',
        expiresAt,
      });

      // Re-check capacity in the incrementing statement so concurrent
      // registrations cannot both pass the pre-check and oversell the event.
      const [updatedEvent] = await tx
        .update(events)
        .set({ registeredCount: sql`${events.registeredCount} + 1` })
        .where(and(
          eq(events.id, eventId),
          or(eq(events.capacity, -1), lt(events.registeredCount, events.capacity))
        ))
        .returning();

      if (!updatedEvent) {
        throw new Error('Event is sold out');
      }
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/tickets');

    return { success: true, ticketNumber, entryCode };
  } catch (error) {
    logger.error('Free registration failed', error);
    return { success: false, error: 'Registration failed' };
  }
}

export async function handlePaymentWebhook(payload: any) {
  try {
    const { userId, eventId, tierId } = payload.metadata || {};

    if (!userId || !eventId) {
      logger.error('Invalid webhook metadata', payload);
      return { success: false, error: 'Invalid metadata' };
    }

    const existing = await db
      .select()
      .from(tickets)
      .where(and(eq(tickets.eventId, eventId), eq(tickets.userId, userId)))
      .limit(1);

    if (existing.length > 0) {
      return { success: true, message: 'Already processed' };
    }

    const event = await db.query.events.findFirst({
      where: eq(events.id, eventId),
    });

    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const entryCode = generateEntryCode();
    const expiresAt = new Date(event.endDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.transaction(async (tx) => {
      await tx.insert(tickets).values({
        eventId,
        userId,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price: event.price,
        expiresAt,
      });

      await tx
        .update(events)
        .set({ registeredCount: sql`${events.registeredCount} + 1` })
        .where(eq(events.id, eventId));
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/tickets');

    return { success: true, ticketNumber, entryCode };
  } catch (error) {
    logger.error('Payment webhook processing failed', error);
    return { success: false, error: 'Webhook processing failed' };
  }
}
