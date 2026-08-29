'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Calendar,
  Activity,
  RefreshCw,
  Ticket,
  TrendingUp,
  PieChart as PieChartIcon
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { getPlatformAnalytics, PlatformAnalytics } from '@/app/actions/analytics';

export default function AdminAnalyticsOverview() {
  const [activeTab, setActiveTab] = useState('overview');
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
    return <LoadError what="platform analytics" onRetry={load} />;
  }

  if (loading || !data) {
    return <div className="p-20 text-center text-muted-foreground"><RefreshCw className="animate-spin h-8 w-8 mx-auto mb-4" /> Loading platform analytics...</div>;
  }

  const { stats, detailed } = data;
  const COLORS = ['#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

  const engagementData = [
    { name: 'Registrations', value: detailed.engagement.registrations, color: '#06b6d4' },
    { name: 'Messages', value: detailed.engagement.messages, color: '#8b5cf6' },
    { name: 'Badges', value: detailed.engagement.badgesEarned, color: '#ec4899' },
  ];

  return (
    <div className="space-y-6 text-foreground pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Insights</h2>
          <p className="text-muted-foreground">Comprehensive overview of platform growth and user engagement</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Active Events', value: stats.activeEvents, icon: Calendar, color: 'text-success' },
          { label: 'Registrations', value: stats.totalRegistrations, icon: Ticket, color: 'text-amber-400' },
          { label: 'Growth', value: `${(stats as any).userTrend || 0}%`, icon: TrendingUp, color: (stats as any).userTrend >= 0 ? 'text-primary' : 'text-destructive' },
        ].map((s, i) => (
          <Card key={i} className="bg-card border-border text-foreground overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border-border text-foreground p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary">Growth Overview</TabsTrigger>
          <TabsTrigger value="engagement" className="data-[state=active]:bg-primary">User Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-lg">User Acquisition</CardTitle>
                <CardDescription className="text-muted-foreground">New user signups over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detailed.growthData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                        itemStyle={{ color: '#06b6d4' }}
                      />
                      <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={3} dot={{ r: 4, fill: '#06b6d4' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-lg">User Distribution</CardTitle>
                <CardDescription className="text-muted-foreground">By persona</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={Object.entries(detailed.usersByRole).map(([name, value]) => ({ name, value }))}
                        cx="50%" cy="50%"
                        innerRadius={60} outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {Object.entries(detailed.usersByRole).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {Object.entries(detailed.usersByRole).map(([role, count], i) => (
                    <div key={role} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="capitalize text-muted-foreground">{role}</span>
                      </div>
                      <span className="font-bold">{count as number}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-4 h-4 text-purple-400" /> Activity Volume</CardTitle>
                <CardDescription className="text-muted-foreground">Total interactions on platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="name" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {engagementData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2"><PieChartIcon className="w-4 h-4 text-amber-400" /> Event Status</CardTitle>
                <CardDescription className="text-muted-foreground">Current event lifecycle distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-6">
                <div className="grid grid-cols-2 gap-8">
                  {Object.entries(detailed.eventsByStatus).map(([status, count], i) => (
                    <div key={status} className="text-center">
                      <div className={`text-2xl font-bold ${status === 'published' ? 'text-success' : 'text-muted-foreground'}`}>{count as number}</div>
                      <div className="text-[10px] uppercase font-black tracking-widest text-gray-600">{status}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {detailed.engagementTrends && detailed.engagementTrends.length > 0 && (
            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-lg">30-Day Engagement Trend</CardTitle>
                <CardDescription className="text-muted-foreground">Registrations, messages, and reviews over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={detailed.engagementTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="date" stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#4b5563" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="registrations" stroke="#06b6d4" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="messages" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="reviews" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {detailed.demographics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-card border-border text-foreground">
                <CardHeader>
                  <CardTitle className="text-lg">Attendee Demographics by Role</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(detailed.demographics.byRole || {}).map(([role, count]) => (
                    <div key={role} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{role}</span>
                      <span className="font-semibold">{count as number}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border text-foreground">
                <CardHeader>
                  <CardTitle className="text-lg">Attendee Demographics by Country</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(detailed.demographics.byCountry || {}).slice(0, 8).map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{country}</span>
                      <span className="font-semibold">{count as number}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

