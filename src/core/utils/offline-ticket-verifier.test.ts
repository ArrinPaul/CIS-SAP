import { describe, it, expect } from 'vitest';
import {
  extractTicketKey,
  verifyTicketOffline,
  CachedAttendee,
} from './offline-ticket-verifier';

describe('Offline Ticket Verifier', () => {
  const mockAttendees: CachedAttendee[] = [
    {
      ticketNumber: 'TKT-ALPHA-1234',
      entryCode: '482910',
      qrCode: 'TKT-ALPHA-1234:8f9a2b',
      status: 'confirmed',
      userName: 'Jane Doe',
      userImage: null,
    },
    {
      ticketNumber: 'TKT-BETA-5678',
      entryCode: '112233',
      qrCode: 'TKT-BETA-5678:99aacc',
      status: 'checked-in',
      userName: 'John Smith',
      userImage: null,
    },
    {
      ticketNumber: 'TKT-GAMMA-9999',
      entryCode: '998877',
      qrCode: null,
      status: 'cancelled',
      userName: 'Cancelled User',
      userImage: null,
    },
  ];

  it('correctly extracts key from signed QR payload', () => {
    const res = extractTicketKey('TKT-ALPHA-1234:signature123');
    expect(res.key).toBe('TKT-ALPHA-1234');
    expect(res.type).toBe('ticketNumber');
  });

  it('correctly extracts key from bare ticket number', () => {
    const res = extractTicketKey('TKT-ALPHA-1234');
    expect(res.key).toBe('TKT-ALPHA-1234');
    expect(res.type).toBe('ticketNumber');
  });

  it('correctly extracts key from 6-digit entry code', () => {
    const res = extractTicketKey('482910');
    expect(res.key).toBe('482910');
    expect(res.type).toBe('entryCode');
  });

  it('successfully verifies a valid confirmed ticket via signed QR code', () => {
    const result = verifyTicketOffline('TKT-ALPHA-1234:signature123', mockAttendees);
    expect(result.success).toBe(true);
    expect(result.ticket?.userName).toBe('Jane Doe');
    expect(result.ticket?.ticketNumber).toBe('TKT-ALPHA-1234');
  });

  it('successfully verifies a valid confirmed ticket via 6-digit entry code', () => {
    const result = verifyTicketOffline('482910', mockAttendees);
    expect(result.success).toBe(true);
    expect(result.ticket?.userName).toBe('Jane Doe');
  });

  it('rejects an already checked-in ticket offline', () => {
    const result = verifyTicketOffline('TKT-BETA-5678', mockAttendees);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Already Checked In');
  });

  it('rejects a cancelled ticket offline', () => {
    const result = verifyTicketOffline('TKT-GAMMA-9999', mockAttendees);
    expect(result.success).toBe(false);
    expect(result.message).toContain('cancelled');
  });

  it('rejects an unlisted ticket', () => {
    const result = verifyTicketOffline('TKT-UNKNOWN-0000', mockAttendees);
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });
});
