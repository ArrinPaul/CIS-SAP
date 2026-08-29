'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { 
  MessageSquare, 
  Settings, 
  BarChart3, 
  ChevronRight,
  Plus,
  Loader2,
  Activity,
  Star,
  Users
} from 'lucide-react';
import { getEvents } from '@/app/actions/events';
import { getEventFeedbackAnalytics, getFeedbackTemplates } from '@/app/actions/feedback';
import { FeedbackTemplateBuilder } from '@/features/feedback/feedback-template-builder';
import Link from 'next/link';
import { cn } from '@/core/utils/utils';

export default function OrganizerFeedbackPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      try {
        const eventData = await getEvents({ organizerId: user.id });
        const eventsWithStats = await Promise.all(eventData.map(async (e) => {
          const stats = await getEventFeedbackAnalytics(e.id);
          return { ...e, stats };
        }));
        setEvents(eventsWithStats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleStartBuilder = async (eventId: string) => {
    setSelectedEventId(eventId);
    const templates = await getFeedbackTemplates(eventId);
    setActiveTemplate(templates.find(t => t.eventId === eventId) || null);
    setView('builder');
  };

  if (loading) {
    return (
      <div className="container py-20 text-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading feedback workspace...</p>
      </div>
    );
  }

  if (view === 'builder' && selectedEventId) {
    return (
      <div className="container py-8 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setView('list')} className="text-foreground hover:bg-card">
            <ChevronRight className="rotate-180" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Questionnaire Builder</h1>
        </div>
        <FeedbackTemplateBuilder 
          eventId={selectedEventId} 
          initialTemplate={activeTemplate} 
        />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Feedback Manager</h1>
        <p className="text-muted-foreground">Understand attendee satisfaction and manage custom questionnaires.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border text-foreground shadow-xl">
           <CardHeader>
             <div className="p-2 w-fit bg-amber-500/10 rounded-lg mb-2"><Star className="text-amber-400" /></div>
             <CardTitle>NPS Tracking</CardTitle>
             <CardDescription className="text-muted-foreground">Net Promoter Score automatically calculated from attendee ratings.</CardDescription>
           </CardHeader>
        </Card>
        <Card className="bg-card border-border text-foreground shadow-xl">
           <CardHeader>
             <div className="p-2 w-fit bg-blue-500/10 rounded-lg mb-2"><MessageSquare className="text-blue-400" /></div>
             <CardTitle>Custom Questions</CardTitle>
             <CardDescription className="text-muted-foreground">Design per-event questionnaires to gather specific insights.</CardDescription>
           </CardHeader>
        </Card>
        <Card className="bg-card border-border text-foreground shadow-xl">
           <CardHeader>
             <div className="p-2 w-fit bg-emerald-500/10 rounded-lg mb-2"><Activity className="text-emerald-400" /></div>
             <CardTitle>Live Analytics</CardTitle>
             <CardDescription className="text-muted-foreground">Real-time charts and sentiment trends as feedback rolls in.</CardDescription>
           </CardHeader>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Your Events
        </h2>
        
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id} className="bg-card border-border text-foreground group hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold group-hover:text-primary transition-colors">{event.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                       <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {event.stats.total} Responses</span>
                       <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" /> {event.stats.averageRating} Avg. Rating</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-center">
                       <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mb-1">NPS Score</p>
                       <p className={cn(
                         "text-2xl font-black",
                         event.stats.nps > 50 ? "text-emerald-500" : event.stats.nps > 0 ? "text-amber-500" : "text-destructive"
                       )}>
                         {event.stats.nps > 0 ? '+' : ''}{event.stats.nps}
                       </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="border-border hover:bg-card" onClick={() => handleStartBuilder(event.id)}>
                        <Settings className="w-4 h-4 mr-2" /> Questionnaire
                      </Button>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                        <Link href={`/organizer/feedback/${event.id}`}>
                           <BarChart3 className="w-4 h-4 mr-2" /> Analytics
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {events.length === 0 && (
            <div className="py-20 text-center bg-card rounded-2xl border-2 border-dashed border-border">
               <p className="text-muted-foreground">You haven't created any events yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
