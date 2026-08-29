'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles, 
  Users, 
  Download, 
  Loader2, 
  Mic2, 
  Layers, 
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CalendarExportButton } from './calendar-export-button';
import { getEventAgenda, toggleSessionBookmark } from '@/app/actions/agenda';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';

interface MultiTrackAgendaProps {
  eventId: string;
  eventTitle?: string;
  initialSessions?: any[];
  initialTracks?: string[];
}

export const sessionTypeStyles: Record<string, { bg: string; text: string; label: string }> = {
  keynote: { bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', text: 'text-amber-500', label: 'Keynote' },
  talk: { bg: 'bg-primary/10 text-primary border-primary/20', text: 'text-primary', label: 'Tech Talk' },
  workshop: { bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', text: 'text-emerald-500', label: 'Workshop' },
  panel: { bg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', text: 'text-indigo-500', label: 'Panel' },
  networking: { bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20', text: 'text-rose-500', label: 'Networking' },
  break: { bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20', text: 'text-slate-400', label: 'Break' },
};

export function MultiTrackAgenda({
  eventId,
  eventTitle = 'Conference Schedule',
  initialSessions = [],
  initialTracks = [],
}: MultiTrackAgendaProps) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>(initialSessions);
  const [tracks, setTracks] = useState<string[]>(initialTracks);
  const [loading, setLoading] = useState(initialSessions.length === 0);
  const [selectedTrack, setSelectedTrack] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);

  const loadAgenda = async () => {
    setLoading(true);
    try {
      const res = await getEventAgenda(eventId);
      if (res.success) {
        setSessions(res.sessions);
        setTracks(res.tracks);
      }
    } catch (e) {
      console.warn('Failed to load agenda', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSessions.length === 0) {
      loadAgenda();
    }
  }, [eventId]);

  const handleToggleBookmark = async (sessionId: string) => {
    try {
      const res = await toggleSessionBookmark(sessionId);
      if (res.success) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? {
                  ...s,
                  isBookmarked: res.isBookmarked,
                  bookmarkCount: res.isBookmarked ? s.bookmarkCount + 1 : Math.max(0, s.bookmarkCount - 1),
                }
              : s
          )
        );
        toast({
          title: res.isBookmarked ? 'Session Bookmarked! ⭐' : 'Bookmark Removed',
          description: res.isBookmarked ? 'Added to your personal conference agenda.' : undefined,
        });
      }
    } catch (e: any) {
      toast({ title: 'Error bookmarking session', description: e.message, variant: 'destructive' });
    }
  };

  // Filter sessions
  const filteredSessions = sessions.filter((s) => {
    const matchesTrack = selectedTrack === 'all' || s.track === selectedTrack;
    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.speakerName && s.speakerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.roomLocation && s.roomLocation.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBookmark = !onlyBookmarked || s.isBookmarked;

    return matchesTrack && matchesSearch && matchesBookmark;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-2xl border border-border">
        
        {/* SEARCH */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions, speakers, rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl text-xs"
          />
        </div>

        {/* TRACK PILLS & BOOKMARK FILTER */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => { setSelectedTrack('all'); setOnlyBookmarked(false); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
              selectedTrack === 'all' && !onlyBookmarked
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 hover:bg-muted text-muted-foreground"
            )}
          >
            All Tracks ({sessions.length})
          </button>

          {tracks.map((track) => (
            <button
              key={track}
              onClick={() => { setSelectedTrack(track); setOnlyBookmarked(false); }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
                selectedTrack === track && !onlyBookmarked
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              )}
            >
              {track}
            </button>
          ))}

          <button
            onClick={() => setOnlyBookmarked(!onlyBookmarked)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shrink-0 flex items-center gap-1.5",
              onlyBookmarked
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-muted/40 hover:bg-muted text-muted-foreground"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" /> My Saved ({sessions.filter(s => s.isBookmarked).length})
          </button>
        </div>

        {/* CALENDAR EXPORT BULK */}
        <CalendarExportButton
          allSessions={filteredSessions}
          eventTitle={eventTitle}
          className="rounded-xl text-xs gap-1.5 font-semibold shrink-0"
        />
      </div>

      {/* SESSIONS LIST / GRID */}
      {loading ? (
        <div className="p-16 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" /> Loading agenda tracks...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-border bg-muted/10 space-y-3">
          <Calendar className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="text-base font-semibold text-foreground">No sessions found</p>
          <p className="text-xs text-muted-foreground">
            {onlyBookmarked ? 'You have not saved any sessions yet.' : 'Try adjusting your search filters or track selection.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => {
            const typeStyle = sessionTypeStyles[session.sessionType] || sessionTypeStyles.talk;
            const startTimeStr = format(new Date(session.startTime), 'h:mm a');
            const endTimeStr = format(new Date(session.endTime), 'h:mm a');

            return (
              <Card 
                key={session.id} 
                className={cn(
                  "rounded-2xl border-border hover:border-primary/40 transition-all duration-200 overflow-hidden shadow-sm group",
                  session.isBookmarked && "border-amber-500/30 bg-amber-500/[0.02]"
                )}
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  
                  {/* TIME & TRACK COLUMN */}
                  <div className="md:w-44 shrink-0 space-y-1.5 border-b md:border-b-0 md:border-r border-border pb-3 md:pb-0 md:pr-4">
                    <div className="flex items-center gap-1.5 text-sm font-bold text-foreground font-mono">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{startTimeStr} - {endTimeStr}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {session.track}
                    </Badge>
                  </div>

                  {/* SESSION DETAILS */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={cn("text-[10px] font-bold uppercase tracking-widest border", typeStyle.bg, typeStyle.text)}>
                        {typeStyle.label}
                      </Badge>
                      <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {session.title}
                      </h4>
                    </div>

                    {session.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                        {session.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                      {session.speakerName && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-6 h-6 border border-border">
                            <AvatarImage src={session.speakerAvatar || undefined} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                              {session.speakerName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-foreground">
                            {session.speakerName} {session.speakerTitle ? `(${session.speakerTitle})` : ''}
                          </span>
                        </div>
                      )}

                      {session.roomLocation && (
                        <span className="flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> {session.roomLocation}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      variant={session.isBookmarked ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToggleBookmark(session.id)}
                      className={cn(
                        "rounded-xl text-xs gap-1.5 font-semibold",
                        session.isBookmarked ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                      )}
                    >
                      {session.isBookmarked ? (
                        <><BookmarkCheck className="w-3.5 h-3.5" /> Saved</>
                      ) : (
                        <><Bookmark className="w-3.5 h-3.5" /> Save</>
                      )}
                    </Button>

                    <CalendarExportButton session={session} eventTitle={eventTitle} />
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
