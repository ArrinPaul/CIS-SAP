'use client';

import React, { useState } from 'react';
import { BadgeIcon } from '@/components/shared/badge-icon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Zap, Target, History, Award, Loader2, ListChecks } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/core/utils/utils';
import ChallengesHub from './challenges-hub';

interface GamificationClientProps {
  initialBadges?: any[];
  stats?: any;
  allBadges?: any[];
  pointsHistory?: any[];
}

export function GamificationClient({
  initialBadges = [],
  stats,
  allBadges = [],
  pointsHistory = []
}: GamificationClientProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto px-4 py-8 text-foreground space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black font-headline flex items-center gap-3">
            <Trophy className="text-warning h-8 w-8" /> Gamification Hub
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">Track your progress and earn rewards for your contributions.</p>
        </div>
        <div className="flex gap-4">
          <Card className="bg-card border-border text-foreground min-w-[180px] rounded-2xl shadow-elevated">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Zap className="text-primary" size={24} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Lifetime XP</p>
                <p className="text-2xl font-black">{stats?.xp || user?.xp || user?.points || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <TabsList className="bg-muted p-1 rounded-2xl border-none h-14">
          <TabsTrigger value="overview" className="rounded-xl h-full px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm font-bold gap-2"><Target size={18} /> Overview</TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-xl h-full px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm font-bold gap-2"><ListChecks size={18} /> Challenges</TabsTrigger>
          <TabsTrigger value="badges" className="rounded-xl h-full px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm font-bold gap-2"><Award size={18} /> Badges</TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl h-full px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm font-bold gap-2"><History size={18} /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 mt-0 outline-none">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-card border-border/50 text-foreground lg:col-span-2 rounded-[2rem] shadow-xl overflow-hidden">
              <CardHeader className="bg-primary/[0.02] border-b border-border/50 p-8">
                <CardTitle className="font-headline text-2xl">Stats Summary</CardTitle>
                <CardDescription>Your impact across the Eventra ecosystem</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Level</p>
                      <p className="text-3xl font-black">{stats?.level || user?.level || 1}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Badges</p>
                      <p className="text-3xl font-black">{stats?.badgeCount || initialBadges.length}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Events Attended</p>
                      <p className="text-3xl font-black">{stats?.attended || 0}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Forum Posts</p>
                      <p className="text-3xl font-black">{stats?.posts || 0}</p>
                   </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border/50 text-foreground rounded-[2rem] shadow-xl overflow-hidden">
              <CardHeader className="bg-primary/[0.02] border-b border-border/50 p-8 text-center">
                <CardTitle className="font-headline">Level Progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center p-12">
                <div className="relative w-40 h-40 flex items-center justify-center">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-muted/30" />
                      <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-primary" strokeDasharray="440" strokeDashoffset={440 - (440 * 0.65)} />
                   </svg>
                  <div className="absolute text-center">
                    <p className="text-5xl font-black">{stats?.level || user?.level || 1}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rank</p>
                  </div>
                </div>
                <p className="mt-8 text-sm font-bold text-muted-foreground">Next level at {((stats?.level || user?.level || 1) * 1000)} XP</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="mt-0 outline-none">
          <ChallengesHub />
        </TabsContent>

        <TabsContent value="badges" className="mt-0 outline-none">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {allBadges.map((badge: any) => {
              const isEarned = initialBadges.some((ub: any) => ub.badge.id === badge.id);
              return (
                <Card key={badge.id} className={cn("bg-card border-border/50 text-foreground transition-all duration-300 rounded-[1.5rem] group hover:border-primary/40", !isEarned && "opacity-40 grayscale")}>
                  <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                    <div className="group-hover:scale-110 transition-transform duration-300 text-notion-ink-secondary">
                      <BadgeIcon name={badge.icon} className="w-10 h-10" />
                    </div>
                    <div>
                      <p className="font-black text-lg">{badge.name}</p>
                      <p className="text-xs font-medium text-muted-foreground line-clamp-2 mt-1">{badge.description}</p>
                    </div>
                    {isEarned && <Badge variant="success" className="rounded-lg text-[9px] font-black px-3">EARNED</Badge>}
                  </CardContent>
                </Card>
              );
            })}
            {allBadges.length === 0 && <div className="col-span-full py-20 text-center text-muted-foreground border border-dashed border-border rounded-[2rem]">No badges defined yet.</div>}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-0 outline-none">
          <Card className="bg-card border-border/50 text-foreground rounded-[2rem] shadow-xl overflow-hidden">
            <CardContent className="p-0">
              {pointsHistory.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {pointsHistory.map((entry: any) => (
                    <div key={entry.id} className="p-6 flex items-center justify-between hover:bg-primary/[0.01] transition-colors">
                      <div>
                        <p className="font-bold">{entry.reason}</p>
                        <p className="text-xs font-medium text-muted-foreground mt-1">{new Date(entry.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="text-xl font-black text-primary">+{entry.points} XP</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                    <History className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground font-medium">No points history available yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
