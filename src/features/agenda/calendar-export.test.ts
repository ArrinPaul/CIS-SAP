import { describe, it, expect } from 'vitest';
import { 
  formatDateToIcs, 
  generateIcsContent, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl 
} from '@/core/utils/calendar-export';

describe('Calendar Export & RFC 5545 iCalendar Engine', () => {
  const sampleDate = new Date('2026-09-15T14:30:00Z');
  const sampleEndDate = new Date('2026-09-15T15:15:00Z');

  const sampleSession = {
    id: 'sess-123',
    title: 'Keynote: Scaling Large Models',
    description: 'Deep dive into frontier model serving and latency optimization.',
    track: 'AI Main Stage',
    startTime: sampleDate,
    endTime: sampleEndDate,
    speakerName: 'Dr. Jane Doe',
    speakerTitle: 'Chief Scientist @ AI Corp',
    roomLocation: 'Grand Hall A',
  };

  it('formats dates accurately to RFC 5545 UTC timestamps', () => {
    const formatted = formatDateToIcs(sampleDate);
    expect(formatted).toBe('20260915T143000Z');
  });

  it('generates valid RFC 5545 iCalendar (.ics) content', () => {
    const ics = generateIcsContent('Eventra AI Summit', [sampleSession]);

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Eventra Inc//Eventra Schedule//EN');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:eventra-session-sess-123@eventra.live');
    expect(ics).toContain('DTSTART:20260915T143000Z');
    expect(ics).toContain('DTEND:20260915T151500Z');
    expect(ics).toContain('SUMMARY:Keynote: Scaling Large Models');
    expect(ics).toContain('LOCATION:Grand Hall A • AI Main Stage');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('escapes special characters correctly in .ics content', () => {
    const sessionWithCommas = {
      ...sampleSession,
      id: 'sess-special',
      title: 'Workshop: React, Next.js; TypeScript',
      roomLocation: 'Room 1, Floor 2',
    };

    const ics = generateIcsContent('Test Summit', [sessionWithCommas]);
    expect(ics).toContain('SUMMARY:Workshop: React\\, Next.js\\; TypeScript');
    expect(ics).toContain('LOCATION:Room 1\\, Floor 2 • AI Main Stage');
  });

  it('generates valid Google Calendar one-click URLs', () => {
    const url = generateGoogleCalendarUrl(sampleSession);
    expect(url).toContain('https://calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=Keynote%3A+Scaling+Large+Models');
    expect(url).toContain('dates=20260915T143000Z%2F20260915T151500Z');
  });

  it('generates valid Outlook Calendar one-click URLs', () => {
    const url = generateOutlookCalendarUrl(sampleSession);
    expect(url).toContain('https://outlook.live.com/calendar/0/deeplink/compose');
    expect(url).toContain('rru=addevent');
    expect(url).toContain('subject=Keynote%3A+Scaling+Large+Models');
  });
});
