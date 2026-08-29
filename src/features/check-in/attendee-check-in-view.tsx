'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, QrCode, Ticket, ArrowLeft, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface AttendeeCheckInViewProps {
  registrations: any[];
  isOrganizer: boolean;
}

export default function AttendeeCheckInView({ registrations, isOrganizer }: AttendeeCheckInViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const hasTickets = registrations.length > 0;
  const currentReg = hasTickets ? registrations[currentIndex] : null;
  const ticket = currentReg?.ticket;
  const event = currentReg?.event;

  const qrData = ticket?.qrCode || ticket?.ticketNumber || 'NO-TICKET';
  
  const nextTicket = () => {
    if (currentIndex < registrations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const prevTicket = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div className="container py-8 max-w-2xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline mb-2">{isOrganizer ? 'Check-in Desk' : 'My Check-in'}</h1>
          <p className="text-muted-foreground">
            {isOrganizer ? 'Scan attendee QR codes or view your own tickets.' : 'Present your QR code at the check-in desk.'}
          </p>
        </div>
        {isOrganizer && (
          <Button asChild>
            <Link href="/check-in-scanner">
              <QrCode className="mr-2 h-4 w-4" /> Go to Scanner
            </Link>
          </Button>
        )}
      </div>
      
      {!hasTickets ? (
        <Card className="text-center py-12 glass-effect border-dashed">
          <CardContent className="flex flex-col items-center gap-4">
            <Ticket className="h-12 w-12 text-muted-foreground opacity-20" />
            <h2 className="text-xl font-semibold">No active registrations</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">
              You haven&apos;t registered for any upcoming events yet.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/explore">Explore Events</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {registrations.length > 1 && (
            <div className="flex justify-between items-center bg-card/50 p-2 rounded-lg border border-border">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={prevTicket} 
                disabled={currentIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Previous
              </Button>
              <span className="text-sm font-medium">
                Ticket {currentIndex + 1} of {registrations.length}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={nextTicket} 
                disabled={currentIndex === registrations.length - 1}
              >
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          <Card className="w-full text-center glass-effect shadow-2xl overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-purple-500 to-cyan-500" />
            <CardHeader>
              <CardTitle className="font-headline flex items-center justify-center gap-2 text-2xl">
                <QrCode className="text-primary" /> {event?.title || 'Event Ticket'}
              </CardTitle>
              <CardDescription className="pt-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest",
                  ticket?.status === 'checked-in' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'
                )}>
                  {ticket?.status === 'checked-in' ? '✓ Checked In' : '• Ready for Check-in'}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-8 pb-10">
              <div className="p-6 bg-notion-surface rounded-2xl shadow-inner-lg border-4 border-muted/20">
                <QRCodeSVG
                  value={qrData}
                  size={240}
                  level="H"
                  includeMargin={false}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-8 w-full max-w-sm text-left">
                <div>
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Ticket Number</p>
                  <p className="font-mono text-lg font-bold text-foreground">{ticket?.ticketNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Type</p>
                  <p className="text-lg font-bold text-foreground">Standard</p>
                </div>
              </div>

              <div className="w-full pt-6 border-t border-border/50 text-xs text-muted-foreground italic">
                {ticket?.status === 'checked-in' 
                  ? `Validated on ${new Date(ticket.updatedAt).toLocaleString()}`
                  : 'Show this code to the event staff for entry.'
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}
