import { describe, it, expect } from 'vitest';
import {
  formatToIcsUtc,
  getGoogleCalendarUrl,
  getOutlookWebUrl,
  getOffice365Url,
  getYahooCalendarUrl,
  generateSingleEventIcs,
} from './calendar-links';

describe('Calendar Links Generator', () => {
  const mockEvent = {
    id: 'evt-12345',
    title: 'AI Global Summit 2026',
    description: 'A global summit discussing agentic AI and intelligent systems.',
    location: 'Main Auditorium, Campus Hub',
    startDate: new Date('2026-09-15T09:00:00.000Z'),
    endDate: new Date('2026-09-15T17:00:00.000Z'),
    url: 'https://eventra.live/events/evt-12345',
  };

  it('formats dates into RFC 5545 UTC timestamp correctly', () => {
    const formatted = formatToIcsUtc(mockEvent.startDate);
    expect(formatted).toBe('20260915T090000Z');
  });

  it('generates a valid Google Calendar URL with correct parameters', () => {
    const url = getGoogleCalendarUrl(mockEvent);
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('action=TEMPLATE');
    expect(url).toContain('text=AI+Global+Summit+2026');
    expect(url).toContain('dates=20260915T090000Z%2F20260915T170000Z');
    expect(url).toContain('location=Main+Auditorium%2C+Campus+Hub');
    expect(url).toContain('Event+Link');
  });

  it('generates a valid Outlook Web URL', () => {
    const url = getOutlookWebUrl(mockEvent);
    expect(url).toContain('outlook.live.com/calendar/0/deeplink/compose');
    expect(url).toContain('subject=AI+Global+Summit+2026');
    expect(url).toContain('rru=addevent');
    expect(url).toContain('location=Main+Auditorium%2C+Campus+Hub');
  });

  it('generates a valid Office 365 Enterprise URL', () => {
    const url = getOffice365Url(mockEvent);
    expect(url).toContain('outlook.office.com/calendar/0/deeplink/compose');
    expect(url).toContain('subject=AI+Global+Summit+2026');
    expect(url).toContain('rru=addevent');
  });

  it('generates a valid Yahoo Calendar URL', () => {
    const url = getYahooCalendarUrl(mockEvent);
    expect(url).toContain('calendar.yahoo.com');
    expect(url).toContain('title=AI+Global+Summit+2026');
    expect(url).toContain('st=20260915T090000Z');
    expect(url).toContain('et=20260915T170000Z');
  });

  it('generates valid RFC 5545 iCalendar (.ics) content', () => {
    const ics = generateSingleEventIcs(mockEvent);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:eventra-event-evt-12345@eventra.live');
    expect(ics).toContain('DTSTART:20260915T090000Z');
    expect(ics).toContain('DTEND:20260915T170000Z');
    expect(ics).toContain('SUMMARY:AI Global Summit 2026');
    expect(ics).toContain('LOCATION:Main Auditorium\\, Campus Hub');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
