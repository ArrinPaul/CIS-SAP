'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface PostgresChangeOptions<T = any> {
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: T) => void;
  onUpdate?: (payload: T) => void;
  onDelete?: (payload: { old: T }) => void;
  onChange?: (payload: any) => void;
}

/**
 * Hook for subscribing to PostgreSQL Database changes in real time.
 */
export function useRealtimeTable<T = any>(
  channelName: string,
  options: PostgresChangeOptions<T>,
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !channelName) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel.on(
      'postgres_changes' as any,
      {
        event: options.event || '*',
        schema: options.schema || 'public',
        table: options.table,
        filter: options.filter,
      },
      (payload: any) => {
        if (payload.eventType === 'INSERT' && options.onInsert) {
          options.onInsert(payload.new);
        } else if (payload.eventType === 'UPDATE' && options.onUpdate) {
          options.onUpdate(payload.new);
        } else if (payload.eventType === 'DELETE' && options.onDelete) {
          options.onDelete({ old: payload.old });
        }
        if (options.onChange) {
          options.onChange(payload);
        }
      }
    );

    channel.subscribe((status) => {
      if (process.env.NODE_ENV === 'development') {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to ${channelName}`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn(`[Realtime] Channel ${channelName} status:`, status);
        }
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [
    channelName,
    options.table,
    options.schema,
    options.event,
    options.filter,
    enabled,
  ]);

  return { channel: channelRef.current };
}

export interface BroadcastOptions {
  onMessage?: (event: string, payload: any) => void;
  onPresenceSync?: (presenceState: Record<string, any>) => void;
  onPresenceJoin?: (key: string, newPresences: any[]) => void;
  onPresenceLeave?: (key: string, leftPresences: any[]) => void;
  presenceData?: Record<string, any>;
}

/**
 * Hook for ephemeral Realtime Broadcast & Presence (Stage, Reactions, Live Counters)
 */
export function useRealtimeBroadcast(
  channelName: string,
  options: BroadcastOptions = {},
  enabled: boolean = true
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const broadcast = useCallback(
    async (event: string, payload: any) => {
      if (!channelRef.current) return;
      try {
        await channelRef.current.send({
          type: 'broadcast',
          event,
          payload,
        });
      } catch (err) {
        console.warn(`[Realtime] Failed to broadcast ${event}:`, err);
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled || !channelName) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: options.presenceData?.userId || `guest_${Math.random().toString(36).slice(2, 7)}`,
        },
      },
    });
    channelRef.current = channel;

    // Listen to broadcast messages
    channel.on('broadcast', { event: '*' }, ({ event, payload }: any) => {
      if (options.onMessage) {
        options.onMessage(event, payload);
      }
    });

    // Listen to presence events
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setOnlineCount(Math.max(1, count));
      if (options.onPresenceSync) {
        options.onPresenceSync(state);
      }
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
      if (options.onPresenceJoin) {
        options.onPresenceJoin(key, newPresences);
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
      if (options.onPresenceLeave) {
        options.onPresenceLeave(key, leftPresences);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        if (options.presenceData) {
          await channel.track(options.presenceData);
        }
      } else {
        setIsConnected(false);
      }
    });

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [channelName, enabled]);

  return {
    broadcast,
    onlineCount,
    isConnected,
    channel: channelRef.current,
  };
}
