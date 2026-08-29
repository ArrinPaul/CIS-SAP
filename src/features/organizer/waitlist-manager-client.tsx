'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  ArrowUpCircle, 
  Clock, 
  CheckCircle2, 
  Loader2,
  Search,
  Mail,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getWaitlistForEvent, manualPromoteAttendee } from '@/app/actions/waitlist';
import Image from 'next/image';

interface WaitlistEntry {
  id: string;
  position: number;
  status: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface WaitlistManagerProps {
  eventId: string;
  eventTitle: string;
  capacity: number;
  registeredCount: number;
}

export function WaitlistManagerClient({ eventId, eventTitle, capacity, registeredCount }: WaitlistManagerProps) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isPromoting, setIsPromoting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadWaitlist = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      // We'll create this action next
      const data = await getWaitlistForEvent(eventId);
      setEntries(data as any);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadWaitlist();
  }, [loadWaitlist]);

  const handlePromote = async (userId: string) => {
    setIsPromoting(userId);
    try {
      await manualPromoteAttendee(eventId, userId);
      toast({ title: "Attendee Promoted", description: "A ticket has been created and sent." });
      loadWaitlist();
    } catch (error: any) {
      toast({ title: "Promotion Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsPromoting(null);
    }
  };

  const filteredEntries = entries.filter(e => 
    e.user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (e.user.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const availableSpots = Math.max(0, capacity - registeredCount);

  return (
    <div className="space-y-8 text-foreground">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full"><Clock className="text-amber-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">On Waitlist</p>
              <p className="text-2xl font-black">{entries.filter(e => e.status === 'waiting').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full"><UserCheck className="text-emerald-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Available Spots</p>
              <p className="text-2xl font-black">{availableSpots}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full"><CheckCircle2 className="text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Promoted</p>
              <p className="text-2xl font-black">{entries.filter(e => e.status === 'promoted').length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border text-foreground overflow-hidden">
        <CardHeader className="border-b border-border/50 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Waitlist Queue</CardTitle>
              <CardDescription>Attendees waiting for a spot in {eventTitle}</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Search queue..." 
                className="w-full pl-9 bg-card border border-border rounded-md h-10 text-sm outline-none focus:ring-1 focus:ring-cyan-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
          ) : loadError ? (
            <LoadError what="the waitlist" onRetry={loadWaitlist} />
          ) : (
            <div className="divide-y divide-white/5">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-card transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded bg-card text-xs font-bold text-muted-foreground">
                      #{entry.position}
                    </div>
                    <div className="relative h-10 w-10 rounded-full bg-cyan-900/20 overflow-hidden">
                      {entry.user.image ? (
                        <Image src={entry.user.image} fill className="object-cover" alt="" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-primary">
                          {(entry.user.name || entry.user.email)[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{entry.user.name || 'Attendee'}</p>
                      <p className="text-xs text-muted-foreground">{entry.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {entry.status === 'promoted' ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Promoted</Badge>
                    ) : (
                      <Button 
                        size="sm"
                        variant="outline" 
                        className="border-primary/30 text-primary hover:bg-primary/10"
                        onClick={() => handlePromote(entry.user.id)}
                        disabled={isPromoting === entry.user.id}
                      >
                        {isPromoting === entry.user.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpCircle size={16} className="mr-2" />}
                        Promote Now
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {filteredEntries.length === 0 && (
                <div className="py-20 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-10" />
                  <p>Waitlist is empty.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
