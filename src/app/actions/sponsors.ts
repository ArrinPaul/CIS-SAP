'use server';

import { db } from '@/lib/db';
import { eventSponsors, sponsorLeads, events, users } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAuth, validateRole, validateEventOwnership } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';

export type SponsorTier = 'title' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';

export const tierPriority: Record<SponsorTier, number> = {
  title: 1,
  platinum: 2,
  gold: 3,
  silver: 4,
  bronze: 5,
  community: 6,
};

export const tierBadgeStyles: Record<SponsorTier, { label: string; bg: string; text: string; border: string }> = {
  title: {
    label: 'TITLE SPONSOR',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
  },
  platinum: {
    label: 'PLATINUM',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
  },
  gold: {
    label: 'GOLD',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
  },
  silver: {
    label: 'SILVER',
    bg: 'bg-slate-300/20',
    text: 'text-slate-300',
    border: 'border-slate-400/40',
  },
  bronze: {
    label: 'BRONZE',
    bg: 'bg-orange-700/20',
    text: 'text-orange-400',
    border: 'border-orange-600/40',
  },
  community: {
    label: 'COMMUNITY PARTNER',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
  },
};

/**
 * Pure helper to sort sponsors by tier hierarchy and custom order index
 */
export function sortSponsorsByTier<T extends { tier: string; orderIndex?: number; name: string }>(sponsors: T[]): T[] {
  return [...sponsors].sort((a, b) => {
    const priorityA = tierPriority[a.tier as SponsorTier] || 99;
    const priorityB = tierPriority[b.tier as SponsorTier] || 99;

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    const orderA = a.orderIndex ?? 0;
    const orderB = b.orderIndex ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    return a.name.localeCompare(b.name);
  });
}

export interface CreateSponsorInput {
  eventId: string;
  name: string;
  tier?: SponsorTier;
  logoUrl?: string;
  bannerUrl?: string;
  websiteUrl?: string;
  careersUrl?: string;
  description?: string;
  demoVideoUrl?: string;
  promoOffer?: string;
  boothNumber?: string;
  orderIndex?: number;
}

/**
 * Create a new Sponsor / Exhibitor Booth
 */
export async function createSponsor(input: CreateSponsorInput) {
  try {
    const user = await requireAuth();
    await validateEventOwnership(input.eventId);

    const [created] = await db.insert(eventSponsors).values({
      eventId: input.eventId as any,
      name: input.name.trim(),
      tier: input.tier || 'gold',
      logoUrl: input.logoUrl?.trim() || null,
      bannerUrl: input.bannerUrl?.trim() || null,
      websiteUrl: input.websiteUrl?.trim() || null,
      careersUrl: input.careersUrl?.trim() || null,
      description: input.description?.trim() || null,
      demoVideoUrl: input.demoVideoUrl?.trim() || null,
      promoOffer: input.promoOffer?.trim() || null,
      boothNumber: input.boothNumber?.trim() || null,
      orderIndex: input.orderIndex || 0,
    }).returning();

    revalidatePath(`/events/${input.eventId}`);
    revalidatePath(`/organizer/sponsors`);
    return { success: true, sponsor: created };
  } catch (error: any) {
    logger.error('Failed to create sponsor:', error);
    return { success: false, error: error.message || 'Failed to create sponsor' };
  }
}

/**
 * Update an existing Sponsor
 */
