import { describe, it, expect } from 'vitest';
import { sortSponsorsByTier, tierBadgeStyles, tierPriority } from '@/core/utils/sponsors';

describe('Sponsor & Exhibitor Virtual Booth Engine', () => {
  it('correctly sorts sponsors according to tier hierarchy', () => {
    const sponsors = [
      { name: 'Beta Community', tier: 'community', orderIndex: 0 },
      { name: 'Acme Corp', tier: 'gold', orderIndex: 0 },
      { name: 'Apex AI', tier: 'title', orderIndex: 0 },
      { name: 'Nexus Cloud', tier: 'silver', orderIndex: 0 },
      { name: 'Titan Tech', tier: 'platinum', orderIndex: 0 },
      { name: 'Delta Devs', tier: 'bronze', orderIndex: 0 },
    ];

    const sorted = sortSponsorsByTier(sponsors);

    expect(sorted[0].name).toBe('Apex AI'); // title
    expect(sorted[1].name).toBe('Titan Tech'); // platinum
    expect(sorted[2].name).toBe('Acme Corp'); // gold
    expect(sorted[3].name).toBe('Nexus Cloud'); // silver
    expect(sorted[4].name).toBe('Delta Devs'); // bronze
    expect(sorted[5].name).toBe('Beta Community'); // community
  });

  it('respects custom orderIndex when sponsors share the same tier', () => {
    const goldSponsors = [
      { name: 'Zeta Systems', tier: 'gold', orderIndex: 2 },
      { name: 'Alpha Data', tier: 'gold', orderIndex: 1 },
      { name: 'Gamma Labs', tier: 'gold', orderIndex: 3 },
    ];

    const sorted = sortSponsorsByTier(goldSponsors);

    expect(sorted[0].name).toBe('Alpha Data');
    expect(sorted[1].name).toBe('Zeta Systems');
    expect(sorted[2].name).toBe('Gamma Labs');
  });

  it('falls back to alphabetical order when tier and orderIndex match', () => {
    const sponsors = [
      { name: 'Zeta Inc', tier: 'silver', orderIndex: 0 },
      { name: 'Alpha Solutions', tier: 'silver', orderIndex: 0 },
      { name: 'Beta Networks', tier: 'silver', orderIndex: 0 },
    ];

    const sorted = sortSponsorsByTier(sponsors);

    expect(sorted[0].name).toBe('Alpha Solutions');
    expect(sorted[1].name).toBe('Beta Networks');
    expect(sorted[2].name).toBe('Zeta Inc');
  });

  it('provides distinct badge styling and labels for all tiers', () => {
    expect(tierBadgeStyles.title.label).toBe('TITLE SPONSOR');
    expect(tierBadgeStyles.platinum.label).toBe('PLATINUM');
    expect(tierBadgeStyles.gold.label).toBe('GOLD');
    expect(tierBadgeStyles.silver.label).toBe('SILVER');
    expect(tierBadgeStyles.bronze.label).toBe('BRONZE');
    expect(tierBadgeStyles.community.label).toBe('COMMUNITY PARTNER');

    expect(tierPriority.title).toBeLessThan(tierPriority.platinum);
    expect(tierPriority.platinum).toBeLessThan(tierPriority.gold);
    expect(tierPriority.gold).toBeLessThan(tierPriority.silver);
    expect(tierPriority.silver).toBeLessThan(tierPriority.bronze);
    expect(tierPriority.bronze).toBeLessThan(tierPriority.community);
  });
});
