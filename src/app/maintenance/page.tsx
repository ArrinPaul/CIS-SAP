import React from 'react';
import { ShieldAlert, Clock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-foreground">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto border border-red-500/20 shadow-lg shadow-red-500/5">
             <ShieldAlert className="w-12 h-12 text-red-500 animate-pulse" />
          </div>
          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-lg">SYSTEM LOCK</div>
        </div>

        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight font-headline">Scheduled Maintenance</h1>
          <p className="text-muted-foreground leading-relaxed">
            The Eventra mesh is currently undergoing a structural update. 
            Access is temporarily restricted to ensure data integrity during the deployment phase.
          </p>
        </div>

        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-4">
           <div className="flex items-center justify-center gap-4 text-sm font-bold">
              <div className="flex items-center gap-2">
                 <Clock className="w-4 h-4 text-primary" />
                 <span>Est. uptime: 2 hours</span>
              </div>
           </div>
           <div className="pt-4 flex flex-col gap-2">
              <Button asChild className="rounded-xl font-bold bg-notion-surface text-black hover:bg-zinc-200">
                 <Link href="mailto:support@eventra.app">Contact Operations</Link>
              </Button>
              <Button variant="ghost" asChild className="text-xs text-muted-foreground hover:text-white">
                 <Link href="/">Try reconnecting</Link>
              </Button>
           </div>
        </div>

        <div className="pt-8">
           <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em]">Eventra Intelligence Engine • v1.0.4</p>
        </div>
      </div>
    </div>
  );
}
