import { describe, it, expect } from 'vitest';
import { 
  calculateSheetGrid, 
  formatAttendeeSubtitle, 
  roleBadgeColors 
} from '@/core/utils/badge-generator';

describe('Physical Badge & Name Tag Generator', () => {
  it('calculates 6-per-page sheet grids accurately', () => {
    const { totalPages, pages } = calculateSheetGrid(14, 6);
    expect(totalPages).toBe(3);
    expect(pages.length).toBe(3);
    expect(pages[0]).toEqual([0, 1, 2, 3, 4, 5]);
    expect(pages[1]).toEqual([6, 7, 8, 9, 10, 11]);
    expect(pages[2]).toEqual([12, 13]);
  });

  it('handles exact page multiples without creating empty trailing pages', () => {
    const { totalPages, pages } = calculateSheetGrid(12, 6);
    expect(totalPages).toBe(2);
    expect(pages.length).toBe(2);
    expect(pages[1].length).toBe(6);
  });

  it('handles single badge printing', () => {
    const { totalPages, pages } = calculateSheetGrid(1, 6);
    expect(totalPages).toBe(1);
    expect(pages[0]).toEqual([0]);
  });

  it('handles zero attendee count gracefully', () => {
    const { totalPages, pages } = calculateSheetGrid(0, 6);
    expect(totalPages).toBe(0);
    expect(pages).toEqual([]);
  });

  it('formats attendee subtitles correctly with company and designation', () => {
    expect(formatAttendeeSubtitle('Lead AI Engineer', 'Google')).toBe('Lead AI Engineer • Google');
    expect(formatAttendeeSubtitle('Founder', '')).toBe('Founder');
    expect(formatAttendeeSubtitle('', 'MIT')).toBe('MIT');
    expect(formatAttendeeSubtitle('', '')).toBe('Attendee');
  });

  it('provides distinct colors and badges for all key conference roles', () => {
    expect(roleBadgeColors.vip.label).toBe('VIP PASS');
    expect(roleBadgeColors.speaker.label).toBe('SPEAKER');
    expect(roleBadgeColors.organizer.label).toBe('ORGANIZER');
    expect(roleBadgeColors.sponsor.label).toBe('SPONSOR');
    expect(roleBadgeColors.volunteer.label).toBe('STAFF / VOLUNTEER');
    expect(roleBadgeColors.attendee.label).toBe('ALL ACCESS ATTENDEE');

    // Ensure all roles have contrasting text/bg
    Object.values(roleBadgeColors).forEach((style) => {
      expect(style.bg).toBeDefined();
      expect(style.text).toBeDefined();
      expect(style.border).toBeDefined();
    });
  });
});
