'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Star, Shield, Zap, Loader2 } from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { getUserBadges } from '@/app/actions/gamification';

const rarityColors: Record<string, string> = {
  common: 'bg-gray-500/20 text-foreground/80 border-gray-500/30',
  uncommon: 'bg-success/20 text-success border-green-500/30',
  rare: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  epic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  legendary: 'bg-warning/20 text-warning border-yellow-500/30',
};

const rarityIcons: Record<string, React.ReactNode> = {
  common: <Shield className="h-4 w-4" />,
  uncommon: <Star className="h-4 w-4" />,
  rare: <Award className="h-4 w-4" />,
  epic: <Zap className="h-4 w-4" />,
  legendary: <Trophy className="h-4 w-4" />,
};

export function BadgeShowcase({ userId, compact }: { userId: string; compact?: boolean }) {
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Hoisted out of the effect so the error state can offer a retry.
  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getUserBadges(userId);
      setBadges(data);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }

  if (loadError) {
    return <LoadError what="badges" onRetry={load} />;
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {badges.length === 0 && <p className="text-sm text-muted-foreground italic">No badges earned yet.</p>}
        {badges.map((b: any) => (
          <div key={b.badge.id} className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium', rarityColors[b.badge.category] || rarityColors.common)} title={b.badge.description}>
            {rarityIcons[b.badge.category] || rarityIcons.common}
            {b.badge.name}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className="bg-card border-border text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-warning" />
          Badge Collection
          {badges.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-muted text-foreground/80">{badges.length} earned</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {badges.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-bold text-muted-foreground">NO BADGES UNLOCKED</p>
            <p className="text-sm mt-1">Attend events and participate to earn achievements!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {badges.map((b: any) => (
              <div key={b.badge.id} className={cn('flex items-start gap-4 p-4 rounded-2xl border transition-all hover:scale-[1.02]', rarityColors[b.badge.category] || rarityColors.common)}>
                <div className="text-3xl shrink-0 drop-shadow-lg">{b.badge.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-sm uppercase tracking-tight truncate">{b.badge.name}</p>
                    <Badge variant="outline" className={cn('text-[8px] px-1.5 py-0 border-0 shrink-0 uppercase font-black', rarityColors[b.badge.category] || rarityColors.common)}>
                      {b.badge.category}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{b.badge.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span className="flex items-center gap-1 text-primary"><Zap size={10} /> {b.badge.xpReward || 50} XP</span>
                    <span>&middot;</span>
                    <span>{new Date(b.awardedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
