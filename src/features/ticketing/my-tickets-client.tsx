'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { EventTicket } from '@/types';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  MapPin,
  Clock,
  Ticket,
  QrCode,
  Download,
  MoreVertical,
  XCircle,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Activity,
  UserCheck
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isPast, isToday } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '@/hooks/use-toast';
import { cancelRegistration } from '@/app/actions/registrations';
import { cn } from '@/core/utils/utils';
import Link from 'next/link';

const getTicketEventDate = (ticket: EventTicket): Date => {
  if (ticket.event?.startDate) return new Date(ticket.event.startDate);
  return new Date();
};

function TicketStatusBadge({ status }: { status: EventTicket['status'] }) {
  const statusConfig = {
    'confirmed': { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-500 border-none' },
    'pending': { label: 'Pending', className: 'bg-amber-500/10 text-amber-500 border-none' },
    'checked-in': { label: 'Checked In', className: 'bg-notion-primary/10 text-notion-primary border-none' },
    'cancelled': { label: 'Cancelled', className: 'bg-red-500/10 text-red-500 border-none' },
    'refunded': { label: 'Refunded', className: 'bg-zinc-500/10 text-zinc-500 border-none' },
    'expired': { label: 'Expired', className: 'bg-red-500/10 text-red-500 border-none' },
  };
  const config = statusConfig[status] || statusConfig['pending'];
  return <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0", config.className)}>{config.label}</Badge>;
}

function TicketCard({ ticket, onViewTicket, onPrint, onCancel }: { 
  ticket: EventTicket; 
  onViewTicket: (ticket: EventTicket) => void; 
  onPrint: (ticket: EventTicket) => void;
  onCancel: (ticket: EventTicket) => void;
}) {
  const eventDate = getTicketEventDate(ticket);
  const isCancellable = ticket.status !== 'cancelled' && ticket.status !== 'refunded' && ticket.status !== 'expired' && !isPast(eventDate);

  return (
    <Card className="border-notion-hairline bg-white dark:bg-zinc-950 hover:shadow-notion-elevated transition-all duration-500 rounded-[1.5rem] overflow-hidden group">
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row h-full">
           {/* LEFT: VISUAL */}
           <div className="relative w-full md:w-48 h-48 md:h-auto bg-notion-canvas-soft border-b md:border-b-0 md:border-r border-notion-hairline overflow-hidden shrink-0">
              {ticket.event?.imageUrl ? (
                 <Image src={ticket.event.imageUrl} fill className="object-cover group-hover:scale-105 transition-transform duration-1000" alt="" />
              ) : (
                 <div className="w-full h-full flex items-center justify-center">
                    <Ticket className="w-10 h-10 text-notion-ink-faint/20" />
                 </div>
              )}
              <div className="absolute inset-0 bg-black/5" />
           </div>

           {/* RIGHT: DETAILS */}
           <div className="flex-1 p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                 <div className="flex justify-between items-start">
                    <TicketStatusBadge status={ticket.status} />
                    <button className="text-notion-ink-faint hover:text-notion-ink transition-colors">
                       <MoreVertical className="w-4 h-4" />
                    </button>
                 </div>
                 <h3 className="text-xl font-display font-bold text-notion-ink leading-tight">{ticket.event?.title || 'System Node'}</h3>
               <div className="grid grid-cols-2 gap-4 text-[11px] font-bold text-notion-ink-muted uppercase tracking-widest">
                     <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-notion-primary" />
                        <span>{format(eventDate, 'MMM do, yyyy')}</span>
                     </div>
                     <div className="flex items-center gap-2">
                        <QrCode className="w-3.5 h-3.5 text-notion-primary" />
                        <span className="truncate">{ticket.ticketNumber}</span>
                     </div>
                  </div>
                  {(ticket as any).entryCode && (
                    <div className="mt-3 p-3 bg-notion-canvas-soft rounded-lg border border-notion-hairline text-center">
                      <p className="text-[9px] font-black text-notion-ink-faint uppercase tracking-[0.2em] mb-1">Entry Code</p>
                      <p className="font-mono text-xl font-black text-notion-ink tracking-[0.3em]">{(ticket as any).entryCode}</p>
                    </div>
                  )}
              </div>

              <div className="flex items-center gap-3 pt-5 border-t border-notion-hairline/50">
                 <Button size="sm" className="rounded-xl font-black px-6 h-9 shadow-sm" onClick={() => onViewTicket(ticket)}>
                    Launch Pass
                 </Button>
                 <Button size="icon" variant="outline" className="rounded-xl border-notion-hairline h-9 w-9 shadow-sm" onClick={() => onPrint(ticket)}>
                    <Download className="w-4 h-4 text-notion-ink-faint" />
                 </Button>

                 {isCancellable && (
                   <DropdownMenu>
                     <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 w-9 p-0 ml-auto rounded-xl hover:bg-red-50 text-notion-ink-faint hover:text-red-500"><XCircle className="w-4 h-4" /></Button>
                     </DropdownMenuTrigger>
                     <DropdownMenuContent className="bg-white dark:bg-zinc-950 border-notion-hairline rounded-xl shadow-notion-elevated">
                        <DropdownMenuItem onClick={() => onCancel(ticket)} className="text-red-600 font-bold text-xs uppercase tracking-widest p-3">
                           De-synchronize Access
                        </DropdownMenuItem>
                     </DropdownMenuContent>
                   </DropdownMenu>
                 )}
              </div>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MyTicketsClient({ initialTickets = [] }: { initialTickets?: any[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<EventTicket | null>(null);

  const [tickets, setTickets] = useState<EventTicket[]>(
    initialTickets.map((t: any) => ({
      ...(t.ticket || t),
      event: t.event || t.ticket?.event || {},
      id: t.id || t.ticket?.id
    }))
  );

  const handleCancel = async (ticket: EventTicket) => {
    if (!confirm('Confirm de-synchronization? This will revoke your infrastructure access immediately.')) return;
    try {
      const result: any = await cancelRegistration(ticket.id);
      if (result.success) {
        toast({ title: "Sync Revoked", description: "Infrastructure access has been terminated." });
        setTickets(tickets.map(t => t.id === ticket.id ? { ...t, status: 'cancelled' } : t));
      }
    } catch (e: any) {
      toast({ title: "Operation Failed", variant: "destructive" });
    }
  };

  const handlePrint = (ticket: EventTicket) => {
    // Standard high-fidelity PDF print
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const eventDate = getTicketEventDate(ticket);
    printWindow.document.write(`
      <html>
        <head>
          <title>Access Token - ${ticket.event?.title}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; background: #f6f5f4; color: #1a1a1a; display: flex; justify-content: center; }
            .ticket { width: 400px; background: #fff; border: 1px solid #e6e6e6; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.05); }
            .header { padding: 32px; background: #0075de; color: #fff; text-align: center; }
            .content { padding: 32px; space-y: 24px; }
            .title { font-size: 24px; font-weight: 800; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: -0.02em; line-height: 1.1; }
            .meta { display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 32px; }
            .label { font-size: 10px; font-weight: 900; text-transform: uppercase; color: #a39e98; letter-spacing: 0.1em; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 700; }
            .qr-zone { background: #f6f5f4; padding: 32px; display: flex; flex-col; items-center; justify-center; border-top: 1px dashed #e6e6e6; text-align: center; }
            .footer { padding: 16px; font-size: 9px; font-weight: 800; text-transform: uppercase; color: #a39e98; text-align: center; letter-spacing: 0.2em; }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
               <div style="font-size: 10px; font-weight: 900; letter-spacing: 0.3em; margin-bottom: 12px;">ACCESS TOKEN</div>
               <h1 class="title">${ticket.event?.title}</h1>
               <div style="font-size: 12px; opacity: 0.8; font-weight: 600;">Authorized Personnel: ${user?.name}</div>
            </div>
            <div class="content">
               <div class="meta">
                  <div><div class="label">Sync Coordinate</div><div class="value">${ticket.event?.location?.venue || 'Virtual Mesh'}</div></div>
                  <div><div class="label">Temporal Point</div><div class="value">${format(eventDate, 'PPPP')}</div></div>
               </div>
            </div>
            <div class="qr-zone">
               <div id="qrcode"></div>
               <div style="margin-top: 24px; font-family: monospace; font-size: 16px; font-weight: 800; letter-spacing: 0.2em;">${ticket.ticketNumber}</div>
            </div>
            <div class="footer">Verified by Eventra Protocol</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
          <script>
            window.onload = function() {
              var typeNumber = 4;
              var errorCorrectionLevel = 'H';
              var qr = qrcode(typeNumber, errorCorrectionLevel);
              qr.addData('${ticket.ticketNumber}');
              qr.make();
              document.getElementById('qrcode').innerHTML = qr.createImgTag(5);
              setTimeout(() => { window.print(); window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filterTickets = (tab: string) => {
    return tickets.filter(ticket => {
      const eventDate = getTicketEventDate(ticket);
      if (tab === 'upcoming') return !isPast(eventDate) || isToday(eventDate);
      return isPast(eventDate) && !isToday(eventDate);
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-24 px-6 md:px-10">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-notion-hairline pb-10">
        <div className="space-y-3 text-left">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-notion-canvas border-notion-hairline text-notion-ink-faint font-bold px-3 py-0.5 rounded-md shadow-sm uppercase text-[9px] tracking-widest">
                Network Passes
              </Badge>
           </div>
           <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-notion-ink uppercase">
             My <span className="text-notion-primary italic">Tickets.</span>
           </h1>
           <p className="text-lg text-notion-ink-muted font-medium max-w-2xl leading-relaxed">
             Access your digital tokens and synchronize with upcoming event nodes in the Eventra mesh.
           </p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-10">
        <TabsList className="bg-muted/30 p-1.5 rounded-2xl border border-notion-hairline w-fit">
          <TabsTrigger value="upcoming" className="rounded-xl px-8 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-notion-surface dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <UserCheck className="w-3.5 h-3.5 mr-2" /> Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="rounded-xl px-8 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-notion-surface dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <Activity className="w-3.5 h-3.5 mr-2" /> Past Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="m-0 focus:outline-none">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {filterTickets('upcoming').length > 0 ? (
               filterTickets('upcoming').map(t => (
                 <TicketCard key={t.id} ticket={t} onViewTicket={setSelectedTicket} onPrint={handlePrint} onCancel={handleCancel} />
               ))
            ) : (
               <div className="col-span-full py-32 text-center bg-notion-canvas-soft/50 rounded-[2.5rem] border-2 border-dashed border-notion-hairline space-y-6">
                  <div className="w-16 h-16 bg-white dark:bg-zinc-950 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-notion-hairline">
                     <QrCode className="w-8 h-8 text-notion-ink-faint/30" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-bold tracking-tight text-notion-ink">No Tokens Active</h3>
                     <p className="text-sm text-notion-ink-muted font-medium max-w-xs mx-auto">Explore the network to find and sync with your next experience.</p>
                  </div>
                  <Button asChild variant="outline" size="sm" className="rounded-xl font-bold px-8 h-10 shadow-sm bg-notion-surface hover:bg-zinc-50">
                    <Link href="/explore">Scan Network</Link>
                  </Button>
               </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="past" className="m-0 focus:outline-none">
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
             {filterTickets('past').map(t => (
               <TicketCard key={t.id} ticket={t} onViewTicket={setSelectedTicket} onPrint={handlePrint} onCancel={handleCancel} />
             ))}
           </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="bg-white dark:bg-zinc-950 text-notion-ink border-notion-hairline p-0 overflow-hidden rounded-[2.5rem] max-w-md">
           <div className="bg-notion-primary p-12 text-center text-notion-on-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
              <Badge variant="outline" className="text-white border-white/20 mb-6 uppercase text-[10px] font-black tracking-widest px-3 py-0.5">Verification Ready</Badge>
              <h3 className="text-3xl font-display font-black leading-tight tracking-tighter uppercase mb-2">{selectedTicket?.event?.title}</h3>
              <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Authorized Access Point</p>
           </div>
           <div className="p-10 flex flex-col items-center space-y-10">
              <div className="bg-notion-surface p-6 rounded-[2.5rem] shadow-2xl ring-1 ring-black/5">
                 <QRCodeSVG value={selectedTicket?.ticketNumber || ''} size={220} level="H" />
              </div>
               <div className="w-full space-y-8">
                  <div className="text-center space-y-2">
                     <p className="text-[10px] font-black text-notion-ink-faint uppercase tracking-[0.2em]">Security Key</p>
                     <p className="font-mono text-xl font-black text-notion-ink tracking-[0.3em]">{selectedTicket?.ticketNumber}</p>
                  </div>
                  {(selectedTicket as any)?.entryCode && (
                    <div className="text-center space-y-2 p-4 bg-notion-canvas-soft rounded-xl border border-notion-hairline">
                      <p className="text-[10px] font-black text-notion-ink-faint uppercase tracking-[0.2em]">Entry Code</p>
                      <p className="font-mono text-2xl font-black text-primary tracking-[0.4em]">{(selectedTicket as any).entryCode}</p>
                      <p className="text-[9px] text-notion-ink-faint">Use at check-in desk for quick entry</p>
                    </div>
                  )}
                 <div className="flex gap-4">
                    <Button className="flex-1 rounded-xl h-14 font-black uppercase text-[11px] tracking-widest shadow-notion-soft" onClick={() => selectedTicket && handlePrint(selectedTicket)}>
                       <Download className="mr-3 w-4 h-4" /> Download PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl h-14 px-6 border-notion-hairline" onClick={() => setSelectedTicket(null)}>
                       Close
                    </Button>
                 </div>
              </div>
           </div>
           <div className="bg-notion-canvas-soft py-4 text-center border-t border-notion-hairline">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-notion-ink-faint flex items-center justify-center gap-2">
                 <ShieldCheck size={10} /> Verified by Eventra Protocol
              </p>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
