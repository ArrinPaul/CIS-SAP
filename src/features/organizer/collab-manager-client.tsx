'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffManagerClient } from './staff-manager-client';
import { GuestListManagerClient } from './guest-list-manager-client';
import { ShieldCheck, UserCheck, ArrowLeft, BadgeCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface CollabManagerProps {
  eventId: string;
  eventTitle: string;
  ticketTiers: any[];
}

export function CollabManagerClient({ eventId, eventTitle, ticketTiers }: CollabManagerProps) {
  const router = useRouter();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-24 px-6 md:px-10">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-notion-hairline pb-10">
        <div className="space-y-3 text-left">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-notion-canvas border-notion-hairline text-notion-ink-faint font-bold px-3 py-0.5 rounded-md shadow-sm uppercase text-[9px] tracking-widest">
                Team Operations
              </Badge>
           </div>
           <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-notion-ink uppercase">
             Collaboration <span className="text-notion-primary italic">Hub.</span>
           </h1>
           <p className="text-lg text-notion-ink-muted font-medium max-w-2xl leading-relaxed">
             Orchestrate your team and synchronize the guest list for <span className="text-notion-ink font-bold">{eventTitle}</span>.
           </p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="rounded-xl h-11 px-6 font-bold text-xs gap-2 border-notion-hairline hover:bg-notion-surface shadow-sm transition-all">
           <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>
      </header>

      <Tabs defaultValue="staff" className="space-y-10">
        <TabsList className="bg-muted/30 p-1.5 rounded-2xl border border-notion-hairline w-fit">
          <TabsTrigger value="staff" className="rounded-xl px-8 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-notion-surface dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Event Staff
          </TabsTrigger>
          <TabsTrigger value="guests" className="rounded-xl px-8 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-notion-surface dark:data-[state=active]:bg-zinc-950 data-[state=active]:shadow-sm data-[state=active]:text-primary transition-all">
            <UserCheck className="w-3.5 h-3.5 mr-2" /> Guest Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="staff" className="m-0 focus:outline-none">
          <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-notion-hairline shadow-notion-soft overflow-hidden">
             <div className="p-8 border-b border-notion-hairline bg-notion-canvas-soft/30 flex items-center justify-between">
                <div className="space-y-1">
                   <h3 className="text-xl font-bold tracking-tight text-notion-ink">Active Personnel</h3>
                   <p className="text-sm font-medium text-notion-ink-muted uppercase tracking-widest text-[10px]">Permission nodes currently online</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 font-bold text-[9px] uppercase tracking-widest">
                   System Nominal
                </Badge>
             </div>
             <div className="p-8">
                <StaffManagerClient eventId={eventId} eventTitle={eventTitle} />
             </div>
          </div>
        </TabsContent>

        <TabsContent value="guests" className="m-0 focus:outline-none">
          <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-notion-hairline shadow-notion-soft overflow-hidden">
             <div className="p-8 border-b border-notion-hairline bg-notion-canvas-soft/30 flex items-center justify-between">
                <div className="space-y-1">
                   <h3 className="text-xl font-bold tracking-tight text-notion-ink">Guest List Synchronization</h3>
                   <p className="text-sm font-medium text-notion-ink-muted uppercase tracking-widest text-[10px]">Upload and validate attendee access tokens</p>
                </div>
                <div className="flex gap-1">
                   {[1, 2, 3].map(i => <div key={i} className="w-1 h-3 rounded-full bg-notion-primary/20 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
                </div>
             </div>
             <div className="p-8">
                <GuestListManagerClient eventId={eventId} eventTitle={eventTitle} ticketTiers={ticketTiers} />
             </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
