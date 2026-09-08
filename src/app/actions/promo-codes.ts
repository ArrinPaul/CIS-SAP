'use server';

import { db } from '@/lib/db';
import { promoCodes, events } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth, validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

import { calculateDiscount } from '@/core/utils/promo-codes';

export interface CreatePromoCodeInput {
  eventId?: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxUses?: number;
  minOrderAmount?: number;
  expiresAt?: string;
}

/**
 * A promo code belongs either to an event (its organisers may manage it) or to
 * the platform (its creator, or an admin).
 */
async function authorizePromoCode(promo: { eventId: string | null; createdBy: string | null }, userId: string) {
  if (promo.eventId) {
    await validateEventOwnership(promo.eventId);
    return;
  }
  if (promo.createdBy === userId) return;
  await validateRole(['admin']);
}

/**
 * Create a new Promo Code (Organizers & Admins)
 */
export async function createPromoCode(input: CreatePromoCodeInput) {
  try {
    const user = await requireAuth();

    if (input.eventId) {
      await validateEventOwnership(input.eventId);
    } else {
      await validateRole(['admin', 'organizer']);
    }

    const cleanCode = input.code.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 3) {
      return { success: false, error: 'Promo code must be at least 3 characters long.' };
    }

    if (input.discountValue <= 0) {
      return { success: false, error: 'Discount value must be greater than zero.' };
    }

    if (input.discountType === 'percentage' && input.discountValue > 100) {
      return { success: false, error: 'Percentage discount cannot exceed 100%.' };
    }

    const [created] = await db.insert(promoCodes).values({
      eventId: input.eventId ? (input.eventId as any) : null,
      code: cleanCode,
      discountType: input.discountType,
      discountValue: input.discountValue.toString() as any,
      maxUses: input.maxUses || null,
      minOrderAmount: (input.minOrderAmount || 0).toString() as any,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      isActive: true,
      createdBy: user.id,
    }).returning();

    if (input.eventId) {
      revalidatePath(`/events/${input.eventId}`);
      revalidatePath(`/organizer/ticketing`);
    }

    return { success: true, promoCode: created };
  } catch (error: any) {
    logger.error('Failed to create promo code:', error);
    return { success: false, error: error.message || 'Failed to create promo code.' };
  }
}

/**
 * Get all Promo Codes for an event or organizer
 */
export async function getEventPromoCodes(eventId?: string) {
  try {
    const user = await requireAuth();

    if (eventId) {
      await validateEventOwnership(eventId);
      const list = await db.query.promoCodes.findMany({
        where: eq(promoCodes.eventId, eventId as any),
        orderBy: [desc(promoCodes.createdAt)],
      });
      return { success: true, promoCodes: list };
    }

    // Otherwise get codes created by user
    const list = await db.query.promoCodes.findMany({
      where: eq(promoCodes.createdBy, user.id),
      orderBy: [desc(promoCodes.createdAt)],
    });
    return { success: true, promoCodes: list };
  } catch (error: any) {
    logger.error('Failed to fetch promo codes:', error);
    return { success: false, promoCodes: [], error: error.message };
  }
}

/**
 * Validate and apply a promo code during attendee checkout
 */
export async function validateAndApplyPromoCode(
  code: string,
  eventId: string,
  orderAmount: number
) {
  try {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, error: 'Please enter a promo code.' };
    }

    const promo = await db.query.promoCodes.findFirst({
      where: and(
        eq(promoCodes.code, cleanCode),
        sql`(${promoCodes.eventId} = ${eventId} OR ${promoCodes.eventId} IS NULL)`
      ),
    });

    if (!promo) {
      return { success: false, error: 'Invalid promo code.' };
    }

    if (!promo.isActive) {
      return { success: false, error: 'This promo code is no longer active.' };
    }

    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { success: false, error: 'This promo code has expired.' };
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return { success: false, error: 'This promo code has reached its maximum usage limit.' };
    }

    const minAmount = Number(promo.minOrderAmount || 0);
    if (orderAmount < minAmount) {
      return {
        success: false,
        error: `Minimum order amount of $${minAmount.toFixed(2)} required to use this code.`,
      };
    }

    const { discountAmount, finalAmount } = calculateDiscount(
      promo.discountType as 'percentage' | 'fixed',
      Number(promo.discountValue),
      orderAmount
    );

    return {
      success: true,
      promoCodeId: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      discountAmount,
      finalAmount,
    };
  } catch (error: any) {
    logger.error('Promo code validation error:', error);
    return { success: false, error: 'Failed to validate promo code.' };
  }
}

/**
 * Toggle promo code active status
 */
export async function togglePromoCodeStatus(promoCodeId: string, isActive: boolean) {
  try {
    const user = await requireAuth();
    const existing = await db.query.promoCodes.findFirst({
      where: eq(promoCodes.id, promoCodeId as any),
    });
    if (!existing) return { success: false, error: 'Promo code not found' };
    await authorizePromoCode(existing, user.id);

    await db.update(promoCodes).set({
      isActive,
      updatedAt: new Date(),
    }).where(eq(promoCodes.id, promoCodeId as any));

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete a promo code
 */
export async function deletePromoCode(promoCodeId: string) {
  try {
    const user = await requireAuth();
    const existing = await db.query.promoCodes.findFirst({
      where: eq(promoCodes.id, promoCodeId as any),
    });
    if (!existing) return { success: false, error: 'Promo code not found' };
    await authorizePromoCode(existing, user.id);

    await db.delete(promoCodes).where(eq(promoCodes.id, promoCodeId as any));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
