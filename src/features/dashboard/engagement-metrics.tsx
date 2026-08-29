'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  MessageSquare, 
  Award, 
  Star,
  Activity,
  Zap,
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
    { label: 'Events Attended', value: displayStats.attended, icon: Users, color: 'text-notion-accent-purple', bg: 'bg-notion-accent-purple/10' },
    { label: 'Community Posts', value: displayStats.posts, icon: MessageSquare, color: 'text-notion-accent-teal', bg: 'bg-notion-accent-teal/10' },
    { label: 'Earned XP', value: displayStats.xp, icon: Zap, color: 'text-notion-accent-orange', bg: 'bg-notion-accent-orange/10' },
    { label: 'Badges Earned', value: displayStats.badgeCount, icon: Award, color: 'text-notion-accent-pink', bg: 'bg-notion-accent-pink/10' },
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
                   <div className="p-1.5 rounded-lg bg-notion-accent-sky/10 text-notion-accent-sky">
                     <TrendingUp className="w-4 h-4" />
                   </div>
                   <CardTitle className="text-xl font-bold tracking-tight">Engagement Profile</CardTitle>
                </div>
                <CardDescription className="text-sm font-medium text-notion-ink-muted">Real-time analysis of your network activity.</CardDescription>
             </div>
             <Badge variant="outline" className="bg-notion-canvas border-notion-hairline text-notion-ink-faint text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md">Validated</Badge>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-10 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
             <div className="flex items-baseline gap-4">
                <span className="text-6xl font-display font-black tracking-tighter text-notion-primary">{score}</span>
                <div className="space-y-1">
                   <p className="text-xs font-black uppercase tracking-widest text-notion-ink">{getRank(displayStats.level)}</p>
                   <Badge className="bg-notion-accent-green/10 text-notion-accent-green border-none text-[10px] font-bold px-2 py-0">Top {100 - percentile}% Network</Badge>
                </div>
             </div>
             
             <div className="flex-1 max-w-md space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-notion-ink-faint">
                  <span>Sync Progression</span>
                  <span className="text-notion-ink">XP: {displayStats.xp} / {Math.pow(displayStats.level, 2) * 100}</span>
                </div>
                <div className="h-2.5 w-full bg-notion-canvas-soft rounded-full overflow-hidden border border-notion-hairline shadow-inner">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (displayStats.xp / (Math.pow(displayStats.level, 2) * 100)) * 100)}%` }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className="h-full bg-gradient-to-r from-notion-primary to-notion-accent-sky shadow-sm" 
                   />
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {metrics.map((stat, i) => (
              <div key={i} className="p-4 rounded-2xl bg-notion-canvas-soft/50 border border-notion-hairline flex flex-col gap-4 hover:bg-notion-surface dark:hover:bg-zinc-900 transition-colors cursor-default group/stat">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover/stat:scale-110 shadow-sm", stat.bg)}>
                  <stat.icon size={18} className={stat.color} /> 
                </div>
                <div className="space-y-1">
                   <p className="text-xl font-display font-bold text-notion-ink leading-none">{stat.value}</p>
                   <span className="text-[9px] font-black uppercase tracking-widest text-notion-ink-faint leading-none">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
