import { describe, it, expect, vi } from 'vitest';
import { runEventLifecycleSync } from './event-lifecycle';

// Mock DB queries & updates
vi.mock('@/lib/db', () => {
  const selectHandler = () => ({
    from: vi.fn(() => ({
      where: vi.fn().mockResolvedValue([
        { id: 'evt-1', title: 'Ongoing Event', startDate: new Date(Date.now() - 10000), endDate: new Date(Date.now() + 100000) }
      ]),
      innerJoin: vi.fn(() => ({
        where: vi.fn().mockResolvedValue([
          { userId: 'u-1', userName: 'Alice', userEmail: 'alice@example.com' }
        ]),
      })),
    })),
  });

  const mockDb = {
    select: vi.fn(selectHandler),
    selectDistinct: vi.fn(selectHandler),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn().mockReturnValue({
        catch: vi.fn(),
      }),
    })),
  };

  return { db: mockDb };
});

vi.mock('@/core/services/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  constructFeedbackEmail: vi.fn().mockReturnValue({ subject: 'Feedback', html: '<p>Feedback</p>' }),
  constructCertificateEmail: vi.fn().mockReturnValue({ subject: 'Certificate', html: '<p>Certificate</p>' }),
}));

vi.mock('./registrations', () => ({
  expireWaitlistReservations: vi.fn().mockResolvedValue([]),
}));

describe('Event Lifecycle Sync Action', () => {
  it('executes lifecycle sync without throwing and returns result stats', async () => {
    const result = await runEventLifecycleSync();
    expect(result).toBeDefined();
    expect(typeof result.activatedEventsCount).toBe('number');
    expect(typeof result.completedEventsCount).toBe('number');
    expect(typeof result.feedbackEmailsSentCount).toBe('number');
    expect(typeof result.expiredWaitlistCount).toBe('number');
    expect(result.timestamp).toBeDefined();
  });
});
