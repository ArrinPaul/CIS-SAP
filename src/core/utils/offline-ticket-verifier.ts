/**
 * Offline Ticket Verifier & Manifest Cache Manager
 * Enables client-side check-in validation against cached rosters when internet connectivity drops.
 */

export interface CachedAttendee {
  ticketNumber: string;
  entryCode?: string | null;
  qrCode?: string | null;
  status: string;
  userName: string | null;
  userImage: string | null;
}

export interface OfflineScanItem {
  payload: string;
  eventId: string;
  timestamp: string;
  ticketNumber: string;
}

export interface OfflineVerificationResult {
  success: boolean;
  message: string;
  ticket?: {
    ticketNumber: string;
    userName: string | null;
    userImage: string | null;
    entryCode?: string | null;
  };
}

/**
 * Extracts ticket identifier (ticketNumber or entryCode) from QR payload or raw input.
 */
export function extractTicketKey(payload: string): { key: string; type: 'ticketNumber' | 'entryCode' | 'unknown' } {
  const trimmed = payload.trim();

  // If payload contains signature separator (e.g. TKT-12345:signature)
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts[0].startsWith('TKT-')) {
      return { key: parts[0], type: 'ticketNumber' };
    }
  }

  // Bare ticket number
  if (trimmed.startsWith('TKT-')) {
    return { key: trimmed, type: 'ticketNumber' };
  }

  // 6-digit manual entry code
  if (/^\d{6}$/.test(trimmed)) {
    return { key: trimmed, type: 'entryCode' };
  }

  return { key: trimmed, type: 'unknown' };
}

/**
 * Verifies a ticket against local cached attendee manifest.
 */
export function verifyTicketOffline(
  payload: string,
  attendeeList: CachedAttendee[]
): OfflineVerificationResult {
  const { key, type } = extractTicketKey(payload);

  if (type === 'unknown' && !key) {
    return {
      success: false,
      message: 'Invalid ticket format. Expected signed QR, TKT-XXX, or 6-digit entry code.',
    };
  }

  const match = attendeeList.find((attendee) => {
    if (type === 'ticketNumber') {
      return attendee.ticketNumber.toLowerCase() === key.toLowerCase();
    }
    if (type === 'entryCode') {
      return attendee.entryCode === key;
    }
    return (
      attendee.ticketNumber.toLowerCase() === key.toLowerCase() ||
      attendee.qrCode === payload ||
      attendee.entryCode === key
    );
  });

  if (!match) {
    return {
      success: false,
      message: 'Ticket not found in local offline roster.',
    };
  }

  if (match.status === 'checked-in') {
    return {
      success: false,
      message: 'Already Checked In (Offline Record)',
      ticket: {
        ticketNumber: match.ticketNumber,
        userName: match.userName,
        userImage: match.userImage,
        entryCode: match.entryCode,
      },
    };
  }

  if (match.status === 'cancelled' || match.status === 'refunded' || match.status === 'expired') {
    return {
      success: false,
      message: `Cannot check in: Ticket is marked as ${match.status}`,
    };
  }

  return {
    success: true,
    message: 'Verified Offline (Cached for background sync)',
    ticket: {
      ticketNumber: match.ticketNumber,
      userName: match.userName,
      userImage: match.userImage,
      entryCode: match.entryCode,
    },
  };
}

/**
 * LocalStorage Helpers for Offline Scans and Cached Rosters
 */
export const OfflineStorage = {
  getQueue(userId?: string): OfflineScanItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const key = userId ? `eventra_offline_queue_${userId}` : 'eventra_offline_queue_default';
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveQueue(queue: OfflineScanItem[], userId?: string) {
    if (typeof window === 'undefined') return;
    try {
      const key = userId ? `eventra_offline_queue_${userId}` : 'eventra_offline_queue_default';
      localStorage.setItem(key, JSON.stringify(queue));
    } catch {}
  },

  enqueue(item: OfflineScanItem, userId?: string) {
    const queue = this.getQueue(userId);
    const updated = [...queue, item];
    this.saveQueue(updated, userId);
    return updated;
  },

  clearQueue(userId?: string) {
    if (typeof window === 'undefined') return;
    try {
      const key = userId ? `eventra_offline_queue_${userId}` : 'eventra_offline_queue_default';
      localStorage.removeItem(key);
    } catch {}
  },

  getCachedAttendees(eventId: string): CachedAttendee[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(`eventra_attendees_${eventId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveCachedAttendees(eventId: string, attendees: CachedAttendee[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`eventra_attendees_${eventId}`, JSON.stringify(attendees));
    } catch {}
  },
};
