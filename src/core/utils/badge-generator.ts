/**
 * Physical Badge & Name Tag Layout Utilities
 */

export type BadgeSize = 'standard-3x4' | 'large-4x6' | 'horizontal-credit';

export interface BadgeAttendeeData {
  id: string;
  name: string;
  email?: string;
  role: 'attendee' | 'speaker' | 'vip' | 'organizer' | 'sponsor' | 'volunteer';
  companyOrCollege?: string;
  designationOrDegree?: string;
  ticketNumber: string;
  entryCode?: string;
  qrPayload: string;
  eventTitle: string;
  eventDate: string;
  venueName?: string;
}

export const roleBadgeColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  vip: {
    bg: '#fbbf24', // Amber/Gold
    text: '#78350f',
    border: '#d97706',
    label: 'VIP PASS',
  },
  speaker: {
    bg: '#818cf8', // Indigo
    text: '#1e1b4b',
    border: '#4f46e5',
    label: 'SPEAKER',
  },
  organizer: {
    bg: '#f43f5e', // Rose
    text: '#881337',
    border: '#e11d48',
    label: 'ORGANIZER',
  },
  sponsor: {
    bg: '#34d399', // Emerald
    text: '#064e3b',
    border: '#059669',
    label: 'SPONSOR',
  },
  volunteer: {
    bg: '#38bdf8', // Sky
    text: '#0c4a6e',
    border: '#0284c7',
    label: 'STAFF / VOLUNTEER',
  },
  attendee: {
    bg: '#e2e8f0', // Slate/Neutral
    text: '#0f172a',
    border: '#94a3b8',
    label: 'ALL ACCESS ATTENDEE',
  },
};

/**
 * Calculates page sheet grid layout for batch badge printing (e.g. 6 per A4 sheet)
 */
export function calculateSheetGrid(totalCount: number, badgesPerPage: number = 6): {
  totalPages: number;
  pages: number[][];
} {
  if (totalCount <= 0) return { totalPages: 0, pages: [] };

  const totalPages = Math.ceil(totalCount / badgesPerPage);
  const pages: number[][] = [];

  for (let p = 0; p < totalPages; p++) {
    const pageIndices: number[] = [];
    const start = p * badgesPerPage;
    const end = Math.min(start + badgesPerPage, totalCount);
    for (let i = start; i < end; i++) {
      pageIndices.push(i);
    }
    pages.push(pageIndices);
  }

  return { totalPages, pages };
}

/**
 * Formats full attendee subtitle (e.g. "Lead Engineer • Acme Corp")
 */
export function formatAttendeeSubtitle(designation?: string, company?: string): string {
  const parts = [designation?.trim(), company?.trim()].filter(Boolean);
  return parts.join(' • ') || 'Attendee';
}
