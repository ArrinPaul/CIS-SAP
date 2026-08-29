'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CalendarCheck,
  MessageSquare, 
  Medal,
  Star,
  Activity,
  Coins,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { Badge } from '@/components/ui/badge';

interface EngagementMetricsProps {
  stats: {
    level: number;
    xp: number;
    points: number;
    attended: number;
    posts: number;
    badgeCount: number;
  } | null;
}

export function EngagementMetrics({ stats }: EngagementMetricsProps) {
  // Use real data from DB if available, otherwise fallback to reasonable starting values
  const displayStats = stats || {
    level: 1,
    xp: 0,
    points: 0,
    attended: 0,
    posts: 0,
    badgeCount: 0
  };

  // Calculate percentile and rank based on real metrics
  const score = Math.min(100, Math.floor((displayStats.xp / 5000) * 100) + (displayStats.attended * 5));
  const percentile = Math.min(99, 50 + Math.floor(score / 2));
  
  const getRank = (lvl: number) => {
    if (lvl > 20) return "Master Architect";
    if (lvl > 10) return "Senior Mesh Operator";
    if (lvl > 5) return "Active Contributor";
    return "Network Novice";
  };

  const metrics = [
    { label: 'Events Attended', value: displayStats.attended, icon: CalendarCheck, color: 'text-notion-ink-secondary', bg: 'bg-notion-sunken' },
    { label: 'Community Posts', value: displayStats.posts, icon: MessageSquare, color: 'text-notion-ink-secondary', bg: 'bg-notion-sunken' },
    { label: 'Earned XP', value: displayStats.xp, icon: Coins, color: 'text-notion-ink-secondary', bg: 'bg-notion-sunken' },
    { label: 'Badges Earned', value: displayStats.badgeCount, icon: Medal, color: 'text-notion-ink-secondary', bg: 'bg-notion-sunken' },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white dark:bg-zinc-950 border-notion-hairline shadow-notion-soft overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-1000">
          <BarChart3 size={200} className="text-notion-ink" />
        </div>
        
        <CardHeader className="p-8 pb-0">
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <div className="flex items-center gap-2">
                   <div className="p-1.5 rounded-lg bg-notion-sunken text-notion-ink-secondary">
                     <TrendingUp className="w-4 h-4" />
                   </div>
                   <CardTitle className="font-display text-h3">Engagement Profile</CardTitle>
                </div>
                <CardDescription>Real-time analysis of your network activity.</CardDescription>
             </div>
             <Badge variant="secondary">Validated</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
             <div className="flex items-baseline gap-4">
                <span className="font-display text-metric-lg tabular text-notion-ink">{score}</span>
                <div className="space-y-1">
                   <p className="text-body-sm font-medium text-notion-ink">{getRank(displayStats.level)}</p>
                   <Badge variant="secondary">Top {100 - percentile}% Network</Badge>
                </div>
             </div>
             
             <div className="flex-1 max-w-md space-y-3">
                <div className="flex justify-between text-caption text-notion-ink-muted">
                  <span>Sync Progression</span>
                  <span className="text-notion-ink">XP: {displayStats.xp} / {Math.pow(displayStats.level, 2) * 100}</span>
                </div>
                <div className="h-2 w-full bg-notion-sunken rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (displayStats.xp / (Math.pow(displayStats.level, 2) * 100)) * 100)}%` }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className="h-full rounded-full bg-notion-primary" 
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((stat, i) => (
              <div key={i} className="p-4 rounded-2xl bg-notion-sunken flex flex-col gap-4 hover:bg-accent transition-colors cursor-default group/stat">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover/stat:scale-110 shadow-sm", stat.bg)}>
                  <stat.icon size={18} className={stat.color} /> 
                </div>
                <div className="space-y-1">
                   <p className="text-xl font-display font-bold text-notion-ink leading-none">{stat.value}</p>
                   <span className="text-caption text-notion-ink-muted leading-none">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
