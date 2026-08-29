'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Heart,
  Share2,
  Ticket,
  CheckCircle,
  Loader2,
  Edit,
  Copy,
  Sparkles,
  Terminal,
  Info,
  ExternalLink,
  Navigation,
  FileText,
  Tag,
  Building2
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { ChatbotTrigger, EventChatbot } from '@/features/ai/event-chatbot';
import { Progress } from '@/components/ui/progress';
import { EventDiscussionBoard } from './event-discussion-board';
import { EventReactions } from './event-reactions';
import { EventGallery } from './event-gallery';
import { AnnouncementBanner } from './announcement-banner';
import { generateEventSummary } from '@/app/actions/event-insights';
import { registerForEvent, getRegistrationStatus } from '@/app/actions/registrations';
import { cloneEvent } from '@/app/actions/events';
import { validateAndApplyPromoCode } from '@/app/actions/promo-codes';
import { ExpoHallGrid } from '@/features/sponsors/expo-hall-grid';
import { MultiTrackAgenda } from '@/features/agenda/multi-track-agenda';
import { PostEventBanner } from '@/features/feedback/post-event-banner';
import { getEventSponsors } from '@/app/actions/sponsors';
import { format } from 'date-fns';

export default function EventDetailsClient({ eventId, initialEvent }: { eventId: string, initialEvent: any }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState(initialEvent);
  const [activeTab, setActiveTab] = useState('about');
  const [registering, setRegistering] = useState(false);
  const [registration, setRegistration] = useState<any>(null);
  const [cloning, setCloning] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [sponsors, setSponsors] = useState<any[]>([]);

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (user?.id) {
        const res = await getRegistrationStatus(eventId);
        if (res) {
          setRegistration(res);
        }
      }
      try {
        const sp = await getEventSponsors(eventId);
        if (sp.success) {
          setSponsors(sp.sponsors);
        }
      } catch (e) {
        console.warn('Failed to load event sponsors', e);
      }
    }
    checkStatus();
  }, [eventId, user?.id]);

  const handleRegister = async (tierId?: string) => {
    if (!user) {
      toast({
        title: 'Sign In Required',
        description: 'Please log in to register for events.',
        variant: 'destructive'
      });
      router.push('/login');
      return;
    }

    setRegistering(true);
    try {
      const result = await registerForEvent(eventId, { tierId });
      if (result.success) {
        toast({
          title: 'Success!',
          description: (result as any).ticketNumber ? `Ticket ID: ${(result as any).ticketNumber}` : 'Successfully registered.',
        });
        const status = await getRegistrationStatus(eventId);
        setRegistration(status);
        setEvent((prev: any) => ({ ...prev, registeredCount: prev.registeredCount + 1 }));
      } else {
        toast({
          title: 'Registration Failed',
          description: result.error || 'Something went wrong',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: 'Failed to process registration.',
        variant: 'destructive'
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleClone = async () => {
    setCloning(true);
    try {
      const result = await cloneEvent(eventId);
      if (result.success && result.id) {
        toast({ title: 'Event Cloned', description: 'Redirecting to new event.' });
        router.push(`/events/${result.id}/edit`);
      }
    } catch (e) {
      toast({ title: 'Clone Failed', variant: 'destructive' });
    } finally {
      setCloning(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    setValidatingPromo(true);
    try {
      const basePrice = Number(event.price || 0);
      const res = await validateAndApplyPromoCode(promoCodeInput, eventId, basePrice);
      if (res.success) {
        setAppliedPromo(res);
        toast({ 
          title: 'Promo Code Applied!', 
          description: `Saved $${res.discountAmount?.toFixed(2)} with code ${res.code}` 
        });
      } else {
        toast({ title: 'Invalid Promo Code', description: res.error, variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Validation Error', variant: 'destructive' });
    } finally {
      setValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCodeInput('');
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const result = await generateEventSummary(eventId);
      if (result.success) {
        setEvent({ ...event, summary: result.summary });
        toast({ title: 'AI Summary Ready' });
      }
    } catch (e) {
      toast({ title: 'Analysis Failed', variant: 'destructive' });
    } finally {
      setGeneratingSummary(false);
    }
  };

  if (!event) return null;

  const isRegistered = !!registration;
  const isOrganizer = user && (user.id === event.organizerId || user.role === 'admin');
  const capacityPercent = event.capacity > 0 ? Math.min(100, Math.round((event.registeredCount / event.capacity) * 100)) : 0;
  const isFull = event.registeredCount >= event.capacity;
  const isExternal = !!event.externalUrl;

  const locationDisplay = typeof event.location === 'string' 
    ? event.location 
    : event.location?.venue || 'Virtual Event';

  return (
    <div className="min-h-screen bg-background pb-32 font-sans text-foreground">
      
      {/* TOP NAVIGATION BAR */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to Explore
          </Button>

          {isOrganizer && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="hidden md:flex gap-1.5">
                <Link href={`/events/${eventId}/map/edit`}><Navigation className="w-3.5 h-3.5" /> Venue Map</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden md:flex gap-1.5">
                <Link href={`/events/${eventId}/report`}><FileText className="w-3.5 h-3.5" /> Report</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={handleClone} disabled={cloning} className="hidden sm:flex">
                {cloning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Copy className="mr-2 h-4 w-4" />} Duplicate
              </Button>
              <Button size="sm" asChild>
                <Link href={`/events/${eventId}/edit`}><Edit className="mr-2 h-4 w-4" /> Edit Event</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        
        {/* HERO BANNER */}
        <div className="w-full aspect-video sm:aspect-[21/9] bg-muted rounded-3xl overflow-hidden relative border border-border">
          {event.imageUrl ? (
            <Image src={event.imageUrl} alt={event.title} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-900 text-muted-foreground">
              <Calendar className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-medium">No cover image provided</p>
            </div>
          )}
        </div>

        <AnnouncementBanner eventId={event.id} />

        {/* MAIN TWO-COLUMN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pt-4">
          
          {/* LEFT COLUMN: CONTENT */}
          <div className="lg:col-span-2 space-y-10">
            
            {/* POST-EVENT FEEDBACK PROMPT BANNER */}
            <PostEventBanner
              eventId={eventId}
              eventTitle={event.title}
              isRegistered={isRegistered}
              isCompleted={event.status === 'completed'}
            />

            {/* TITLE & META */}
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors">
                  {event.category}
                </Badge>
                <Badge variant="secondary" className="capitalize text-muted-foreground">
                  {event.type}
                </Badge>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground capitalize break-words">
                {event.title.replace(/-/g, ' ')}
              </h1>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-muted-foreground">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg"><Calendar className="w-5 h-5 text-foreground" /></div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{format(new Date(event.startDate), 'EEEE, MMMM do, yyyy')}</p>
                      <p className="text-xs">{format(new Date(event.startDate), 'h:mm a')} - {format(new Date(event.endDate), 'h:mm a')}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg"><MapPin className="w-5 h-5 text-foreground" /></div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{locationDisplay}</p>
                      <p className="text-xs capitalize">{event.type} Event</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" asChild className="h-9 gap-1.5 text-xs rounded-xl">
                    <Link href={`/events/${eventId}/map`}>
                      <Navigation className="w-3.5 h-3.5 text-primary" /> Venue Map
                    </Link>
                  </Button>
                  <Button size="sm" asChild className="h-9 gap-1.5 text-xs rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-sm">
                    <Link href={`/events/${eventId}/stage`}>
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Live Stage
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* TABS */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start border-b border-border rounded-none bg-transparent p-0 h-auto gap-8 overflow-x-auto scrollbar-hide">
                {['about', 'agenda', 'expo hall', 'discussion', 'media', 'venue map', 'live stage'].map((tab) => (
                  <TabsTrigger 
                    key={tab} 
                    value={tab} 
                    className="capitalize rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-base font-medium text-muted-foreground data-[state=active]:text-foreground whitespace-nowrap shrink-0"
                  >
                    {tab}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="pt-8">
                {/* ABOUT TAB */}
                <TabsContent value="about" className="space-y-8 m-0 focus:outline-none">
                  {event.summary && (
                    <div className="p-6 bg-primary/5 border border-primary/10 rounded-2xl space-y-3">
                      <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                        <Terminal size={16} /> AI Summary
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">"{event.summary}"</p>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-2xl font-bold tracking-tight">About this event</h3>
                      {isOrganizer && !event.summary && (
                        <Button variant="secondary" size="sm" onClick={handleGenerateSummary} disabled={generatingSummary} className="h-8">
                          {generatingSummary ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />} AI Summary
                        </Button>
                      )}
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {event.description}
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-border">
                     <EventReactions eventId={event.id} />
                  </div>
                </TabsContent>

                {/* AGENDA TAB */}
                <TabsContent value="agenda" className="m-0 focus:outline-none">
                  <MultiTrackAgenda eventId={eventId} eventTitle={event.title} />
                </TabsContent>

                {/* EXPO HALL TAB */}
                <TabsContent value="expo hall" className="m-0 focus:outline-none">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold tracking-tight">Virtual Expo Hall</h3>
                        <p className="text-sm text-muted-foreground">Explore partner booths, drop digital business cards, and claim exclusive attendee perks.</p>
                      </div>
                      {isOrganizer && (
                        <Button size="sm" asChild variant="outline" className="rounded-xl gap-1.5 text-xs">
                          <Link href={`/organizer/sponsors?eventId=${eventId}`}>
                            <Building2 className="w-3.5 h-3.5" /> Manage Sponsors
                          </Link>
                        </Button>
                      )}
                    </div>
                    <ExpoHallGrid sponsors={sponsors} />
                  </div>
                </TabsContent>

                {/* DISCUSSION TAB */}
                <TabsContent value="discussion" className="m-0 focus:outline-none">
                  <EventDiscussionBoard eventId={event.id} />
                </TabsContent>

                {/* MEDIA TAB */}
                <TabsContent value="media" className="m-0 focus:outline-none">
                  <EventGallery eventId={event.id} isRegistered={isRegistered} isStaff={!!isOrganizer} />
                </TabsContent>

                {/* VENUE MAP TAB */}
                <TabsContent value="venue map" className="m-0 focus:outline-none">
                  <div className="p-8 text-center border border-border rounded-3xl bg-muted/20 space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                      <Navigation className="w-8 h-8" />
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                      <h3 className="text-xl font-bold text-foreground">Interactive Venue Navigation</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Explore the interactive venue blueprint, locate session stages, sponsor booths, amenities, and get step-by-step walking directions.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <Button asChild size="lg" className="rounded-xl gap-2 shadow-sm">
                        <Link href={`/events/${eventId}/map`}>
                          <Navigation className="w-4 h-4" /> Open Full-Screen Navigation Map
                        </Link>
                      </Button>
                      {isOrganizer && (
                        <Button variant="outline" size="lg" asChild className="rounded-xl gap-2">
                          <Link href={`/events/${eventId}/map/edit`}>
                            <Edit className="w-4 h-4" /> Edit Venue Nodes & Paths
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* LIVE STAGE TAB */}
                <TabsContent value="live stage" className="m-0 focus:outline-none">
                  <div className="p-8 text-center border border-red-500/20 rounded-3xl bg-red-500/5 space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto text-red-500">
                      <span className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                        <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />
                      </span>
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                      <h3 className="text-xl font-bold text-foreground">Interactive Live Stage</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Join the live virtual stream, participate in real-time stage chat, raise your hand to speak, and interact with the speakers.
                      </p>
                    </div>
                    <div className="flex justify-center pt-2">
                      <Button asChild size="lg" className="rounded-xl gap-2 bg-red-500 hover:bg-red-600 text-white shadow-lg">
                        <Link href={`/events/${eventId}/stage`}>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> Enter Live Stage Room
                        </Link>
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* RIGHT COLUMN: STICKY SIDEBAR */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              
              {/* TICKETING CARD */}
              <Card className="border-border shadow-md rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-6">
                  <div className="text-center pb-6 border-b border-border">
                    {Number(event.price) > 0 ? (
                      <div>
                        {appliedPromo ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-2xl line-through text-muted-foreground font-medium">
                                ${Number(event.price).toFixed(2)}
                              </span>
                              <span className="text-4xl font-bold tracking-tight text-emerald-500 font-mono">
                                ${appliedPromo.finalAmount.toFixed(2)}
                              </span>
                            </div>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-mono">
                              {appliedPromo.code}: -${appliedPromo.discountAmount.toFixed(2)}
                            </Badge>
                          </div>
                        ) : (
                          <p className="text-4xl font-bold tracking-tight">${Number(event.price).toFixed(2)}</p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 font-medium">Standard Admission</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-4xl font-bold tracking-tight">Free</p>
                        <p className="text-sm text-muted-foreground mt-1 font-medium">General Admission</p>
                      </div>
                    )}
                  </div>

                  {/* PROMO CODE SECTION */}
                  {!isRegistered && !isExternal && (
                    <div className="space-y-2 pt-1 border-b border-border pb-4">
                      {appliedPromo ? (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                          <div className="flex items-center gap-1.5 text-emerald-600 font-bold font-mono">
                            <Tag className="w-3.5 h-3.5" />
                            <span>{appliedPromo.code} Applied</span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemovePromo}
                            className="text-xs text-muted-foreground hover:text-red-500 underline"
                          >
                            Remove
                          </button>
                        </div>
                      ) : showPromoInput ? (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter promo code"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                            className="h-9 text-xs font-mono uppercase font-bold"
                          />
                          <Button
                            size="sm"
                            type="button"
                            onClick={handleApplyPromo}
                            disabled={validatingPromo}
                            className="h-9 px-3 text-xs shrink-0"
                          >
                            {validatingPromo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPromoInput(true)}
                          className="text-xs font-medium text-primary hover:underline flex items-center gap-1 mx-auto"
                        >
                          <Tag className="w-3.5 h-3.5" /> Have a promo code?
                        </button>
                      )}
                    </div>
                  )}

                  {!isExternal && (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Capacity</span>
                        <span>{capacityPercent}% Filled</span>
                      </div>
                      <Progress value={capacityPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        {isFull ? "Event is currently full" : `${event.capacity - event.registeredCount} spots remaining`}
                      </p>
                    </div>
                  )}

                  {isExternal ? (
                    <Button 
                      size="lg" 
                      asChild
                      className="w-full h-14 rounded-xl font-bold text-base mt-4"
                    >
                      <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
                        <span className="flex items-center gap-2">Get Tickets <ExternalLink className="w-5 h-5" /></span>
                      </a>
                    </Button>
                  ) : (
                    <Button 
                      size="lg" 
                      onClick={() => handleRegister()} 
                      disabled={registering || isRegistered || isFull || event.status === 'cancelled'} 
                      className="w-full h-14 rounded-xl font-bold text-base mt-4"
                    >
                      {registering ? <Loader2 className="animate-spin w-5 h-5" /> : isRegistered ? (
                        <span className="flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Registered</span>
                      ) : isFull ? (
                        <span className="flex items-center gap-2">Sold Out</span>
                      ) : (
                        <span className="flex items-center gap-2"><Ticket className="w-5 h-5" /> Register Now</span>
                      )}
                    </Button>
                  )}
                  
                  {isRegistered && !isExternal && (
                    <div className="bg-emerald-500/10 text-emerald-600 p-3 rounded-xl text-xs font-medium flex items-start gap-2">
                       <Info className="w-4 h-4 shrink-0 mt-0.5" />
                       <p>You're all set! We'll send you an email reminder before the event starts.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ACTION BUTTONS */}
              <div className="flex gap-4">
                <Button variant="outline" className="flex-1 rounded-xl h-12 border-border shadow-sm"><Share2 className="w-4 h-4 mr-2 text-muted-foreground" /> Share</Button>
                <Button variant="outline" className="flex-1 rounded-xl h-12 border-border shadow-sm"><Heart className="w-4 h-4 mr-2 text-muted-foreground" /> Save</Button>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* CHATBOT FLOATING WIDGET */}
      {showChatbot ? (
        <div className="fixed bottom-10 right-4 sm:right-10 z-50 w-full sm:w-[420px] max-w-[calc(100vw-2rem)] shadow-2xl animate-in slide-in-from-right-10 duration-500">
          <EventChatbot 
            event={{
              id: event.id, title: event.title, description: event.description,
              date: new Date(event.startDate).toLocaleDateString(), location: locationDisplay,
              category: event.category, agenda: event.agenda,
            } as any}
            onClose={() => setShowChatbot(false)}
          />
        </div>
      ) : (
        <ChatbotTrigger onClick={() => setShowChatbot(true)} />
      )}
    </div>
  );
}
