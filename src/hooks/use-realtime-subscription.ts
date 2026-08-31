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
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const { table, schema, event, filter } = options;

  useEffect(() => {
    if (!enabled || !channelName) return;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel.on(
      'postgres_changes' as any,
      {
        event: event || '*',
        schema: schema || 'public',
        table: table,
        filter: filter,
      },
      (payload: any) => {
        const currentOptions = optionsRef.current;
        if (payload.eventType === 'INSERT' && currentOptions.onInsert) {
          currentOptions.onInsert(payload.new);
        } else if (payload.eventType === 'UPDATE' && currentOptions.onUpdate) {
          currentOptions.onUpdate(payload.new);
        } else if (payload.eventType === 'DELETE' && currentOptions.onDelete) {
          currentOptions.onDelete({ old: payload.old });
        }
        if (currentOptions.onChange) {
          currentOptions.onChange(payload);
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
    table,
    schema,
    event,
    filter,
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
  const optionsRef = useRef(options);
  optionsRef.current = options;

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

  const presenceKey = options.presenceData?.userId || `guest_${Math.random().toString(36).slice(2, 7)}`;

  useEffect(() => {
    if (!enabled || !channelName) return;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });
    channelRef.current = channel;

    // Listen to broadcast messages
    channel.on('broadcast', { event: '*' }, ({ event, payload }: any) => {
      if (optionsRef.current.onMessage) {
        optionsRef.current.onMessage(event, payload);
      }
    });

    // Listen to presence events
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const count = Object.keys(state).length;
      setOnlineCount(Math.max(1, count));
      if (optionsRef.current.onPresenceSync) {
        optionsRef.current.onPresenceSync(state);
      }
    });

    channel.on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
      if (optionsRef.current.onPresenceJoin) {
        optionsRef.current.onPresenceJoin(key, newPresences);
      }
    });

    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
      if (optionsRef.current.onPresenceLeave) {
        optionsRef.current.onPresenceLeave(key, leftPresences);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        if (optionsRef.current.presenceData) {
          await channel.track(optionsRef.current.presenceData);
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
  }, [channelName, enabled, presenceKey]);

  return {
    broadcast,
    onlineCount,
    isConnected,
    channel: channelRef.current,
  };
}
