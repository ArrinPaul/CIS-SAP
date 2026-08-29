'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  QrCode, 
  Navigation,
  Clock,
  Star,
  X,
  Download,
  ExternalLink,
  Zap
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import type { EventraEvent } from '@/types';
import { format, isPast, isFuture, isToday, differenceInHours, differenceInMinutes } from 'date-fns';

interface MyEventCardProps {
  event: EventraEvent;
  variant?: 'upcoming' | 'past' | 'wishlist';
  onRemoveWishlist?: (eventId: string) => void;
  onRate?: (eventId: string, rating: number) => void;
}

export function MyEventCard({ 
  event, 
  variant = 'upcoming',
  onRemoveWishlist,
  onRate
}: MyEventCardProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const parseDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (dateVal instanceof Date) return dateVal;
    return new Date(dateVal);
  };

  const displayDate = parseDate(event.startDate);
  const eventImage = event.imageUrl || event.image;
  const venueName = typeof event.location?.venue === 'string'
    ? event.location?.venue
    : event.location?.venue?.name || (typeof event.location === 'string' ? event.location : '') || 'Virtual Platform';

  const getLiveStatus = () => {
    const now = new Date();
    const eventDate = displayDate;
    const endDate = event.endDate ? parseDate(event.endDate) : new Date(eventDate.getTime() + 3 * 60 * 60 * 1000);

    if (now >= eventDate && now <= endDate) {
      return { label: 'Live Now', className: 'bg-red-500 text-white animate-pulse', icon: <div className="w-1.5 h-1.5 rounded-full bg-notion-surface mr-2" /> };
    }
    if (isPast(endDate)) {
      return { label: 'Ended', className: 'bg-muted text-muted-foreground', icon: null };
    }
    const hoursUntil = differenceInHours(eventDate, now);
    if (hoursUntil < 24 && hoursUntil >= 0) {
      return { label: 'Incoming', className: 'bg-primary text-primary-foreground', icon: <Clock className="w-3 h-3 mr-2" /> };
    }
    return null;
  };

  const liveStatus = variant === 'upcoming' ? getLiveStatus() : null;

  const handleRating = (stars: number) => {
    setRating(stars);
    onRate?.(event.id, stars);
  };

  return (
    <div className="group h-full bg-background border border-border/80 rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col hover:-translate-y-1">
      {/* IMAGE AREA */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted m-3 rounded-[2rem]">
        {eventImage ? (
          <Image 
            src={eventImage} 
            alt={event.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-1000"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center">
             <Zap className="w-12 h-12 text-primary/10" />
          </div>
        )}
        
        {liveStatus && (
          <div className="absolute top-4 left-4">
            <Badge className={cn('font-black uppercase tracking-widest text-[9px] px-3 py-1 border-none shadow-lg', liveStatus.className)}>
              {liveStatus.icon}
              {liveStatus.label}
            </Badge>
          </div>
        )}

        {variant === 'wishlist' && (
          <Button
            size="icon"
            variant="secondary"
            className="absolute top-4 right-4 h-10 w-10 rounded-2xl bg-background/80 backdrop-blur-md border-none opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
            onClick={(e) => {
              e.preventDefault();
              onRemoveWishlist?.(event.id);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="absolute bottom-4 left-4">
          <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none font-black text-[9px] uppercase tracking-widest px-3 py-1 rounded-full">
            {event.category}
          </Badge>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="p-8 pt-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <Link href={`/events/${event.id}`}>
            <h3 className="text-2xl font-display font-bold tracking-tight text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
              {event.title}
            </h3>
          </Link>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{format(displayDate, 'MMM d, yyyy · h:mm a')}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="truncate">{venueName}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col gap-4">
          {variant === 'past' && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Your Rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform active:scale-90"
                  >
                    <Star 
                      className={cn(
                        "h-4 w-4",
                        (hoverRating >= star || rating >= star)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {variant === 'upcoming' && (
              <>
                <Button asChild className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-notion-soft border-none transition-all active:scale-95">
                  <Link href={`/tickets?event=${event.id}`}>
                    <QrCode className="h-4 w-4 mr-2" />
                    View Ticket
                  </Link>
                </Button>
                <Button variant="outline" className="w-12 h-12 rounded-xl border-2 hover:bg-muted" asChild>
                  <Link href={`/events/${event.id}`}>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </>
            )}

            {variant === 'past' && (
              <>
                <Button asChild variant="outline" className="flex-1 h-12 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] hover:bg-muted">
                  <Link href={`/certificates/${event.id}`}>
                    <Download className="h-4 w-4 mr-2" />
                    Get Cert
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1 h-12 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] hover:bg-muted">
                  <Link href={`/events/${event.id}#photos`}>
                    Media
                  </Link>
                </Button>
              </>
            )}

            {variant === 'wishlist' && (
              <>
                <Button asChild className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] shadow-notion-soft border-none transition-all active:scale-95">
                  <Link href={`/events/${event.id}`}>
                    Register Now
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