export async function updateSponsor(sponsorId: string, input: Partial<CreateSponsorInput>) {
  try {
    const user = await requireAuth();

    const existing = await db.query.eventSponsors.findFirst({
      where: eq(eventSponsors.id, sponsorId as any),
    });

    if (!existing) {
      return { success: false, error: 'Sponsor not found' };
    }

    await validateEventOwnership(existing.eventId);

    const [updated] = await db.update(eventSponsors).set({
      ...(input.name ? { name: input.name.trim() } : {}),
      ...(input.tier ? { tier: input.tier } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl?.trim() || null } : {}),
      ...(input.bannerUrl !== undefined ? { bannerUrl: input.bannerUrl?.trim() || null } : {}),
      ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl?.trim() || null } : {}),
      ...(input.careersUrl !== undefined ? { careersUrl: input.careersUrl?.trim() || null } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.demoVideoUrl !== undefined ? { demoVideoUrl: input.demoVideoUrl?.trim() || null } : {}),
      ...(input.promoOffer !== undefined ? { promoOffer: input.promoOffer?.trim() || null } : {}),
      ...(input.boothNumber !== undefined ? { boothNumber: input.boothNumber?.trim() || null } : {}),
      ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
      updatedAt: new Date(),
    }).where(eq(eventSponsors.id, sponsorId as any)).returning();

    revalidatePath(`/events/${existing.eventId}`);
    revalidatePath(`/organizer/sponsors`);
    return { success: true, sponsor: updated };
  } catch (error: any) {
    logger.error('Failed to update sponsor:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a sponsor
 */
export async function deleteSponsor(sponsorId: string) {
  try {
    const user = await requireAuth();

    const existing = await db.query.eventSponsors.findFirst({
      where: eq(eventSponsors.id, sponsorId as any),
    });

    if (!existing) {
      return { success: false, error: 'Sponsor not found' };
    }

    await validateEventOwnership(existing.eventId);

    await db.delete(eventSponsors).where(eq(eventSponsors.id, sponsorId as any));

    revalidatePath(`/events/${existing.eventId}`);
    revalidatePath(`/organizer/sponsors`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all sponsors for an event, sorted by tier
 */
export async function getEventSponsors(eventId: string) {
  try {
    const list = await db.query.eventSponsors.findMany({
      where: eq(eventSponsors.eventId, eventId as any),
      orderBy: [desc(eventSponsors.orderIndex)],
    });

    const sorted = sortSponsorsByTier(list);
    return { success: true, sponsors: sorted };
  } catch (error: any) {
    logger.error('Failed to fetch event sponsors:', error);
    return { success: false, sponsors: [], error: error.message };
  }
}

/**
 * Drop digital business card / Capture attendee lead
 */
export async function captureSponsorLead(sponsorId: string, notes?: string) {
  try {
    const user = await requireAuth();

    // Check if lead already captured
    const existing = await db.query.sponsorLeads.findFirst({
      where: and(
        eq(sponsorLeads.sponsorId, sponsorId as any),
        eq(sponsorLeads.userId, user.id)
      ),
    });

    if (existing) {
      return { success: true, message: 'You have already connected with this exhibitor booth.' };
    }

    await db.insert(sponsorLeads).values({
      sponsorId: sponsorId as any,
      userId: user.id,
      notes: notes?.trim() || null,
    });

    // Increment lead count on sponsor
    await db.update(eventSponsors).set({
      leadCount: sql`${eventSponsors.leadCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(eventSponsors.id, sponsorId as any));

    return { success: true, message: 'Digital business card dropped! The sponsor will reach out to you.' };
  } catch (error: any) {
    logger.error('Failed to capture lead:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all leads captured by a sponsor (for organizers & exhibitors)
 */
export async function getSponsorLeads(sponsorId: string) {
  try {
    const user = await requireAuth();

    const sponsor = await db.query.eventSponsors.findFirst({
      where: eq(eventSponsors.id, sponsorId as any),
    });

    if (!sponsor) {
      return { success: false, leads: [], error: 'Sponsor not found' };
    }

    await validateEventOwnership(sponsor.eventId);

    const leads = await db.query.sponsorLeads.findMany({
      where: eq(sponsorLeads.sponsorId, sponsorId as any),
      with: {
        user: true,
      },
      orderBy: [desc(sponsorLeads.createdAt)],
    });

    return { success: true, leads };
  } catch (error: any) {
    return { success: false, leads: [], error: error.message };
  }
}
