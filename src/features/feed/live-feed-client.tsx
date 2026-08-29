'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  UserPlus, 
  Ticket, 
  MessageSquare, 
  Award, 
  MapPin,
  Clock,
  ChevronRight,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { getActivityFeed } from '@/app/actions/feed';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/core/utils/utils';

interface Activity {
  activity: any;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export function LiveFeedClient() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchFeed = useCallback(async (isInitial = false) => {
    setLoadError(false);
    if (isInitial) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const data = await getActivityFeed({ limit: 20 });
      setActivities(data as any);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed(true);
    
    // Poll every 10 seconds for "real-time" feel without WebSockets
    const interval = setInterval(() => fetchFeed(), 10000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'registration': return <Ticket size={14} className="text-primary" />;
      case 'event_created': return <Zap size={14} className="text-amber-400" />;
      case 'event_checkin': return <MapPin size={14} className="text-emerald-400" />;
      case 'badge_awarded': return <Award size={14} className="text-purple-400" />;
      case 'community_joined': return <UserPlus size={14} className="text-blue-400" />;
      default: return <MessageSquare size={14} className="text-muted-foreground" />;
    }
  };

  const getActivityLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-card animate-pulse rounded-xl border border-border/50" />
        ))}
      </div>
    );
  }

  if (loadError) {
    return <LoadError what="the feed" onRetry={fetchFeed} />;
  }

  return (
    <div className="space-y-4 relative">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          Live Activity
        </h3>
        {isRefreshing && <Loader2 size={12} className="animate-spin text-primary" />}
      </div>

      <div className="space-y-3">
        {activities.map((item) => (
          <div 
            key={item.activity.id} 
            className="group flex gap-4 p-3 bg-card rounded-xl border border-border/50 hover:border-border transition-all animate-in slide-in-from-top duration-500"
          >
            <div className="relative h-10 w-10 shrink-0 rounded-full bg-gray-800 overflow-hidden border border-border">
              {item.user.image ? (
                <Image src={item.user.image} fill className="object-cover" alt="" />
              ) : (
                <div className="h-full w-full flex items-center justify-center font-bold text-muted-foreground">
                  {(item.user.name || 'U')[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-foreground truncate">{item.user.name || 'Someone'}</span>
                <Badge variant="outline" className="text-[8px] py-0 h-4 bg-card border-border/50 capitalize flex items-center gap-1">
                  {getActivityIcon(item.activity.type)}
                  {getActivityLabel(item.activity.type)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 italic">{item.activity.content || 'performed an action'}</p>
              <div className="flex items-center gap-1 mt-2 text-[9px] text-gray-600 font-bold uppercase">
                <Clock size={10} />
                {formatDistanceToNow(new Date(item.activity.createdAt), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
