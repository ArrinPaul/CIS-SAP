'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Camera,
  Search,
  RefreshCw,
  Eye,
  Trash2,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getPendingMedia, moderateMedia, toggleMediaVisibility } from '@/app/actions/media';
import Image from 'next/image';
import { cn } from '@/core/utils/utils';

interface MediaItem {
  id: string;
  url: string;
  caption: string | null;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface MediaModerationProps {
  eventId: string;
  eventTitle: string;
}

export function MediaModerationClient({ eventId, eventTitle }: MediaModerationProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadPending = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getPendingMedia(eventId);
      setPending(data as any);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const handleAction = async (mediaId: string, action: 'approve' | 'reject') => {
    setProcessingId(mediaId);
    try {
      await moderateMedia(mediaId, action);
      setPending(prev => prev.filter(m => m.id !== mediaId));
      toast({ 
        title: action === 'approve' ? "Photo Approved" : "Photo Rejected",
        description: action === 'approve' ? "It is now visible in the live gallery." : "The photo has been permanently removed."
      });
    } catch (e) {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black italic">MEDIA MODERATION</h1>
          <p className="text-muted-foreground">Review community photos for <span className="text-foreground font-bold">{eventTitle}</span></p>
        </div>
        <div className="flex gap-3">
           <Button variant="outline" className="border-border" onClick={loadPending}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh
           </Button>
           <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-4 py-2">
              {pending.length} PENDING REVIEW
           </Badge>
        </div>
      </div>

      {loading ? (
        <div className="py-32 text-center"><Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" /></div>
      ) : loadError ? (
        <LoadError what="media" onRetry={loadPending} />
      ) : pending.length === 0 ? (
        <Card className="bg-card border-border text-center py-32 border-2 border-dashed">
           <CardContent>
              <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-black text-muted-foreground uppercase italic">Inbox Zero</h3>
              <p className="text-sm text-gray-600 mt-1">All community photos have been moderated.</p>
           </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pending.map((media) => (
            <Card key={media.id} className="bg-card border-border overflow-hidden group">
               <div className="relative aspect-video">
                  <Image src={media.url} alt="pending" fill className="object-cover" />
                  <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                     <Button variant="ghost" className="text-foreground" asChild>
                        <a href={media.url} target="_blank"><Eye className="mr-2 h-4 w-4" /> View Full</a>
                     </Button>
                  </div>
               </div>
               <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-3">
                     <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                        {media.author.name?.[0] || 'U'}
                     </div>
                     <div>
                        <p className="text-sm font-bold truncate">{media.author.name || 'Anonymous'}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{media.author.email}</p>
                     </div>
                  </div>

                  {media.caption && (
                    <p className="text-xs text-muted-foreground italic line-clamp-2">"{media.caption}"</p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                     <Button 
                       className="bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold h-10"
                       onClick={() => handleAction(media.id, 'approve')}
                       disabled={!!processingId}
                     >
                       {processingId === media.id ? <Loader2 className="animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                       APPROVE
                     </Button>
                     <Button 
                       variant="ghost" 
                       className="text-destructive hover:text-red-300 hover:bg-red-400/10 font-bold h-10"
                       onClick={() => handleAction(media.id, 'reject')}
                       disabled={!!processingId}
                     >
                       {processingId === media.id ? <Loader2 className="animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                       REJECT
                     </Button>
                  </div>
               </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
