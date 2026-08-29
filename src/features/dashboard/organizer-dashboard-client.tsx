'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/core/utils/utils';
import {
  Plus, Calendar, Users, Search,
  Loader2, Trash2, Edit, Copy, BrainCircuit, ChevronRight,
  Activity, MapPin, ExternalLink, Filter, ArrowUpRight
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEvents, deleteEvent, cloneEvent } from '@/app/actions/events';
import type { EventraEvent } from '@/types';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [managedEvents, setManagedEvents] = useState<EventraEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('events');
  const [isCloning, setIsCloning] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getEvents({
        organizerId: user.id,
        status: 'published'
      });
      setManagedEvents(data as any);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load events.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvents = managedEvents.filter((e: EventraEvent) =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const result = await deleteEvent(id);
      if (!result.success) throw new Error(result.error);
      toast({ title: 'Event deleted' });
      loadData();
    } catch (e) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const handleClone = async (id: string) => {
    setIsCloning(id);
    try {
      const result = await cloneEvent(id);
      if (result.success) {
        toast({ title: 'Event cloned' });
        loadData();
      }
    } catch (e) {
      toast({ title: 'Failed to clone', variant: 'destructive' });
    } finally {
      setIsCloning(null);
    }
  };

  const totalRegistrations = managedEvents.reduce((sum: number, e: EventraEvent) => sum + (e.registeredCount || 0), 0);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-notion-hairline border-t-notion-primary animate-spin" />
          <p className="text-sm font-medium text-notion-ink-muted uppercase tracking-widest">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-24 px-6 md:px-10">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-notion-hairline pb-10">
        <div className="space-y-3">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-notion-canvas border-notion-hairline text-notion-ink-muted font-bold px-3 py-0.5 rounded-md shadow-sm">
                Management Console
              </Badge>
           </div>
           <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-notion-ink uppercase">
             Event <span className="text-notion-primary italic">Manager.</span>
           </h1>
           <p className="text-lg text-notion-ink-muted font-medium max-w-xl">
             Manage your events, analyze registrations, and grow your audience.
           </p>
        </div>
        <Button asChild variant="primary" size="lg" className="h-12 px-8 rounded-xl shadow-notion-elevated font-black uppercase tracking-widest text-xs">
          <Link href="/events/create"><Plus className="mr-2 h-4 w-4" /> Create Event</Link>
        </Button>
      </header>

      {/* KPI STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {[
          { label: 'Active Events', value: managedEvents.length, icon: Calendar, color: 'text-notion-primary', bg: 'bg-notion-primary/5', trend: '+2.4%' },
          { label: 'Total Registrations', value: totalRegistrations.toLocaleString(), icon: Users, color: 'text-notion-accent-teal', bg: 'bg-notion-accent-teal/5', trend: '+12.1%' },
        ].map((stat, i) => (
          <Card key={i} className="group hover:shadow-notion-soft transition-all duration-500 border-notion-hairline overflow-hidden bg-white dark:bg-zinc-950 rounded-[2rem]">
            <CardContent className="p-8 relative">
               <div className="absolute top-0 right-0 w-32 h-32 bg-notion-primary/5 blur-[40px] rounded-full -mr-16 -mt-16 group-hover:bg-notion-primary/10 transition-colors" />
               <div className="relative z-10 flex flex-col justify-between h-full space-y-10">
                  <div className="flex justify-between items-start">
                     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border border-notion-hairline shadow-sm transition-transform group-hover:scale-110", stat.bg)}>
                       <stat.icon className={cn("w-7 h-7", stat.color)} />
                     </div>
                     <Badge variant="secondary" className="bg-notion-accent-green/10 text-notion-accent-green border-none px-3 py-1 font-bold text-[10px]">
                       <ArrowUpRight size={12} className="mr-1" /> {stat.trend}
                     </Badge>
                  </div>
                  <div className="space-y-1">
                     <p className="text-4xl font-display font-black text-notion-ink tracking-tighter">{stat.value}</p>
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-notion-ink-faint">{stat.label}</p>
                  </div>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* TABS INTERFACE */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
        <TabsList className="bg-muted/30 p-1.5 rounded-2xl border border-notion-hairline w-fit">
          {['events', 'analytics', 'feedback', 'team'].map(tab => (
            <TabsTrigger 
              key={tab} 
              value={tab} 
              className="rounded-xl px-8 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-notion-surface dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="events" className="m-0 space-y-8">
          <Card className="overflow-hidden border-notion-hairline bg-white dark:bg-zinc-950 rounded-[2rem] shadow-sm">
            <div className="p-8 border-b border-notion-hairline bg-notion-canvas-soft/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold tracking-tight text-notion-ink flex items-center gap-3">
                     <Activity size={18} className="text-notion-primary" />
                     Live Events
                  </h3>
                  <p className="text-sm font-medium text-notion-ink-muted">{managedEvents.length} events are currently live</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="relative w-full md:w-80">
                     <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-notion-ink-faint" />
                     <Input
                       placeholder="Filter events..."
                       className="pl-10 rounded-xl bg-white dark:bg-black border-notion-hairline h-10 text-xs font-bold uppercase tracking-widest"
                       value={searchTerm}
                       onChange={(e) => setSearchTerm(e.target.value)}
                     />
                   </div>
                   <Button variant="outline" size="icon" className="rounded-xl border-notion-hairline h-10 w-10">
                      <Filter size={16} className="text-notion-ink-faint" />
                   </Button>
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-notion-hairline">
              {filteredEvents.map((event: any) => (
                <div key={event.id} className="flex flex-col md:flex-row md:items-center justify-between p-8 hover:bg-notion-canvas-soft/40 transition-colors group">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-2xl bg-notion-canvas-soft flex flex-col items-center justify-center flex-shrink-0 border border-notion-hairline shadow-inner transition-transform group-hover:scale-105">
                      <span className="text-[10px] font-black uppercase text-notion-primary leading-none mb-1">{format(new Date(event.startDate), 'MMM')}</span>
                      <span className="text-xl font-display font-black text-notion-ink leading-none">{format(new Date(event.startDate), 'dd')}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-bold text-notion-ink group-hover:text-notion-primary transition-colors tracking-tight">{event.title}</h3>
                        {event.organizerId !== user?.id && <Badge className="bg-notion-accent-purple/10 text-notion-accent-purple border-none text-[9px] font-black uppercase tracking-widest">Collaborative</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-6 text-[11px] font-bold text-notion-ink-muted uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Users size={12} className="text-notion-primary" /> {event.registeredCount || 0} Registered</span>
                        <span className="flex items-center gap-2"><MapPin size={12} className="text-notion-primary" /> {typeof event.location === 'string' ? event.location : event.location?.venue || 'Digital'}</span>
                        <Badge className={cn(
                           "text-[9px] font-black px-2 py-0 border-none uppercase tracking-[0.2em]",
                           event.status === 'published' ? "bg-emerald-500/10 text-emerald-500" : "bg-notion-ink-faint/10 text-notion-ink-faint"
                        )}>
                          {event.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-6 md:mt-0 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-notion-hairline hover:bg-notion-surface" onClick={() => handleClone(event.id)} disabled={isCloning === event.id}>
                      {isCloning === event.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Copy size={16} className="text-notion-ink-faint" />}
                    </Button>
                    <div className="w-px h-6 bg-notion-hairline mx-1" />
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-notion-hairline hover:bg-notion-surface text-notion-primary" asChild><Link href={`/events/${event.id}`}><ExternalLink size={16} /></Link></Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-notion-hairline hover:bg-notion-surface" asChild><Link href={`/events/${event.id}/edit`}><Edit size={16} /></Link></Button>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-notion-hairline hover:bg-red-50 text-red-500 hover:text-red-600" onClick={() => handleDelete(event.id)}><Trash2 size={16} /></Button>
                  </div>
                </div>
              ))}
              
              {filteredEvents.length === 0 && (
                <div className="p-24 text-center space-y-8">
                  <div className="w-16 h-16 bg-notion-canvas-soft rounded-[1.5rem] flex items-center justify-center mx-auto border border-notion-hairline shadow-sm">
                     <Calendar className="w-8 h-8 text-notion-ink-faint/40" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-bold tracking-tight">No Events Found.</h3>
                     <p className="text-sm font-medium text-notion-ink-muted max-w-xs mx-auto">Create a new event to begin managing your audience.</p>
                  </div>
                  <Button asChild variant="primary" className="rounded-xl px-10 h-11 font-black uppercase tracking-widest text-[10px] shadow-notion-soft">
                    <Link href="/events/create">Create Event</Link>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {managedEvents.map(event => (
              <Card key={event.id} className="p-8 border-notion-hairline bg-white dark:bg-zinc-950 hover:shadow-notion-elevated transition-all duration-500 cursor-pointer group flex flex-col justify-between min-h-[300px] rounded-[2rem]">
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div className="w-14 h-14 rounded-2xl bg-notion-accent-purple/10 flex items-center justify-center text-notion-accent-purple group-hover:scale-110 transition-transform shadow-sm">
                      <BrainCircuit size={28} />
                    </div>
                    <Badge className="bg-notion-accent-sky/10 text-notion-accent-sky border-none text-[9px] font-black uppercase tracking-widest">Insights</Badge>
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-bold tracking-tight text-notion-ink group-hover:text-notion-primary transition-colors line-clamp-2">{event.title}</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-notion-ink-faint leading-none">View detailed audience metrics</p>
                  </div>
                </div>
                <div className="pt-8 mt-auto border-t border-notion-hairline/50 flex justify-between items-center">
                  <Button variant="link" className="text-notion-primary font-black p-0 h-auto text-[10px] uppercase tracking-[0.2em] group-hover:translate-x-1 transition-transform" asChild>
                    <Link href={`/organizer/insights/${event.id}`}>View Insights <ChevronRight size={12} className="ml-1" /></Link>
                  </Button>
                  <div className="flex gap-1">
                     {[1, 2, 3].map(i => <div key={i} className="w-1 h-3 rounded-full bg-notion-primary/20 group-hover:bg-notion-primary transition-colors" style={{ transitionDelay: `${i * 100}ms` }} />)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
