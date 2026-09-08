'use server';

import { db } from '@/lib/db';
import { events, tickets, orders, payouts, users } from '@/lib/db/schema';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { PLATFORM_FEE_RATE, MIN_PAYOUT_AMOUNT, computePlatformFee } from '@/core/utils/payouts';

export interface PayoutSummary {
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
  totalPaidOut: number;
  pendingPayouts: number;
  availableBalance: number;
  totalTicketsSold: number;
  payoutHistory: Array<{
    id: string;
    amount: string;
    platformFee: string;
    netAmount: string;
    status: string;
    payoutMethod: string;
    destinationDetails: any;
    transactionReference: string | null;
    createdAt: Date;
  }>;
}

/**
 * Get comprehensive financial ledger and payout stats for an organizer.
 */
export async function getOrganizerPayoutSummary(targetOrganizerId?: string): Promise<PayoutSummary> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Authentication required');
  }

  const organizerId = targetOrganizerId || userId;

  try {
    // 1. Get all events owned by this organizer
    const organizerEvents = await db
      .select({ id: events.id, price: events.price, isPaid: events.isPaid })
      .from(events)
      .where(eq(events.organizerId, organizerId));

    if (organizerEvents.length === 0) {
      return {
        grossRevenue: 0,
        platformFees: 0,
        netRevenue: 0,
        totalPaidOut: 0,
        pendingPayouts: 0,
        availableBalance: 0,
        totalTicketsSold: 0,
        payoutHistory: [],
      };
    }

    const eventIds = organizerEvents.map(e => e.id);

    // 2. Aggregate gross revenues from confirmed tickets
    const confirmedTickets = await db
      .select({
        price: tickets.price,
      })
      .from(tickets)
      .where(
        and(
          inArray(tickets.eventId, eventIds),
          inArray(tickets.status, ['confirmed', 'checked-in'])
        )
      );

    const totalTicketsSold = confirmedTickets.length;
    const grossRevenue = confirmedTickets.reduce(
      (sum, t) => sum + Number(t.price || 0),
      0
    );

    const { platformFee: platformFees, netAmount: netRevenue } = computePlatformFee(grossRevenue);

    // 3. Fetch payout history for this organizer
    const payoutRecords = await db
      .select({
        id: payouts.id,
        amount: payouts.amount,
        platformFee: payouts.platformFee,
        netAmount: payouts.netAmount,
        status: payouts.status,
        payoutMethod: payouts.payoutMethod,
        destinationDetails: payouts.destinationDetails,
        transactionReference: payouts.transactionReference,
        createdAt: payouts.createdAt,
      })
      .from(payouts)
      .where(eq(payouts.organizerId, organizerId))
      .orderBy(desc(payouts.createdAt));

    let totalPaidOut = 0;
    let pendingPayouts = 0;

    for (const p of payoutRecords) {
      const amt = Number(p.amount || 0);
      if (p.status === 'completed') {
        totalPaidOut += amt;
      } else if (p.status === 'pending' || p.status === 'processing') {
        pendingPayouts += amt;
      }
    }

    const availableBalance = Math.max(0, Math.round((netRevenue - (totalPaidOut + pendingPayouts)) * 100) / 100);

    return {
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFees,
      netRevenue,
      totalPaidOut: Math.round(totalPaidOut * 100) / 100,
      pendingPayouts: Math.round(pendingPayouts * 100) / 100,
      availableBalance,
      totalTicketsSold,
      payoutHistory: payoutRecords,
    };
  } catch (error) {
    logger.error('[Payouts] Error getting payout summary', error);
    throw new Error('Failed to retrieve financial ledger summary');
  }
}

/**
 * Submit a withdrawal request from organizer's available balance.
 */
export async function requestOrganizerPayout(input: {
  amount: number;
  payoutMethod?: string;
  destinationDetails: {
    accountName: string;
    accountNumber: string;
    routingOrIfsc: string;
    bankName?: string;
  };
  notes?: string;
}) {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Authentication required' };
  }

  const { amount, payoutMethod = 'bank_transfer', destinationDetails, notes } = input;

  if (!amount || amount < MIN_PAYOUT_AMOUNT) {
    return {
      success: false,
      error: `Minimum withdrawal amount is ${MIN_PAYOUT_AMOUNT}`,
    };
  }

  if (!destinationDetails?.accountNumber || !destinationDetails?.accountName) {
    return {
      success: false,
      error: 'Please provide valid bank destination details',
    };
  }

  try {
    const summary = await getOrganizerPayoutSummary(userId);

    if (amount > summary.availableBalance) {
      return {
        success: false,
        error: `Insufficient available balance. Requested: ₹${amount}, Available: ₹${summary.availableBalance}`,
      };
    }

    const { platformFee, netAmount } = computePlatformFee(amount);

    const [newPayout] = await db
      .insert(payouts)
      .values({
        organizerId: userId,
        amount: String(amount),
        platformFee: String(platformFee),
        netAmount: String(netAmount),
        status: 'pending',
        payoutMethod,
        destinationDetails,
        notes: notes || null,
      })
      .returning();

    revalidatePath('/dashboard/payouts');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: 'Payout withdrawal requested successfully',
      payout: newPayout,
    };
  } catch (error) {
    logger.error('[Payouts] Error requesting payout', error);
    return { success: false, error: 'Failed to process payout request' };
  }
}
