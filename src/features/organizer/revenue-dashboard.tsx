'use client';
import { useEffect, useState, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Ticket, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2
} from 'lucide-react';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ExportButton } from '@/components/shared/export-button';
import { cn } from '@/core/utils/utils';
import { getOrganizerRevenueDashboard } from '@/app/actions/analytics';
import { format } from 'date-fns';

const COLORS = ['#0075de', '#62aef0', '#d6b6f6', '#ff64c8', '#2a9d99'];

export function RevenueDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 12450,
    revenueTrend: 12,
    ticketTrend: 8,
    revenueByEvent: [
      { title: 'Global Tech Summit', revenue: 5400, ticketCount: 120 },
      { title: 'AI Workshop', revenue: 3200, ticketCount: 45 },
      { title: 'Music Festival', revenue: 2100, ticketCount: 85 },
      { title: 'Design Meetup', revenue: 1750, ticketCount: 30 },
    ] as Array<{ title: string; revenue: number; ticketCount: number }>,
    dailyRevenue: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
      amount: Math.floor(Math.random() * 500) + 100
    })),
    revenueByTier: { 'Early Bird': 4500, 'General': 6200, 'VIP': 1750 } as Record<string, number>,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Hoisted out of the effect so the error state can offer a retry.
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getOrganizerRevenueDashboard();
      if (data) setStats(data as any);
    } catch (e) {
      setLoadError(true);
      console.error("Revenue dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-notion-primary" />
      </div>
    );
  }

  if (loadError) {
    return <LoadError what="revenue data" onRetry={load} />;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-notion-hairline pb-4">
        <h2 className="text-h2">Revenue Overview</h2>
        <ExportButton 
          data={stats.revenueByEvent} 
          filename="revenue_report" 
          title="Revenue Report" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, trend: stats.revenueTrend, icon: DollarSign, color: 'text-notion-primary' },
          { label: 'Total Tickets', value: stats.revenueByEvent.reduce((sum, e) => sum + e.ticketCount, 0).toLocaleString(), trend: stats.ticketTrend, icon: Ticket, color: 'text-notion-accent-purple' },
          { label: 'Avg. Order', value: `$${(stats.totalRevenue / Math.max(1, stats.revenueByEvent.reduce((sum, e) => sum + e.ticketCount, 0))).toFixed(2)}`, icon: TrendingUp, color: 'text-notion-accent-pink' },
          { label: 'Active Events', value: stats.revenueByEvent.length, icon: Users, color: 'text-notion-accent-teal' },
        ].map((kpi, i) => (
          <Card key={i} className="bg-notion-surface border-notion-hairline">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <p className="text-eyebrow font-bold text-notion-ink-muted uppercase">{kpi.label}</p>
                <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              </div>
              <p className="text-display-2 font-bold text-notion-ink">{kpi.value}</p>
              {kpi.trend !== undefined && (
                <div className={cn(
                  "flex items-center gap-1 mt-2 text-eyebrow font-bold uppercase",
                  kpi.trend >= 0 ? "text-notion-accent-green" : "text-red-500"
                )}>
                  {kpi.trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  <span>{Math.abs(kpi.trend)}% vs last month</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-notion-surface border-notion-hairline overflow-hidden">
          <CardHeader className="bg-notion-canvas-soft/30 border-b border-notion-hairline">
            <CardTitle className="text-h3">Revenue Trends</CardTitle>
            <CardDescription className="text-body-sm text-notion-ink-muted">Daily revenue distribution</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--notion-hairline)" />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--notion-ink-faint)" 
                  fontSize={10} 
                  tickFormatter={(val) => format(new Date(val), 'MMM d')}
                />
                <YAxis stroke="var(--notion-ink-faint)" fontSize={10} tickFormatter={(val) => `$${val}`} />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="var(--notion-primary)" 
                  strokeWidth={2} 
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--notion-primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-notion-surface border-notion-hairline overflow-hidden">
          <CardHeader className="bg-notion-canvas-soft/30 border-b border-notion-hairline">
            <CardTitle className="text-h3">Revenue by Event</CardTitle>
            <CardDescription className="text-body-sm text-notion-ink-muted">Top performing nodes</CardDescription>
          </CardHeader>
          <CardContent className="p-6 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByEvent.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--notion-hairline)" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="title" 
                  type="category" 
                  stroke="var(--notion-ink-faint)" 
                  fontSize={10} 
                  width={100}
                  tickFormatter={(val) => val.length > 15 ? `${val.substring(0, 15)}...` : val}
                />
                <Bar dataKey="revenue" fill="var(--notion-accent-sky)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-notion-surface border-notion-hairline">
        <CardHeader className="border-b border-notion-hairline bg-notion-canvas-soft/30">
          <CardTitle className="text-h3">Tier Breakdown</CardTitle>
          <CardDescription className="text-body-sm text-notion-ink-muted">Revenue distribution by ticket type</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(stats.revenueByTier).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {Object.entries(stats.revenueByTier).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              {Object.entries(stats.revenueByTier).sort((a, b) => b[1] - a[1]).map(([name, value], index) => (
                <div key={name} className="flex items-center justify-between border-b border-notion-hairline pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-body-sm font-medium">{name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm font-bold">${value.toLocaleString()}</p>
                    <p className="text-eyebrow text-notion-ink-muted">
                      {((value / stats.totalRevenue) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
