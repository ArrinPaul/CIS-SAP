'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Ticket,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { claimWaitlistSpot } from '@/app/actions/registrations';
import { cn } from '@/core/utils/utils';

interface WaitlistClaimClientProps {
  eventId: string;
  eventTitle: string;
  reservation: {
    expiresAt: Date;
  };
}

export function WaitlistClaimClient({ eventId, eventTitle, reservation }: WaitlistClaimClientProps) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = new Date(reservation.expiresAt).getTime() - now;

      if (distance < 0) {
        setTimeLeft("EXPIRED");
        clearInterval(timer);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [reservation.expiresAt]);

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await claimWaitlistSpot(eventId);
      if (res.success) {
        setIsClaimed(true);
        setTicketNumber((res as any).ticketNumber || null);
        toast({ title: "Spot Claimed!", description: "Your ticket is now active." });
      } else {
        toast({
          title: 'Claim Failed',
          description: (res as any).error || 'Unable to claim this reservation',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({ title: "Claim Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsClaiming(false);
    }
  };

  if (isClaimed) {
    return (
      <Card className="max-w-md mx-auto bg-emerald-950/20 border-emerald-500/30 text-foreground text-center py-12">
        <CardContent className="space-y-6">
          <div className="relative inline-block">
             <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full" />
             <CheckCircle2 className="h-20 w-20 text-emerald-500 relative z-10 mx-auto" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black">Ticket Secured!</h2>
            <p className="text-emerald-100/70">You're officially going to {eventTitle}.</p>
            <div className="mt-4 p-3 bg-background/40 rounded-lg border border-border/50 font-mono text-primary">
               {ticketNumber}
            </div>
          </div>
          <Button asChild className="bg-emerald-600 hover:bg-emerald-500 border-none">
            <a href="/tickets">View My Tickets</a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-xl mx-auto bg-card border-border text-foreground overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-cyan-500 to-purple-500" />
      <CardHeader className="text-center pb-8 border-b border-border/50">
        <Badge className="w-fit mx-auto mb-4 bg-primary/10 text-primary border-cyan-500/20">Action Required</Badge>
        <CardTitle className="text-3xl font-black italic">YOU'RE IN!</CardTitle>
        <CardDescription className="text-muted-foreground">A spot has opened up for <span className="text-foreground font-bold">{eventTitle}</span></CardDescription>
      </CardHeader>
      
      <CardContent className="p-8 space-y-8">
        <div className="flex flex-col items-center gap-4 py-6 px-4 bg-background/40 rounded-2xl border border-border/50">
           <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">Reservation Expires In</p>
           <div className="flex items-center gap-3">
              <Timer className={cn("h-8 w-8", timeLeft === 'EXPIRED' ? "text-destructive" : "text-amber-400")} />
              <span className={cn("text-4xl font-black font-mono", timeLeft === 'EXPIRED' ? "text-destructive" : "text-foreground")}>
                {timeLeft}
              </span>
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-none">
                 <ShieldCheck className="text-primary h-5 w-5" />
              </div>
              <div>
                 <p className="text-sm font-bold text-foreground">Guaranteed Spot</p>
                 <p className="text-xs text-muted-foreground">This spot is reserved exclusively for you. No one else can take it until the timer runs out.</p>
              </div>
           </div>
           <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center flex-none">
                 <Ticket className="text-purple-400 h-5 w-5" />
              </div>
              <div>
                 <p className="text-sm font-bold text-foreground">Instant Confirmation</p>
                 <p className="text-xs text-muted-foreground">Claiming your spot will immediately generate your digital QR ticket.</p>
              </div>
           </div>
        </div>
      </CardContent>

      <CardFooter className="p-8 bg-white/[0.02] border-t border-border/50 flex flex-col gap-4">
         <Button 
           className="w-full h-14 text-lg font-black bg-notion-surface text-black hover:bg-cyan-50 transition-all shadow-xl shadow-white/5"
           onClick={handleClaim}
           disabled={isClaiming || timeLeft === 'EXPIRED'}
         >
           {isClaiming ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" />}
           CLAIM MY TICKET NOW
         </Button>
         <p className="text-[10px] text-center text-gray-600 uppercase font-bold tracking-widest">
           Once expired, this spot will be offered to the next person in line.
         </p>
      </CardFooter>
    </Card>
  );
}
