'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  MapPin, 
  Mic2, 
  Layers, 
  Sparkles, 
  Loader2, 
  Check 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  createAgendaSession, 
  getEventAgenda, 
  deleteAgendaSession 
} from '@/app/actions/agenda';
import { sessionTypeStyles } from '@/features/agenda/multi-track-agenda';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';

interface AgendaManagerProps {
  initialEvents?: { id: string; title: string }[];
  defaultEventId?: string;
}

export default function AgendaManager({
  initialEvents = [],
  defaultEventId,
}: AgendaManagerProps) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId || initialEvents[0]?.id || '');
  const [sessions, setSessions] = useState<any[]>([]);
  const [tracks, setTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [track, setTrack] = useState('Main Stage');
  const [sessionType, setSessionType] = useState<any>('talk');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('10:45');
  const [speakerName, setSpeakerName] = useState('');
  const [speakerTitle, setSpeakerTitle] = useState('');
  const [roomLocation, setRoomLocation] = useState('Auditorium A');
  const [description, setDescription] = useState('');

  const loadAgenda = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await getEventAgenda(eventId);
      if (res.success) {
        setSessions(res.sessions);
        setTracks(res.tracks);
      }
    } catch (e) {
      toast({ title: 'Failed to load agenda', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadAgenda(selectedEventId);
    }
  }, [selectedEventId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (endDateTime <= startDateTime) {
      toast({ title: 'Invalid Times', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    setIsCreating(true);
    try {
      const res = await createAgendaSession({
        eventId: selectedEventId,
        title: title.trim(),
        track: track.trim(),
        sessionType,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        speakerName: speakerName.trim() || undefined,
        speakerTitle: speakerTitle.trim() || undefined,
        roomLocation: roomLocation.trim() || undefined,
        description: description.trim() || undefined,
      });

      if (res.success && res.session) {
        toast({ title: 'Session Created! 📅', description: `${res.session.title} added to ${res.session.track}.` });
        setSessions([...sessions, res.session]);
        setDialogOpen(false);
        // Reset
        setTitle('');
        setDescription('');
        setSpeakerName('');
        setSpeakerTitle('');
      } else {
        toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    try {
      const res = await deleteAgendaSession(sessionId);
      if (res.success) {
        setSessions(sessions.filter((s) => s.id !== sessionId));
        toast({ title: 'Session Deleted' });
      }
    } catch (e) {
      toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Multi-Track Agenda Studio</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 font-mono text-[11px]">
              <Sparkles className="w-3 h-3" /> iCalendar Sync
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Build parallel multi-track conference schedules, assign speakers and stages, and enable calendar syncing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {initialEvents.length > 1 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-56 rounded-xl">
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent>
                {initialEvents.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-xl font-bold gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Add Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Add Conference Session</DialogTitle>
                  <DialogDescription>
                    Configure track room, speaker, start/end timestamps, and topic notes.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-3">
                  {/* TITLE */}
                  <div className="space-y-1.5">
                    <Label htmlFor="session-title">Session Title</Label>
                    <Input
                      id="session-title"
                      placeholder="e.g. Keynote: The Future of Agentic AI"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* TRACK & SESSION TYPE */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="track-name">Track / Stage</Label>
                      <Input
                        id="track-name"
                        placeholder="e.g. Main Stage, Track 1 (AI)"
                        value={track}
                        onChange={(e) => setTrack(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Session Type</Label>
                      <Select value={sessionType} onValueChange={setSessionType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="keynote">Keynote</SelectItem>
                          <SelectItem value="talk">Tech Talk</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="panel">Panel Discussion</SelectItem>
                          <SelectItem value="networking">Networking</SelectItem>
                          <SelectItem value="break">Break / Lunch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* DATE & TIMESTAMPS */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-date">Date</Label>
                      <Input
                        id="s-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="s-start">Start Time</Label>
                      <Input
                        id="s-start"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="s-end">End Time</Label>
                      <Input
                        id="s-end"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* SPEAKER NAME & TITLE */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="spk-name">Speaker Name</Label>
                      <Input
                        id="spk-name"
                        placeholder="e.g. Dr. Alex Vance"
                        value={speakerName}
                        onChange={(e) => setSpeakerName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="spk-title">Speaker Role / Company</Label>
                      <Input
                        id="spk-title"
                        placeholder="e.g. VP of AI @ Google"
                        value={speakerTitle}
                        onChange={(e) => setSpeakerTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* ROOM LOCATION */}
                  <div className="space-y-1.5">
                    <Label htmlFor="room-loc">Room / Stage Location</Label>
                    <Input
                      id="room-loc"
                      placeholder="e.g. Grand Ballroom • Level 2"
                      value={roomLocation}
                      onChange={(e) => setRoomLocation(e.target.value)}
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="space-y-1.5">
                    <Label htmlFor="s-desc">Abstract / Description</Label>
                    <Textarea
                      id="s-desc"
                      placeholder="Session summary and takeaways..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating} className="gap-2">
                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />} Save Session
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SESSIONS LIST */}
      <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg">Configured Agenda Sessions ({sessions.length})</CardTitle>
          <CardDescription>Sessions organized across tracks for live attendees.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-base font-semibold text-foreground">No sessions scheduled yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add keynote talks, breakout workshops, and networking blocks to build your conference agenda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sessions.map((s) => {
                const typeStyle = sessionTypeStyles[s.sessionType] || sessionTypeStyles.talk;
                const startStr = format(new Date(s.startTime), 'h:mm a');
                const endStr = format(new Date(s.endTime), 'h:mm a');

                return (
                  <div key={s.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-md">
                          {startStr} - {endStr}
                        </span>
                        <Badge className={cn("text-[10px] font-bold uppercase", typeStyle.bg, typeStyle.text)}>
                          {typeStyle.label}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                          {s.track}
                        </Badge>
                        <h4 className="text-sm font-bold text-foreground">{s.title}</h4>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {s.speakerName && (
                          <span>Speaker: <strong className="text-foreground">{s.speakerName}</strong> {s.speakerTitle ? `(${s.speakerTitle})` : ''}</span>
                        )}
                        {s.roomLocation && (
                          <span>Location: {s.roomLocation}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id)}
                        className="text-muted-foreground hover:text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
