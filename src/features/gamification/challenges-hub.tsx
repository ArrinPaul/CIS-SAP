'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock, Trophy, Target, Star, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/core/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { joinChallenge } from '@/app/actions/challenges';

export default function ChallengesHub({ challenges, userChallenges }: any) {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState<string | null>(null);
  const [activeParticipations, setActiveParticipations] = React.useState(userChallenges || []);

  const userChallengeIds = new Set(activeParticipations.map((uc: any) => uc.challengeId));

  const handleJoinChallenge = async (challengeId: string) => {
    setLoading(challengeId);
    try {
      const result = await joinChallenge(challengeId);
      if (result.success) {
        setActiveParticipations((prev: any) => [...prev, result.participation]);
        toast({ title: 'Challenge Joined!', description: 'Good luck!' });
      }
    } catch (e: any) {
      toast({ title: 'Failed to join', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'engagement': return <Target className="text-primary" />;
      case 'networking': return <Zap className="text-amber-400" />;
      case 'learning': return <Trophy className="text-purple-400" />;
      default: return <Star className="text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-foreground tracking-tight">Active Challenges</h2>
          <p className="text-muted-foreground text-sm mt-1">Complete tasks to earn bonus XP and limited-edition badges.</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-cyan-500/20 px-4 py-1">
          {challenges.length} Available
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {challenges.map((challenge: any) => {
            const isJoined = userChallengeIds.has(challenge.id);
            const userParticipation = activeParticipations.find(
              (uc: any) => uc.challengeId === challenge.id
            );
            
            return (
              <Card key={challenge.id} className={cn(
                "group relative bg-card/60 border-border hover:border-primary/50 transition-all overflow-hidden",
                isJoined && "ring-1 ring-cyan-500/30"
              )}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 space-y-1 text-foreground">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{challenge.title}</h3>
                        {isJoined && <Badge className="bg-cyan-500 text-black text-[10px]">Active</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{challenge.description}</p>
                    </div>
                    <div className="bg-card p-3 rounded-2xl group-hover:scale-110 transition-transform">
                      {getCategoryIcon(challenge.category)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-card p-3 rounded-xl border border-border/50 text-center">
                      <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
                        <Zap size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Reward</span>
                      </div>
                      <p className="text-lg font-black text-foreground">{challenge.rewardPoints} XP</p>
                    </div>
                    <div className="bg-card p-3 rounded-xl border border-border/50 text-center text-foreground">
                      <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
                        <Clock size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Ends In</span>
                      </div>
                      <p className="text-lg font-black">{formatDistanceToNow(new Date(challenge.endDate))}</p>
                    </div>
                  </div>

                  {isJoined && userParticipation && (
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-muted-foreground uppercase tracking-tighter">Progress</span>
                        <span className="text-primary">{userParticipation.progress}/{challenge.targetValue}</span>
                      </div>
                      <Progress value={(userParticipation.progress / challenge.targetValue) * 100} className="h-2 bg-card" />
                    </div>
                  )}

                  {!isJoined ? (
                    <Button 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                      onClick={() => handleJoinChallenge(challenge.id)}
                      disabled={loading === challenge.id}
                    >
                      {loading === challenge.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Join Challenge'}
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      className="w-full border-border text-muted-foreground cursor-default"
                      disabled
                    >
                      Joined
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
        })}
      </div>
    </div>
  );
}
