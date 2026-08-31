import { describe, it, expect, vi } from 'vitest';
import { PostgresChangeOptions, BroadcastOptions } from './use-realtime-subscription';

describe('Realtime Subscription Options', () => {
  it('validates PostgresChangeOptions structure', () => {
    const options: PostgresChangeOptions = {
      table: 'chat_messages',
      schema: 'public',
      event: 'INSERT',
      filter: 'room_id=eq.123',
      onInsert: vi.fn(),
    };

    expect(options.table).toBe('chat_messages');
    expect(options.event).toBe('INSERT');
    expect(options.filter).toBe('room_id=eq.123');
  });

  it('validates BroadcastOptions structure', () => {
    const onMessage = vi.fn();
    const options: BroadcastOptions = {
      onMessage,
      presenceData: { userId: 'u-123', name: 'Test User' },
    };

    expect(options.presenceData?.userId).toBe('u-123');
    expect(typeof options.onMessage).toBe('function');
  });
});
