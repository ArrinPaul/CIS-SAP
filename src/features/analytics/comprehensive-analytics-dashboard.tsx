'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  TrendingUp, 
  Sparkles,
  CheckCircle,
  Clock,
  Star,
  Ticket,
  Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { AIInsightsWidget } from './ai-insights-widget';
import { getPlatformAnalytics, PlatformAnalytics } from '@/app/actions/analytics';

export default function AnalyticsDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [data, setData] = useState<PlatformAnalytics | null>(null);

  // Hoisted out of the effect so the error state can offer a retry.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await getPlatformAnalytics();
      setData(res);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loadError) {
    return <LoadError what="analytics" onRetry={load} />;
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20 text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { stats, detailed } = data;

  const popularityData = Object.entries(detailed.eventsByCategory || {})
    .map(([cat, count]) => `${cat}: ${count} events`)
    .join(', ');

  const statCards = [
    { label: 'Total Events', value: stats.activeEvents + stats.completedEvents, icon: Calendar, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Events', value: stats.activeEvents, icon: Sparkles, color: 'text-success', bg: 'bg-green-500/10' },
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { label: 'Registrations', value: stats.totalRegistrations, icon: Ticket, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const categoryEntries = Object.entries(detailed.eventsByCategory || {}).sort(([,a], [,b]) => (b as number) - (a as number));
  const statusEntries = Object.entries(detailed.eventsByStatus || {});
  const maxCategoryCount = categoryEntries.length > 0 ? Math.max(...categoryEntries.map(([, v]) => v as number)) : 1;

  return (
    <div className="space-y-6 text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Real-time platform performance metrics</p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="bg-card border-border text-foreground">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.label} className="bg-card border-border text-foreground">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <AIInsightsWidget 
            sessionPopularityData={popularityData} 
            title="Platform AI Insights"
            className="mb-6"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recent Activity (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New Registrations</span>
                  <span className="font-bold text-primary">{detailed.engagement.registrations}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming Events</span>
                  <span className="font-bold text-success">{stats.upcomingEvents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completed Events</span>
                  <span className="font-bold text-purple-400">{stats.completedEvents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Rating</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400" />
                    {stats.averageRating || 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Events by Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events yet</p>
                ) : statusEntries.map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {status === 'published' && <CheckCircle className="h-3.5 w-3.5 text-success" />}
                      {status === 'draft' && <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
                      {status === 'completed' && <Star className="h-3.5 w-3.5 text-purple-400" />}
                      {status === 'cancelled' && <Calendar className="h-3.5 w-3.5 text-destructive" />}
                      <span className="text-sm text-foreground/80 capitalize">{status}</span>
                    </div>
                    <Badge variant="secondary" className="bg-muted">{count as number}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6 mt-4">
          <Card className="bg-card border-border text-foreground">
            <CardHeader>
              <CardTitle className="text-base">Events by Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {categoryEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categorized events yet</p>
              ) : categoryEntries.map(([category, count]) => (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/80">{category}</span>
                    <span className="text-muted-foreground">{count as number}</span>
                  </div>
                  <Progress value={((count as number) / maxCategoryCount) * 100} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


