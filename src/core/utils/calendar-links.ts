/**
 * Calendar Direct Links & iCalendar Generator
 * Supports Google Calendar, Outlook Web, Office 365, Yahoo Calendar, and Apple/ICS files.
 */

export interface CalendarEventData {
  id?: string;
  title?: string | null;
  description?: string | null;
  location?: string | null;
  startDate?: Date | string | number | null;
  endDate?: Date | string | number | null;
  url?: string | null;
}

/**
 * Formats date into RFC 5545 UTC timestamp format (YYYYMMDDTHHmmssZ)
 */
export function formatToIcsUtc(dateInput?: Date | string | number | null): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Escapes special characters for standard .ics format
 */
function escapeIcsText(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Generates direct Google Calendar URL
 */
export function getGoogleCalendarUrl(event: CalendarEventData): string {
  const start = formatToIcsUtc(event.startDate);
  const end = formatToIcsUtc(event.endDate || event.startDate);
  
  const details = [
    event.description || '',
    event.url ? `Event Link: ${event.url}` : ''
  ].filter(Boolean).join('\n\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Event',
    dates: `${start}/${end}`,
    details,
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates direct Outlook Web (Live/Hotmail) Add Event URL
 */
export function getOutlookWebUrl(event: CalendarEventData): string {
  const start = event.startDate ? new Date(event.startDate).toISOString() : new Date().toISOString();
  const end = event.endDate ? new Date(event.endDate).toISOString() : start;

  const body = [
    event.description || '',
    event.url ? `Event Link: ${event.url}` : ''
  ].filter(Boolean).join('\n\n');

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title || 'Event',
    startdt: start,
    enddt: end,
    body,
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates direct Office 365 (Enterprise) Add Event URL
 */
export function getOffice365Url(event: CalendarEventData): string {
  const start = event.startDate ? new Date(event.startDate).toISOString() : new Date().toISOString();
  const end = event.endDate ? new Date(event.endDate).toISOString() : start;

  const body = [
    event.description || '',
    event.url ? `Event Link: ${event.url}` : ''
  ].filter(Boolean).join('\n\n');

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title || 'Event',
    startdt: start,
    enddt: end,
    body,
    location: event.location || '',
  });

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generates direct Yahoo Calendar Add Event URL
 */
export function getYahooCalendarUrl(event: CalendarEventData): string {
  const start = formatToIcsUtc(event.startDate);
  const end = formatToIcsUtc(event.endDate || event.startDate);

  const desc = [
    event.description || '',
    event.url ? `Event Link: ${event.url}` : ''
  ].filter(Boolean).join('\n\n');

  const params = new URLSearchParams({
    v: '60',
    view: 'd',
    type: '20',
    title: event.title || 'Event',
    st: start,
    et: end,
    desc,
    in_loc: event.location || '',
  });

  return `https://calendar.yahoo.com/?${params.toString()}`;
}

/**
 * Generates single-event standard RFC 5545 .ics file content
 */
export function generateSingleEventIcs(event: CalendarEventData): string {
  const now = formatToIcsUtc(new Date());
  const start = formatToIcsUtc(event.startDate);
  const end = formatToIcsUtc(event.endDate || event.startDate);
  const uid = event.id ? `eventra-event-${event.id}@eventra.live` : `eventra-${Date.now()}@eventra.live`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eventra Inc//Eventra Platform//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title || 'Event')}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : '',
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : '',
    event.url ? `URL:${escapeIcsText(event.url)}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/**
 * Triggers browser download for an .ics file
 */
export function triggerIcsDownload(filename: string, icsContent: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
