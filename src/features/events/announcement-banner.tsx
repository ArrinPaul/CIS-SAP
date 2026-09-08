'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Bell, Info, X } from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { getActiveAnnouncements } from '@/app/actions/announcements';

export function AnnouncementBanner({ eventId }: { eventId: string }) {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getActiveAnnouncements(eventId);
        if (!cancelled) setAnnouncements(data);
      } catch (error) {
        // A poll can fail for reasons that are not the user's problem: leaving
        // the page with a request in flight, a dropped connection, a dev-server
        // reload. Keep whatever is already on screen and retry on the next
        // tick, rather than letting it surface as an unhandled rejection.
        console.warn('Failed to load announcements:', error);
      }
    }

    load();
    // In a real production app, we would use a subscription (Pusher/Supabase) here.
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [eventId]);

  if (!announcements || announcements.length === 0) return null;

  return (
    <div className="space-y-3 mb-8">
      <AnimatePresence>
        {announcements.map((a: any) => (
          <motion.div
            key={a.id}
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            className={cn(
              "relative p-5 rounded-[1.5rem] border-2 flex items-start gap-4 overflow-hidden shadow-lg",
              a.type === 'info' && "bg-primary/5 border-primary/20 text-foreground",
              a.type === 'warning' && "bg-amber-500/10 border-amber-500/20 text-amber-200",
              a.type === 'urgent' && "bg-destructive/10 border-red-500/20 text-red-200 animate-pulse"
            )}
          >
            <div className={cn(
                "shrink-0 p-2 rounded-xl",
                a.type === 'info' && "bg-primary/10 text-primary",
                a.type === 'warning' && "bg-amber-500/20 text-amber-500",
                a.type === 'urgent' && "bg-destructive/20 text-destructive"
            )}>
              {a.type === 'info' && <Info className="h-5 w-5" />}
              {a.type === 'warning' && <AlertCircle className="h-5 w-5" />}
              {a.type === 'urgent' && <Bell className="h-5 w-5" />}
            </div>
            <div className="flex-1 pt-1">
              <p className="text-sm font-bold leading-relaxed">{a.content}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">Official Announcement</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
