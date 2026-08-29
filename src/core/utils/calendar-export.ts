/**
 * Calendar Export & RFC 5545 iCalendar (.ics) Generator
 */

export interface CalendarSessionData {
  id: string;
  title: string;
  description?: string | null;
  track: string;
  startTime: Date | string;
  endTime: Date | string;
  speakerName?: string | null;
  speakerTitle?: string | null;
  roomLocation?: string | null;
  sessionType?: string;
  eventTitle?: string;
  url?: string;
}

/**
 * Format a Date object to RFC 5545 UTC timestamp (YYYYMMDDTHHMMSSZ)
 */
export function formatDateToIcs(dateInput: Date | string): string {
  const d = new Date(dateInput);
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
 * Clean and escape text strings for .ics format
 */
function escapeIcsText(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generate full RFC 5545 iCalendar content for an array of conference sessions
 */
export function generateIcsContent(
  eventTitle: string,
  sessions: CalendarSessionData[]
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eventra Inc//Eventra Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(eventTitle)}`,
  ];

  const nowIcs = formatDateToIcs(new Date());

  sessions.forEach((s) => {
    const startIcs = formatDateToIcs(s.startTime);
    const endIcs = formatDateToIcs(s.endTime);
    const summary = s.title;
    const description = [
      s.description,
      s.speakerName ? `Speaker: ${s.speakerName}${s.speakerTitle ? ` (${s.speakerTitle})` : ''}` : '',
      `Track: ${s.track}`,
    ].filter(Boolean).join('\\n\\n');

    const location = [s.roomLocation, s.track].filter(Boolean).join(' • ');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:eventra-session-${s.id}@eventra.live`);
    lines.push(`DTSTAMP:${nowIcs}`);
    lines.push(`DTSTART:${startIcs}`);
    lines.push(`DTEND:${endIcs}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (description) lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    if (location) lines.push(`LOCATION:${escapeIcsText(location)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generate Google Calendar One-Click Add URL
 */
export function generateGoogleCalendarUrl(session: CalendarSessionData): string {
  const start = formatDateToIcs(session.startTime);
  const end = formatDateToIcs(session.endTime);
  const details = [
    session.description,
    session.speakerName ? `Speaker: ${session.speakerName}` : '',
    `Track: ${session.track}`,
  ].filter(Boolean).join('\n\n');

  const location = [session.roomLocation, session.track].filter(Boolean).join(' • ');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: session.title,
    dates: `${start}/${end}`,
    details,
    location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar One-Click Add URL
 */
export function generateOutlookCalendarUrl(session: CalendarSessionData): string {
  const start = new Date(session.startTime).toISOString();
  const end = new Date(session.endTime).toISOString();
  const body = [
    session.description,
    session.speakerName ? `Speaker: ${session.speakerName}` : '',
    `Track: ${session.track}`,
  ].filter(Boolean).join('\n\n');

  const location = [session.roomLocation, session.track].filter(Boolean).join(' • ');

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: session.title,
    startdt: start,
    enddt: end,
    body,
    location,
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Download generated .ics file in browser
 */
export function downloadIcsFile(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `${filename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
