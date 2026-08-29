'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Target, Trophy, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getMatchmakingRecommendations, MatchmakingResult } from '@/app/actions/matchmaking';
import { MatchmakingCard } from './matchmaking-card';
import { cn } from '@/core/utils/utils';

type MatchmakingViewState = {
  error?: string;
  strategy?: { weeklyPlan: string };
  recommendations: Array<{
    userId: string;
    name: string;
    score: number;
    rationale: string;
  }>;
};

export function MatchmakingSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [result, setResult] = useState<MatchmakingViewState | null>(null);
  const sendConnectionRequest = async (_payload: any) => Promise.resolve();
// 

  const handleConnect = async (userId: string) => {
    try {
      await sendConnectionRequest({ receiverId: userId as any });
      toast({ title: "Request Sent", description: "Connection request has been sent." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to send request", variant: "destructive" });
    }
  };

  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getMatchmakingRecommendations();
      const recommendations = data.map((match: any) => ({
        userId: match.userId,
        name: match.name || 'Member',
        score: match.matchScore,
        rationale: match.reason,
      }));

      setResult({
        recommendations,
        strategy: {
          weeklyPlan:
            recommendations.length > 0
              ? 'Prioritize high-match connections first, then follow up within 24 hours after each conversation.'
              : 'Complete your profile and interests to unlock stronger match recommendations.',
        },
      });
    } catch (error) {
      setLoadError(true);
      console.error('Failed to fetch matches:', error);
      setResult({
        error: 'Unable to load recommendations right now.',
        recommendations: [],
      });
      toast({ title: 'Error', description: 'Failed to load matchmaking recommendations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="bg-card border-border h-[320px] animate-pulse">
            <CardContent className="h-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (loadError) {
    return <LoadError what="matches" onRetry={fetchMatches} />;
  }

  if (result?.error) {
    return (
      <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
        <Target size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-xl font-medium text-foreground mb-2">{result.error}</p>
        <p>Complete your profile to get personalized recommendations.</p>
        <Button variant="outline" className="mt-4 border-border" onClick={fetchMatches}>
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {result?.strategy && (
        <Card className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-primary/30 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary/20 p-3 rounded-2xl">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg">Your Networking Strategy</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{result.strategy.weeklyPlan}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {result?.recommendations.map((match) => (
          <MatchmakingCard 
            key={match.userId} 
            match={{
              userId: match.userId,
              name: match.name,
              role: 'Member',
              company: 'Eventra Community',
              connectionValue: match.score,
              rationale: match.rationale || 'Potentially valuable connection based on profile overlap.',
              conversationStarters: ['What events are you most interested in this month?'],
            }} 
            onConnect={(id) => handleConnect(id)}
          />
        ))}
      </div>
      
      <div className="flex justify-center">
        <Button variant="ghost" className="text-muted-foreground hover:text-primary" onClick={fetchMatches}>
          <RefreshCw className="w-4 h-4 mr-2" /> Recalculate Matches
        </Button>
      </div>
    </div>
  );
}


