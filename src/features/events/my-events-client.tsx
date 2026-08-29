'use client';
// 
import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { EventraEvent } from '@/types';
import { MyEventCard } from '@/features/events/my-event-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar, 
  Search, 
  Ticket, 
  Heart, 
  History, 
  Plus,
  Loader2,
  CalendarDays,
  QrCode,
  Share2
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/core/utils/utils';
import { format, isPast, isFuture, isToday } from 'date-fns';

const getEventDate = (event: EventraEvent): Date => {
  const dateValue = event.startDate || event.date;
  if (!dateValue) return new Date();
  return new Date(dateValue);
};

export default function MyEventsClient() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const allEventsRaw: any[] = [];
  const myRegistrations: any[] = [];

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('registered');

  const loading = allEventsRaw === undefined;
  
  const events: EventraEvent[] = (allEventsRaw || []).map((e: any) => ({
    ...e,
    id: e.id,
  }));

  const registeredEventIds = new Set(
    (myRegistrations || [])
      .filter((r: any) => r.status === 'confirmed' || r.status === 'registered')
      .map((r: any) => r.eventId?.toString())
  );

  const userEvents = events.filter(event => 
    registeredEventIds.has(event.id?.toString()) ||
    user?.myEvents?.includes(event.id)
  );

  const wishlisted = user?.wishlist || [];

  const filterEvents = (events: EventraEvent[], tab: string) => {
    let filtered = events;
    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch (tab) {
      case 'registered':
        return filtered.filter(event => {
          const eventDate = getEventDate(event);
          return isFuture(eventDate) || isToday(eventDate);
        });
      case 'past':
        return filtered.filter(event => {
          const eventDate = getEventDate(event);
          return isPast(eventDate) && !isToday(eventDate);
        });
      case 'wishlist':
        return events.filter(event => wishlisted.includes(event.id));
      default:
        return filtered;
    }
  };

  const registeredEvents = filterEvents(userEvents, 'registered');
  const pastEvents = filterEvents(userEvents, 'past');
  const wishlistedEvents = filterEvents(events, 'wishlist');

  const handleRemoveWishlist = async (eventId: string) => {
    await updateUser({
      wishlist: wishlisted.filter((id: string) => id !== eventId)
    });
    toast({ title: 'Removed from wishlist' });
  };

  const handleRateEvent = async (eventId: string, rating: number) => {
    const currentRatings = user?.eventRatings || {};
    await updateUser({
      eventRatings: { ...currentRatings, [eventId]: rating }
    });
    toast({ title: 'Rating submitted' });
  };

  const nextEvent = registeredEvents
    .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())[0];

  return (
    <div className="max-w-7xl mx-auto space-y-16 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
           <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em]">
             Mission Log
           </Badge>
           <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tighter leading-none">
             My <span className="text-primary italic">Missions.</span>
           </h1>
           <p className="text-lg text-muted-foreground font-medium max-w-xl">
             Manage your active synchronizations, past experiences, and node wishlist.
           </p>
        </div>
        <Button size="lg" asChild className="rounded-2xl h-14 px-8 bg-primary text-primary-foreground shadow-notion-soft font-black uppercase tracking-widest text-[11px] border-none">
          <Link href="/explore"><Plus className="mr-3 h-4 w-4" />Find New Node</Link>
        </Button>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="space-y-12">
        <div className="relative group max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Filter your log..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="pl-16 h-16 rounded-[1.5rem] bg-background border-border/80 text-lg font-medium focus-visible:ring-primary shadow-xl" 
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 gap-10 mb-12">
            <TabsTrigger value="registered" className="bg-transparent border-none rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground font-black uppercase tracking-[0.2em] text-[11px] pb-4 px-0 transition-all flex items-center gap-3">
              <Ticket className="w-4 h-4" /> 
              Active Nodes
              {registeredEvents.length > 0 && <span className="ml-1 text-primary opacity-60">[{registeredEvents.length}]</span>}
            </TabsTrigger>
            <TabsTrigger value="past" className="bg-transparent border-none rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground font-black uppercase tracking-[0.2em] text-[11px] pb-4 px-0 transition-all flex items-center gap-3">
              <History className="w-4 h-4" /> 
              Archived
              {pastEvents.length > 0 && <span className="ml-1 text-primary opacity-60">[{pastEvents.length}]</span>}
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="bg-transparent border-none rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary text-muted-foreground font-black uppercase tracking-[0.2em] text-[11px] pb-4 px-0 transition-all flex items-center gap-3">
              <Heart className="w-4 h-4" /> 
              Wishlist
              {wishlistedEvents.length > 0 && <span className="ml-1 text-primary opacity-60">[{wishlistedEvents.length}]</span>}
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex items-center justify-center py-40">
               <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl border-4 border-primary/10 border-t-primary animate-spin" />
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Syncing Log...</p>
               </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <TabsContent value="registered" className="m-0">
                {registeredEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {registeredEvents.map(event => <MyEventCard key={event.id} event={event} variant="upcoming" />)}
                  </div>
                ) : (
                  <div className="text-center py-40 bg-background rounded-[3rem] border-2 border-dashed border-border">
                     <div className="w-20 h-20 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-8">
                        <Ticket className="w-10 h-10 text-muted-foreground/40" />
                     </div>
                     <h3 className="text-3xl font-display font-bold mb-4">No active synchronizations.</h3>
                     <p className="text-muted-foreground font-medium max-w-sm mx-auto mb-10">You haven't registered for any upcoming events yet.</p>
                     <Button asChild size="lg" className="rounded-2xl px-10 font-black h-14">
                        <Link href="/explore">Discover Events</Link>
                     </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="past" className="m-0">
                {pastEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {pastEvents.map(event => <MyEventCard key={event.id} event={event} variant="past" onRate={handleRateEvent} />)}
                  </div>
                ) : (
                  <div className="text-center py-40 bg-background rounded-[3rem] border-2 border-dashed border-border opacity-60">
                     <History className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                     <p className="text-xl font-display font-bold">Log History Empty</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="wishlist" className="m-0">
                {wishlistedEvents.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {wishlistedEvents.map(event => <MyEventCard key={event.id} event={event} variant="wishlist" onRemoveWishlist={handleRemoveWishlist} />)}
                  </div>
                ) : (
                  <div className="text-center py-40 bg-background rounded-[3rem] border-2 border-dashed border-border opacity-60">
                     <Heart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                     <p className="text-xl font-display font-bold">Wishlist Clear</p>
                  </div>
                )}
              </TabsContent>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}

