'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Share2, Gift, Send, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export function ReferralSystem() {
  const { toast } = useToast();
  const [copied, setCopying] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const referralCode = "MESH-X12";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopying(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <Card className="border-notion-hairline bg-white dark:bg-zinc-950 shadow-notion-soft overflow-hidden group">
      <CardContent className="p-8 space-y-8">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <Badge variant="outline" className="bg-notion-accent-sky/10 text-notion-accent-sky border-none text-[9px] font-black uppercase tracking-widest px-2 py-0">Network Growth</Badge>
              <h3 className="text-lg font-bold">Referral Program</h3>
           </div>
           <div className="w-10 h-10 rounded-xl bg-notion-canvas-soft flex items-center justify-center border border-notion-hairline group-hover:rotate-12 transition-transform">
              <Gift className="w-5 h-5 text-notion-ink-faint" />
           </div>
        </div>

        <div className="p-6 rounded-2xl bg-notion-canvas-soft/50 border border-notion-hairline space-y-4">
           <p className="text-[10px] font-black uppercase tracking-widest text-notion-ink-faint">Your Invite Code</p>
           <div className="flex items-center gap-3">
              <div className="flex-1 font-mono text-lg font-black tracking-widest text-notion-ink">
                 {referralCode}
              </div>
              <Button size="icon" variant="ghost" onClick={handleCopy} className="h-10 w-10 rounded-xl border border-notion-hairline hover:bg-notion-surface transition-all shadow-sm">
                 {copied ? <Check className="w-4 h-4 text-notion-accent-green" /> : <Copy className="w-4 h-4" />}
              </Button>
           </div>
        </div>

        <div className="space-y-4">
           <p className="text-xs font-medium text-notion-ink-muted leading-relaxed">Expand the network. Both you and your referral earn <span className="text-notion-primary font-bold">250 XP</span> upon their first node sync.</p>
           <div className="flex gap-2">
              <Input 
                 placeholder="Enter friend's code..." 
                 value={inputCode}
                 onChange={(e) => setInputCode(e.target.value)}
                 className="rounded-xl border-notion-hairline bg-notion-canvas-soft/50 h-10 text-xs font-bold uppercase tracking-widest focus:bg-notion-surface transition-all"
              />
              <Button size="sm" className="rounded-xl px-4 font-bold shadow-sm">
                 <Send className="w-3.5 h-3.5 mr-2" /> Join
              </Button>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}
