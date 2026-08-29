import { describe, it, expect } from 'vitest';
import { 
  calculateNps, 
  calculateFeedbackAverages, 
  shouldPromptFeedback,
  FeedbackRecord 
} from '@/core/utils/nps-analytics';

describe('Post-Event Feedback & NPS Analytics Engine', () => {
  it('calculates +100 NPS when all attendees are promoters (9-10)', () => {
    const feedbacks: FeedbackRecord[] = [
      { rating: 5, npsScore: 10 },
      { rating: 5, npsScore: 9 },
      { rating: 5, npsScore: 10 },
    ];

    const result = calculateNps(feedbacks);
    expect(result.nps).toBe(100);
    expect(result.promoterCount).toBe(3);
    expect(result.detractorCount).toBe(0);
    expect(result.statusLabel).toBe('World Class');
  });

  it('calculates -100 NPS when all attendees are detractors (0-6)', () => {
    const feedbacks: FeedbackRecord[] = [
      { rating: 1, npsScore: 2 },
      { rating: 2, npsScore: 5 },
      { rating: 1, npsScore: 4 },
    ];

    const result = calculateNps(feedbacks);
    expect(result.nps).toBe(-100);
    expect(result.detractorCount).toBe(3);
    expect(result.statusLabel).toBe('Critical');
  });

  it('calculates accurate net promoter percentages for mixed response sets', () => {
    // 6 promoters (60%), 2 passives (20%), 2 detractors (20%) -> NPS = 60 - 20 = +40
    const feedbacks: FeedbackRecord[] = [
      { rating: 5, npsScore: 10 },
      { rating: 5, npsScore: 9 },
      { rating: 5, npsScore: 10 },
      { rating: 4, npsScore: 9 },
      { rating: 5, npsScore: 9 },
      { rating: 5, npsScore: 10 },
      { rating: 4, npsScore: 8 }, // passive
      { rating: 3, npsScore: 7 }, // passive
      { rating: 2, npsScore: 4 }, // detractor
      { rating: 1, npsScore: 1 }, // detractor
    ];

    const result = calculateNps(feedbacks);
    expect(result.totalResponses).toBe(10);
    expect(result.promoterPercentage).toBe(60);
    expect(result.passivePercentage).toBe(20);
    expect(result.detractorPercentage).toBe(20);
    expect(result.nps).toBe(40);
    expect(result.statusLabel).toBe('Good');
  });

  it('computes category ratings and rating distributions accurately', () => {
    const feedbacks: FeedbackRecord[] = [
      { rating: 5, venueRating: 4, contentRating: 5, organizationRating: 4 },
      { rating: 4, venueRating: 5, contentRating: 4, organizationRating: 5 },
      { rating: 3, venueRating: 3, contentRating: 3, organizationRating: 3 },
    ];

    const avg = calculateFeedbackAverages(feedbacks);
    expect(avg.overallRating).toBe(4);
    expect(avg.venueRating).toBe(4);
    expect(avg.contentRating).toBe(4);
    expect(avg.organizationRating).toBe(4);
    expect(avg.ratingDistribution[5]).toBe(1);
    expect(avg.ratingDistribution[4]).toBe(1);
    expect(avg.ratingDistribution[3]).toBe(1);
  });

  it('determines survey prompt eligibility correctly', () => {
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    const futureDate = new Date(Date.now() + 3600000); // 1 hour future
    const eventEnded = { startDate: new Date(Date.now() - 7200000), endDate: pastDate };
    const eventOngoing = { startDate: new Date(Date.now() - 3600000), endDate: futureDate };

    // Case 1: Not registered -> False
    expect(shouldPromptFeedback(eventEnded, false, false)).toBe(false);

    // Case 2: Already submitted -> False
    expect(shouldPromptFeedback(eventEnded, true, true)).toBe(false);

    // Case 3: Registered, not submitted, but event still ongoing -> False
    expect(shouldPromptFeedback(eventOngoing, true, false)).toBe(false);

    // Case 4: Registered, not submitted, and event has ended -> True
    expect(shouldPromptFeedback(eventEnded, true, false)).toBe(true);

    // Case 5: Explicit completed status -> True
    expect(shouldPromptFeedback({ ...eventOngoing, status: 'completed' }, true, false)).toBe(true);
  });
});
