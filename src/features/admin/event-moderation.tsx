'use client';

import React, { useEffect, useState } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// // 
import { useToast } from '@/hooks/use-toast';
import { Check, X, ShieldAlert, Loader2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { listModerationEvents, moderateEventStatus } from '@/app/actions/admin';

export default function EventModeration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadEvents = async (pageNum: number, isNewTab: boolean = false) => {
    setLoading(true);
    setLoadError(false);
    try {
      const rows = await listModerationEvents({
        status: activeTab === 'pending' ? 'draft' : 'all',
        page: pageNum,
        pageSize
      });
      
      if (isNewTab) {
        setEvents(rows);
      } else {
        setEvents(prev => [...prev, ...rows]);
      }
      
      setHasMore(rows.length === pageSize);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadEvents(1, true);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadEvents(nextPage);
  };

  const handleModerate = async (eventId: string, action: 'approve' | 'reject' | 'suspend') => {
    try {
      await moderateEventStatus(eventId, action);
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId
            ? { ...event, status: action === 'approve' ? 'published' : action === 'reject' ? 'cancelled' : 'draft' }
            : event
        )
      );
      toast({ title: `Event ${action}ed` });
    } catch (e) {
      toast({ title: 'Moderation failed', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 text-foreground pb-10">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Event Moderation</h2>
        <p className="text-muted-foreground">Review and moderate published events for community safety</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border-border text-foreground p-1">
          <TabsTrigger value="pending" className="gap-2"><Clock size={16} /> Needs Review</TabsTrigger>
          <TabsTrigger value="all" className="gap-2"><ShieldAlert size={16} /> All Events</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          {loadError && events.length === 0 && !loading ? (
            <LoadError what="events" onRetry={() => loadEvents(1, true)} />
          ) : events.length === 0 && !loading ? (
            <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-2xl bg-card">
              <Check size={48} className="mx-auto mb-4 opacity-20" />
              <p>No events found for moderation.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((e: any) => (
                <Card key={e.id} className="bg-card border-border text-foreground overflow-hidden hover:border-primary/30 transition-all">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">{e.category}</Badge>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground border-border">{e.status}</Badge>
                        </div>
                        <h3 className="text-xl font-bold">{e.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground pt-2 font-mono">
                          <span>By: {e.organizerId}</span>
                          <span>Capacity: {e.capacity}</span>
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2 justify-end min-w-[120px]">
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-500" 
                          onClick={() => handleModerate(e.id, 'approve')}
                          disabled={e.status === 'published'}
                        >
                          <Check className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-500/30 text-destructive hover:bg-destructive/10"
                          onClick={() => handleModerate(e.id, 'reject')}
                        >
                          <X className="w-4 h-4 mr-2" /> Reject
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => handleModerate(e.id, 'suspend')}
                        >
                          <ShieldAlert className="w-4 h-4 mr-2" /> Suspend
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {hasMore && !loading && (
                <div className="flex justify-center pt-2">
                  <Button variant="outline" className="border-border" onClick={loadMore}>
                    Load More Events
                  </Button>
                </div>
              )}

              {loading && (
                <div className="py-4 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" /></div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

