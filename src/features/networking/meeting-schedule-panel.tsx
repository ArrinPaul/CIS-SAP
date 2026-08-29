'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Check, 
  X, 
  Coffee, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getUserMeetings, respondToMeeting, cancelMeeting } from '@/app/actions/meetings';
import { cn } from '@/core/utils/utils';

export function MeetingSchedulePanel({ eventId }: { eventId?: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incoming' | 'confirmed' | 'outgoing'>('confirmed');
  const [meetingsData, setMeetingsData] = useState<{
    incoming: any[];
    outgoing: any[];
    confirmed: any[];
  }>({
    incoming: [],
    outgoing: [],
    confirmed: [],
  });

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const res = await getUserMeetings(eventId);
      if (res.success) {
        setMeetingsData({
          incoming: res.incoming || [],
          outgoing: res.outgoing || [],
          confirmed: res.confirmed || [],
        });
      }
    } catch (e) {
      console.warn('Failed to load user meetings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [eventId]);

  const handleRespond = async (meetingId: string, action: 'accept' | 'decline') => {
    try {
      const res = await respondToMeeting(meetingId, action);
      if (res.success) {
        toast({
          title: action === 'accept' ? 'Meeting Confirmed! 🎉' : 'Meeting Declined',
          description: action === 'accept' ? 'Added to your confirmed schedule.' : 'Request dismissed.',
        });
        loadMeetings();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (meetingId: string) => {
    try {
      const res = await cancelMeeting(meetingId);
      if (res.success) {
        toast({ title: 'Meeting Cancelled' });
        loadMeetings();
      }
    } catch (e: any) {
      toast({ title: 'Cancel Failed', variant: 'destructive' });
    }
  };

  return (
    <Card className="rounded-3xl border-border shadow-sm overflow-hidden font-sans">
      <CardHeader className="border-b border-border bg-muted/20 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">1-on-1 Meeting Schedule</CardTitle>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
                Speed Networking
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Manage your private 15 & 30-minute peer meetings and speaker coffee chats.
            </CardDescription>
          </div>

          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList className="bg-muted rounded-xl p-1">
              <TabsTrigger value="confirmed" className="rounded-lg text-xs">
                Confirmed ({meetingsData.confirmed.length})
              </TabsTrigger>
              <TabsTrigger value="incoming" className="rounded-lg text-xs">
                Requests ({meetingsData.incoming.filter(m => m.status === 'pending').length})
              </TabsTrigger>
              <TabsTrigger value="outgoing" className="rounded-lg text-xs">
                Sent ({meetingsData.outgoing.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading schedule...
          </div>
        ) : (
          <div>
            {/* TAB 1: CONFIRMED MEETINGS */}
            {activeTab === 'confirmed' && (
              <div className="space-y-4">
                {meetingsData.confirmed.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Coffee className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No confirmed 1-on-1 meetings yet</p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Click "Book 1-on-1" on any attendee or speaker card to schedule your first meeting.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {meetingsData.confirmed.map((m) => {
                      const otherUser = m.requester?.name ? m.requester : m.recipient;
                      const startTime = new Date(m.startTime);

                      return (
                        <div key={m.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <Avatar className="w-10 h-10 border border-border">
                              <AvatarImage src={otherUser?.image} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                {otherUser?.name?.substring(0, 2).toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-foreground">{m.title}</span>
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                  Confirmed
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Meeting with <strong className="text-foreground">{otherUser?.name}</strong> • {m.durationMinutes} mins
                              </p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5 text-primary" />
                                  {startTime.toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-primary" />
                                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="flex items-center gap-1">
                                  {m.meetingType === 'virtual' ? <Video className="w-3.5 h-3.5 text-cyan-500" /> : <MapPin className="w-3.5 h-3.5 text-amber-500" />}
                                  {m.locationDetails || (m.meetingType === 'virtual' ? 'Virtual Video Room' : 'Venue Lounge')}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {m.meetingType === 'virtual' && (
                              <Button size="sm" asChild className="rounded-xl gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white">
                                <Link href={`/events/${m.eventId}/stage`}>
                                  <Video className="w-3.5 h-3.5" /> Join Room
                                </Link>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(m.id)}
                              className="text-xs text-muted-foreground hover:text-red-500"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INCOMING REQUESTS */}
            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {meetingsData.incoming.filter(m => m.status === 'pending').length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground">You have no pending 1-on-1 meeting requests.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {meetingsData.incoming.filter(m => m.status === 'pending').map((m) => (
                      <div key={m.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarImage src={m.requester?.image} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {m.requester?.name?.substring(0, 2).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-foreground">{m.title}</span>
                            <p className="text-xs text-muted-foreground">
                              Requested by <strong className="text-foreground">{m.requester?.name}</strong>
                            </p>
                            {m.message && (
                              <p className="text-xs text-foreground/80 bg-muted/40 p-2 rounded-lg italic">
                                "{m.message}"
                              </p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                              <span>{new Date(m.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              <span>({m.durationMinutes} mins)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleRespond(m.id, 'accept')}
                            className="rounded-xl gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRespond(m.id, 'decline')}
                            className="rounded-xl gap-1 text-xs"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SENT REQUESTS */}
            {activeTab === 'outgoing' && (
              <div className="space-y-4">
                {meetingsData.outgoing.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <Users className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-semibold text-foreground">No sent requests</p>
                    <p className="text-xs text-muted-foreground">Browse matches and book 1-on-1 chats.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {meetingsData.outgoing.map((m) => (
                      <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-foreground">{m.title}</p>
                          <p className="text-xs text-muted-foreground">
                            To <strong className="text-foreground">{m.recipient?.name}</strong> • {new Date(m.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </div>

                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px] capitalize",
                            m.status === 'accepted' && "border-emerald-500/30 text-emerald-600 bg-emerald-500/10",
                            m.status === 'pending' && "border-amber-500/30 text-amber-600 bg-amber-500/10",
                            m.status === 'declined' && "border-red-500/30 text-red-600 bg-red-500/10"
                          )}
                        >
                          {m.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
