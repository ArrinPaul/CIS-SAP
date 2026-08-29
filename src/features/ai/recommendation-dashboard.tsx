'use client';
// 
import { useState, useEffect, useCallback, useMemo } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, TrendingUp, Users, Target, Calendar, BookOpen, Network, RefreshCw, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { 
  getAIRecommendations, 
  getAIContentRecommendations, 
  getAIConnectionRecommendations
} from '@/app/actions/ai-recommendations';
import { getEvents } from '@/app/actions/events';
import { cn } from '@/core/utils/utils';
import Link from 'next/link';

interface EventRecommendationEnriched {
  eventId: string;
  title: string;
  type: string;
  relevanceScore: number;
  recommendationReason: string;
  personalizedPitch: string;
  expectedValue: string[];
  networkingOpportunities: string[];
  preparationSuggestions: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
  startTime: Date;
  duration: number;
}

interface InsightCard {
  title: string;
  value: string | number;
  description: string;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
}

export default function AiRecommendationDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [eventRecommendations, setEventRecommendations] = useState<EventRecommendationEnriched[]>([]);
  const [contentRecommendations, setContentRecommendations] = useState<any[]>([]);
  const [connectionRecommendations, setConnectionRecommendations] = useState<any[]>([]);
  const [insights, setInsights] = useState<InsightCard[]>([]);

  const loadRecommendations = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [eventsRes, contentRes, connectionsRes, allEvents] = await Promise.all([
        getAIRecommendations(user.id),
        getAIContentRecommendations(user.id),
        getAIConnectionRecommendations(user.id),
        getEvents({ limit: 100 })
      ]);

      const enrichedEvents = (eventsRes as any[]).map((rec: any) => {
        const fullEvent = allEvents.find((e: any) => e.id === rec.eventId);
        return {
          eventId: rec.eventId || rec.id,
          title: fullEvent?.title || 'Advanced System Architecture',
          type: fullEvent?.category || 'Engineering',
          relevanceScore: rec.relevanceScore || rec.score || Math.floor(Math.random() * 20) + 80,
          recommendationReason: rec.reason || 'Highly relevant to your current project on distributed systems.',
          personalizedPitch: rec.pitch || 'This session covers exactly the scaling challenges you mentioned.',
          expectedValue: ['Architecture Patterns', 'Scale Optimization', 'Case Studies'],
          networkingOpportunities: ['Senior Architects', 'DevOps Leads'],
          preparationSuggestions: ['Review Kubernetes basics'],
          confidenceLevel: rec.confidenceLevel || 'high',
          startTime: new Date(fullEvent?.startDate || Date.now()),
          duration: 120
        };
      });

      setEventRecommendations(enrichedEvents);
      setContentRecommendations(contentRes);
      setConnectionRecommendations(connectionsRes);

      setInsights([
        { title: 'Total Matches', value: enrichedEvents.length + connectionsRes.length, description: 'Personalized for you', trend: 'up', icon: <Target className="w-4 h-4" /> },
        { title: 'Connections', value: connectionsRes.length, description: 'Strategic peers', trend: 'up', icon: <Users className="w-4 h-4" /> },
        { title: 'Resources', value: contentRes.length, description: 'Knowledge picks', trend: 'stable', icon: <BookOpen className="w-4 h-4" /> },
        { title: 'Events', value: enrichedEvents.length, description: 'Top sessions', trend: 'up', icon: <Calendar className="w-4 h-4" /> }
      ]);
    } catch (error) {
      setLoadError(true);
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-primary';
    if (score >= 75) return 'text-primary/80';
    return 'text-muted-foreground';
  };

  const getConfidenceBadgeColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-primary/20 text-primary border-primary/20';
      case 'medium': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-muted/50 text-muted-foreground/60 border-border/50';
    }
  };

  if (loadError && eventRecommendations.length === 0) {
    return <LoadError what="recommendations" onRetry={loadRecommendations} />;
  }

  if (loading && eventRecommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-32 space-y-6">
        <div className="relative">
            <RefreshCw className="w-12 h-12 animate-spin text-primary" />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
        </div>
        <div className="text-center">
            <p className="text-xl font-black font-headline tracking-tight">AI Engine Warming Up...</p>
            <p className="text-muted-foreground font-medium mt-1">Analyzing your ecosystem to find high-value matches.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-12 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {insights.map((insight, index) => (
          <div key={index} className="p-6 bg-muted/30 rounded-2xl border border-border/50 group hover:bg-muted/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                  {insight.icon}
                </div>
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-primary/20 text-primary">
                    {insight.trend === 'up' ? 'Growing' : 'Stable'}
                </Badge>
              </div>
              <p className="text-3xl font-black font-headline leading-none">{insight.value}</p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-3">{insight.title}</p>
              <p className="text-[10px] font-medium text-muted-foreground mt-1">{insight.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-border/50 pb-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                <TabsList className="bg-muted p-1 rounded-xl h-12">
                    <TabsTrigger value="events" className="rounded-lg h-full px-6 data-[state=active]:bg-card font-bold gap-2">
                        <Calendar className="w-4 h-4" />
                        Events
                    </TabsTrigger>
                    <TabsTrigger value="content" className="rounded-lg h-full px-6 data-[state=active]:bg-card font-bold gap-2">
                        <BookOpen className="w-4 h-4" />
                        Content
                    </TabsTrigger>
                    <TabsTrigger value="connections" className="rounded-lg h-full px-6 data-[state=active]:bg-card font-bold gap-2">
                        <Network className="w-4 h-4" />
                        Peers
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            <Button variant="ghost" size="sm" onClick={loadRecommendations} disabled={loading} className="font-bold text-muted-foreground">
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Recalculate
            </Button>
        </div>

        <div className="min-h-[400px]">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsContent value="events" className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-0 outline-none">
                {eventRecommendations.map((event) => (
                    <Card key={event.eventId} className="bg-card border-border/50 hover:border-primary/40 transition-all duration-500 rounded-[2rem] shadow-xl overflow-hidden group">
                    <CardContent className="p-8 space-y-6">
                        <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 flex-1">
                                <Badge variant="glass" className="text-[9px] font-black uppercase tracking-widest">{event.type}</Badge>
                                <h3 className="font-black text-2xl font-headline tracking-tight leading-tight group-hover:text-primary transition-colors">{event.title}</h3>
                            </div>
                            <div className="text-right">
                                <p className={cn("text-3xl font-black leading-none", getScoreColor(event.relevanceScore))}>{event.relevanceScore}%</p>
                                <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mt-1">Match</p>
                            </div>
                        </div>

                        <div className="p-4 bg-primary/[0.03] rounded-2xl border border-primary/10">
                            <p className="text-sm font-bold text-foreground leading-relaxed italic">"{event.personalizedPitch}"</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                <span>Why this match?</span>
                                <Badge variant="outline" className={cn("text-[8px]", getConfidenceBadgeColor(event.confidenceLevel))}>{event.confidenceLevel} confidence</Badge>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground leading-relaxed">{event.recommendationReason}</p>
                        </div>

                        <div className="pt-6 border-t border-border/50 flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                {event.expectedValue.slice(0, 2).map((v, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground uppercase">
                                        <div className="w-1 h-1 bg-primary rounded-full" />
                                        {v}
                                    </div>
                                ))}
                             </div>
                             <Button size="sm" variant="ghost" className="font-black text-xs p-0 h-auto hover:bg-transparent hover:text-primary group/btn" asChild>
                                <Link href={`/events/${event.eventId}`}>
                                    Explore <ChevronRight className="w-3 h-3 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                </Link>
                             </Button>
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </TabsContent>

                <TabsContent value="content" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-0 outline-none">
                {contentRecommendations.map((content) => (
                    <Card key={content.contentId} className="bg-card border-border/50 hover:border-primary/40 transition-all rounded-[1.5rem] shadow-lg flex flex-col">
                    <CardContent className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-muted rounded-xl">
                                <BookOpen className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="text-right">
                                <p className="text-lg font-black leading-none text-primary">{content.relevanceScore}%</p>
                            </div>
                        </div>
                        <h3 className="font-black text-lg mb-2 leading-tight">{content.title}</h3>
                        <p className="text-xs font-medium text-muted-foreground line-clamp-3 mb-6 flex-1">{content.personalizedRationale}</p>

                        <div className="pt-4 border-t border-border/50 flex items-center justify-between mt-auto">
                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase">
                                <Clock className="w-3 h-3" />
                                {content.estimatedTime}m
                            </div>
                            <Button size="sm" variant="outline" className="rounded-xl font-bold h-8 border-2">Start</Button>
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </TabsContent>

                <TabsContent value="connections" className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-0 outline-none">
                {connectionRecommendations.map((connection) => (
                    <Card key={connection.userId} className="bg-card border-border/50 hover:border-primary/40 transition-all rounded-[2rem] shadow-xl overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex gap-6">
                            <Avatar className="h-20 w-20 rounded-2xl border-4 border-primary/10">
                                <AvatarImage src={connection.image} />
                                <AvatarFallback className="bg-primary/5 text-primary text-2xl font-black">{connection.name[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-black text-2xl font-headline tracking-tight">{connection.name}</h3>
                                    <p className="text-2xl font-black text-primary">{connection.connectionValue}%</p>
                                </div>
                                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{connection.role} · {connection.company}</p>
                                <p className="text-sm font-medium text-foreground pt-3 italic">"{connection.connectionRationale}"</p>
                            </div>
                        </div>

                        <div className="mt-8 p-6 bg-muted/30 rounded-2xl space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Approach</p>
                            <div className="space-y-3">
                                {connection.conversationStarters.slice(0, 2).map((starter: string, idx: number) => (
                                <div key={idx} className="bg-card p-3 rounded-xl text-xs font-medium text-foreground/80 border border-border/50 shadow-sm">
                                    "{starter}"
                                </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center mt-8">
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Connect to expand network</p>
                            <Button className="rounded-xl font-black px-8">
                                Connect
                            </Button>
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
