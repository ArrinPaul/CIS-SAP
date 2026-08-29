/**
 * Net Promoter Score (NPS) & Post-Event Feedback Analytics Engine
 */

export interface FeedbackRecord {
  rating: number; // 1 to 5
  npsScore?: number | null; // 0 to 10
  venueRating?: number | null; // 1 to 5
  contentRating?: number | null; // 1 to 5
  organizationRating?: number | null; // 1 to 5
  comment?: string | null;
  highlight?: string | null;
  improvement?: string | null;
  allowTestimonial?: boolean;
}

export interface NpsSummary {
  nps: number; // -100 to +100
  totalResponses: number;
  promoterCount: number;
  passiveCount: number;
  detractorCount: number;
  promoterPercentage: number;
  passivePercentage: number;
  detractorPercentage: number;
  statusLabel: 'World Class' | 'Excellent' | 'Good' | 'Needs Improvement' | 'Critical';
}

export interface FeedbackAverages {
  overallRating: number;
  venueRating: number;
  contentRating: number;
  organizationRating: number;
  ratingDistribution: { [key: number]: number }; // 1: count, 2: count, etc.
}

/**
 * Calculate Net Promoter Score (NPS) based on standard industry methodology
 * Promoters: 9–10, Passives: 7–8, Detractors: 0–6
 */
export function calculateNps(feedbacks: FeedbackRecord[]): NpsSummary {
  const validNps = feedbacks.filter(
    (f) => typeof f.npsScore === 'number' && f.npsScore >= 0 && f.npsScore <= 10
  );

  if (validNps.length === 0) {
    return {
      nps: 0,
      totalResponses: 0,
      promoterCount: 0,
      passiveCount: 0,
      detractorCount: 0,
      promoterPercentage: 0,
      passivePercentage: 0,
      detractorPercentage: 0,
      statusLabel: 'Good',
    };
  }

  let promoterCount = 0;
  let passiveCount = 0;
  let detractorCount = 0;

  validNps.forEach((f) => {
    const score = f.npsScore!;
    if (score >= 9) {
      promoterCount++;
    } else if (score >= 7) {
      passiveCount++;
    } else {
      detractorCount++;
    }
  });

  const total = validNps.length;
  const promoterPct = Math.round((promoterCount / total) * 100);
  const passivePct = Math.round((passiveCount / total) * 100);
  const detractorPct = Math.round((detractorCount / total) * 100);

  const nps = promoterPct - detractorPct;

  let statusLabel: NpsSummary['statusLabel'] = 'Good';
  if (nps >= 70) statusLabel = 'World Class';
  else if (nps >= 50) statusLabel = 'Excellent';
  else if (nps >= 0) statusLabel = 'Good';
  else if (nps >= -30) statusLabel = 'Needs Improvement';
  else statusLabel = 'Critical';

  return {
    nps,
    totalResponses: total,
    promoterCount,
    passiveCount,
    detractorCount,
    promoterPercentage: promoterPct,
    passivePercentage: passivePct,
    detractorPercentage: detractorPct,
    statusLabel,
  };
}

/**
 * Calculate multi-dimensional feedback category averages
 */
export function calculateFeedbackAverages(feedbacks: FeedbackRecord[]): FeedbackAverages {
  if (feedbacks.length === 0) {
    return {
      overallRating: 0,
      venueRating: 0,
      contentRating: 0,
      organizationRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let overallSum = 0;
  let venueSum = 0;
  let venueCount = 0;
  let contentSum = 0;
  let contentCount = 0;
  let orgSum = 0;
  let orgCount = 0;

  feedbacks.forEach((f) => {
    const r = Math.min(5, Math.max(1, Math.round(f.rating)));
    ratingDistribution[r] = (ratingDistribution[r] || 0) + 1;
    overallSum += f.rating;

    if (typeof f.venueRating === 'number' && f.venueRating > 0) {
      venueSum += f.venueRating;
      venueCount++;
    }
    if (typeof f.contentRating === 'number' && f.contentRating > 0) {
      contentSum += f.contentRating;
      contentCount++;
    }
    if (typeof f.organizationRating === 'number' && f.organizationRating > 0) {
      orgSum += f.organizationRating;
      orgCount++;
    }
  });

  const count = feedbacks.length;
  const round1 = (val: number) => Math.round(val * 10) / 10;

  return {
    overallRating: round1(overallSum / count),
    venueRating: venueCount > 0 ? round1(venueSum / venueCount) : 0,
    contentRating: contentCount > 0 ? round1(contentSum / contentCount) : 0,
    organizationRating: orgCount > 0 ? round1(orgSum / orgCount) : 0,
    ratingDistribution,
  };
}

/**
 * Check if the attendee should be prompted with the post-event feedback survey
 */
export function shouldPromptFeedback(
  event: { startDate: Date | string; endDate: Date | string; status?: string },
  isRegistered: boolean,
  hasSubmittedFeedback: boolean,
  currentDate: Date = new Date()
): boolean {
  if (!isRegistered || hasSubmittedFeedback) {
    return false;
  }

  if (event.status === 'completed') {
    return true;
  }

  const end = new Date(event.endDate);
  return currentDate >= end;
}
