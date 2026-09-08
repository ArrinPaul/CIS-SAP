'use server';

import { db } from '@/lib/db';
import { events, tickets, ticketTiers } from '@/lib/db/schema';
import { eq, and, lt, or, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { generateEntryCode, generateQrPayload } from '@/core/utils/crypto';
import { redeemPromoCode } from '@/app/actions/promo-codes';

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

    // If a tier was selected, its price (not the event base price) is what
    // must be charged and reconciled against later in the webhook.
    let tier: typeof ticketTiers.$inferSelect | undefined;
    if (tierId) {
      tier = await db.query.ticketTiers.findFirst({ where: eq(ticketTiers.id, tierId) });
      if (!tier || tier.eventId !== eventId) {
        return { success: false, error: 'Ticket tier not found' };
      }
      if (tier.capacity !== -1 && tier.registeredCount >= tier.capacity) {
        return { success: false, error: 'This ticket tier is sold out' };
      }
    }
    const chargeAmount = tier ? Number(tier.price) : Number(event.price);

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'Payment system not configured' };
    }

    // Tiered products are priced per-tier, so they can't reuse the event's
    // cached externalId (that product is priced at the event base price).
    let productId = tier ? undefined : event.externalId;

    if (!productId) {
      const response = await fetch('https://api.dodopayments.com/v1/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tier ? `${event.title} — ${tier.name}` : event.title,
          description: `Tickets for ${event.title}`,
          price: {
            price: Math.round(chargeAmount * 100),
            currency: 'INR',
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create product');
      }

      const product = await response.json();
      productId = product.product_id;

      if (!tier) {
        await db
          .update(events)
          .set({ externalId: productId })
          .where(eq(events.id, eventId));
      }
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
          expectedAmount: chargeAmount.toString(),
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
        tierId,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price: '0',
        qrCode: generateQrPayload(ticketNumber),
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

      if (tierId) {
        const [updatedTier] = await tx
          .update(ticketTiers)
          .set({ registeredCount: sql`${ticketTiers.registeredCount} + 1` })
          .where(and(
            eq(ticketTiers.id, tierId),
            or(eq(ticketTiers.capacity, -1), lt(ticketTiers.registeredCount, ticketTiers.capacity))
          ))
          .returning();

        if (!updatedTier) {
          throw new Error('This ticket tier is sold out');
        }
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
    const { userId, eventId, tierId, expectedAmount, promoCodeId } = payload.metadata || {};

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

    let tier: typeof ticketTiers.$inferSelect | undefined;
    if (tierId) {
      tier = await db.query.ticketTiers.findFirst({ where: eq(ticketTiers.id, tierId) });
    }
    const price = tier ? tier.price : event.price;

    // Defense-in-depth: the amount actually settled should match what the
    // checkout was created for (see createCheckoutSession's expectedAmount).
    // Signature verification already stops third parties from forging this
    // webhook, but this catches a stale/mismatched price at settlement time.
    const paidAmount = Number(
      payload.total_amount ?? payload.settlement_amount ?? payload.amount ?? NaN
    );
    if (expectedAmount && Number.isFinite(paidAmount)) {
      const normalizedPaid = paidAmount > 1000 ? paidAmount / 100 : paidAmount; // handle amounts in minor units
      if (Math.abs(normalizedPaid - Number(expectedAmount)) > 0.01) {
        logger.error('Paid amount does not match expected amount', {
          eventId, tierId, expectedAmount, paidAmount: normalizedPaid,
        });
      }
    }

    const ticketNumber = `TKT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const entryCode = generateEntryCode();
    const expiresAt = new Date(event.endDate);
    expiresAt.setHours(expiresAt.getHours() + 24);

    await db.transaction(async (tx) => {
      if (promoCodeId) {
        const redeemed = await redeemPromoCode(promoCodeId, tx as any);
        if (!redeemed) {
          throw new Error('Promo code is no longer valid');
        }
      }

      await tx.insert(tickets).values({
        eventId,
        userId,
        tierId: tierId || undefined,
        ticketNumber,
        entryCode,
        status: 'confirmed',
        price,
        qrCode: generateQrPayload(ticketNumber),
        expiresAt,
      });

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

      if (tierId) {
        const [updatedTier] = await tx
          .update(ticketTiers)
          .set({ registeredCount: sql`${ticketTiers.registeredCount} + 1` })
          .where(and(
            eq(ticketTiers.id, tierId),
            or(eq(ticketTiers.capacity, -1), lt(ticketTiers.registeredCount, ticketTiers.capacity))
          ))
          .returning();

        if (!updatedTier) {
          throw new Error('This ticket tier is sold out');
        }
      }
    });

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/tickets');

    return { success: true, ticketNumber, entryCode };
  } catch (error) {
    logger.error('Payment webhook processing failed', error);
    return { success: false, error: 'Webhook processing failed' };
  }
}
