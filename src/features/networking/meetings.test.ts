import { describe, it, expect } from 'vitest';
import { checkSlotConflict, generateAvailableSlots } from '@/app/actions/meetings';

describe('1-on-1 Speed Networking & Meeting Scheduler Engine', () => {
  const baseDate = new Date('2026-09-15T09:00:00Z');

  it('detects slot conflict when new meeting overlaps existing meeting', () => {
    const existing = [
      {
        startTime: new Date('2026-09-15T10:00:00Z'),
        endTime: new Date('2026-09-15T10:30:00Z'),
        status: 'accepted',
      },
    ];

    // Overlapping start
    const conflict1 = checkSlotConflict(
      new Date('2026-09-15T10:15:00Z'),
      new Date('2026-09-15T10:45:00Z'),
      existing
    );
    expect(conflict1).toBe(true);

    // Enclosing
    const conflict2 = checkSlotConflict(
      new Date('2026-09-15T09:50:00Z'),
      new Date('2026-09-15T10:40:00Z'),
      existing
    );
    expect(conflict2).toBe(true);
  });

  it('allows back-to-back non-overlapping meetings', () => {
    const existing = [
      {
        startTime: new Date('2026-09-15T10:00:00Z'),
        endTime: new Date('2026-09-15T10:15:00Z'),
        status: 'accepted',
      },
    ];

    // Immediately after: 10:15 - 10:30
    const noConflict = checkSlotConflict(
      new Date('2026-09-15T10:15:00Z'),
      new Date('2026-09-15T10:30:00Z'),
      existing
    );
    expect(noConflict).toBe(false);
  });

  it('ignores declined or cancelled meetings when checking conflicts', () => {
    const existing = [
      {
        startTime: new Date('2026-09-15T10:00:00Z'),
        endTime: new Date('2026-09-15T10:30:00Z'),
        status: 'declined',
      },
      {
        startTime: new Date('2026-09-15T11:00:00Z'),
        endTime: new Date('2026-09-15T11:30:00Z'),
        status: 'cancelled',
      },
    ];

    const conflict = checkSlotConflict(
      new Date('2026-09-15T10:00:00Z'),
      new Date('2026-09-15T10:30:00Z'),
      existing
    );
    expect(conflict).toBe(false);
  });

  it('generates 15-minute conference time slots correctly', () => {
    const testDay = new Date('2026-09-15T00:00:00Z');
    const slots = generateAvailableSlots(testDay, 9, 11, 15); // 9:00 to 11:00 (2 hours = 8 slots)
    expect(slots.length).toBe(8);
    expect(slots[0].startTime.getHours()).toBe(9);
    expect(slots[0].startTime.getMinutes()).toBe(0);
    expect(slots[1].startTime.getMinutes()).toBe(15);
  });

  it('generates 30-minute conference time slots correctly', () => {
    const testDay = new Date('2026-09-15T00:00:00Z');
    const slots = generateAvailableSlots(testDay, 14, 16, 30); // 14:00 to 16:00 (2 hours = 4 slots)
    expect(slots.length).toBe(4);
    expect(slots[0].startTime.getHours()).toBe(14);
    expect(slots[1].startTime.getMinutes()).toBe(30);
  });
});
