/**
 * Sponsor Tiers and Sorting Utilities
 */

export type SponsorTier = 'title' | 'platinum' | 'gold' | 'silver' | 'bronze' | 'community';

export const tierPriority: Record<SponsorTier, number> = {
  title: 1,
  platinum: 2,
  gold: 3,
  silver: 4,
  bronze: 5,
  community: 6,
};

export const tierBadgeStyles: Record<
  SponsorTier,
  { label: string; badgeClass: string; bgClass: string; bg: string; text: string; border: string }
> = {
  title: {
    label: 'TITLE SPONSOR',
    badgeClass: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    bgClass: 'from-amber-500/10 via-amber-500/5 to-transparent',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
  },
  platinum: {
    label: 'PLATINUM',
    badgeClass: 'bg-cyan-500/15 text-cyan-500 border-cyan-500/30',
    bgClass: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
    bg: 'bg-cyan-500/20',
    text: 'text-cyan-400',
    border: 'border-cyan-500/40',
  },
  gold: {
    label: 'GOLD',
    badgeClass: 'bg-yellow-500/15 text-yellow-500 border-yellow-500/30',
    bgClass: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-400',
    border: 'border-yellow-500/40',
  },
  silver: {
    label: 'SILVER',
    badgeClass: 'bg-slate-400/15 text-slate-300 border-slate-400/30',
    bgClass: 'from-slate-400/10 via-slate-400/5 to-transparent',
    bg: 'bg-slate-300/20',
    text: 'text-slate-300',
    border: 'border-slate-400/40',
  },
  bronze: {
    label: 'BRONZE',
    badgeClass: 'bg-orange-600/15 text-orange-400 border-orange-600/30',
    bgClass: 'from-orange-600/10 via-orange-600/5 to-transparent',
    bg: 'bg-orange-700/20',
    text: 'text-orange-400',
    border: 'border-orange-600/40',
  },
  community: {
    label: 'COMMUNITY PARTNER',
    badgeClass: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30',
    bgClass: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
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

    // Secondary sort: Custom orderIndex
    const orderA = a.orderIndex ?? 0;
    const orderB = b.orderIndex ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // Tertiary: Alphabetical
    return a.name.localeCompare(b.name);
  });
}
