'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Globe, 
  Briefcase, 
  Sparkles, 
  Send, 
  ExternalLink, 
  Play, 
  Tag, 
  MapPin, 
  Check, 
  Loader2,
  Gift
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { captureSponsorLead, tierBadgeStyles, SponsorTier } from '@/app/actions/sponsors';
import { cn } from '@/core/utils/utils';

export interface SponsorBoothData {
  id: string;
  eventId: string;
  name: string;
  tier: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  websiteUrl?: string | null;
  careersUrl?: string | null;
  description?: string | null;
  demoVideoUrl?: string | null;
  promoOffer?: string | null;
  boothNumber?: string | null;
  leadCount?: number;
}

interface SponsorBoothDialogProps {
  sponsor: SponsorBoothData;
  trigger?: React.ReactNode;
}

export function SponsorBoothDialog({ sponsor, trigger }: SponsorBoothDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [droppingCard, setDroppingCard] = useState(false);
  const [cardDropped, setCardDropped] = useState(false);

  const tierStyle = tierBadgeStyles[sponsor.tier as SponsorTier] || tierBadgeStyles.gold;

  const handleDropCard = async () => {
    setDroppingCard(true);
    try {
      const res = await captureSponsorLead(sponsor.id);
      if (res.success) {
        setCardDropped(true);
        toast({
          title: 'Business Card Dropped! 📇',
          description: res.message || `Your contact info was shared with ${sponsor.name}.`,
        });
      } else {
        toast({ title: 'Connection Failed', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setDroppingCard(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-semibold">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Visit Booth
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border-border">
        
        {/* BANNER HEADER */}
        <div className="relative h-36 w-full bg-gradient-to-r from-slate-900 via-primary/30 to-slate-900 overflow-hidden flex items-center justify-center">
          {sponsor.bannerUrl ? (
            <img 
              src={sponsor.bannerUrl} 
              alt={sponsor.name} 
              className="w-full h-full object-cover opacity-80" 
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-background to-secondary/20 flex items-center justify-center">
              <Building2 className="w-16 h-16 text-muted-foreground/20" />
            </div>
          )}

          {/* TOP RIGHT TIER BADGE */}
          <div className="absolute top-4 right-4">
            <Badge className={cn("font-black tracking-widest text-[10px] uppercase border shadow-md", tierStyle.bg, tierStyle.text, tierStyle.border)}>
              {tierStyle.label}
            </Badge>
          </div>

          {/* BOOTH NUMBER */}
          {sponsor.boothNumber && (
            <div className="absolute bottom-3 right-4 bg-background/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-border text-[11px] font-mono font-bold flex items-center gap-1">
              <MapPin className="w-3 h-3 text-primary" /> {sponsor.boothNumber}
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          
          {/* HEADER INFO */}
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16 border-2 border-border shadow-md -mt-12 bg-card">
              <AvatarImage src={sponsor.logoUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                {sponsor.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1 flex-1">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{sponsor.name}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {sponsor.websiteUrl && (
                  <a
                    href={sponsor.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary transition-colors text-primary font-medium"
                  >
                    <Globe className="w-3.5 h-3.5" /> Visit Website <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {sponsor.careersUrl && (
                  <a
                    href={sponsor.careersUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-emerald-500 transition-colors text-emerald-500 font-medium"
                  >
                    <Briefcase className="w-3.5 h-3.5" /> We're Hiring!
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* ABOUT / DESCRIPTION */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">About the Exhibitor</h4>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {sponsor.description || 'Welcome to our virtual booth! Explore our solutions, connect with our engineering team, and unlock exclusive attendee discounts.'}
            </p>
          </div>

          {/* EXCLUSIVE PERK / PROMO OFFER */}
          {sponsor.promoOffer && (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Gift className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-500 uppercase tracking-wide">Booth Perk / Special Offer</p>
                <p className="text-xs text-foreground/90 font-medium">{sponsor.promoOffer}</p>
              </div>
            </div>
          )}

          {/* DEMO VIDEO IF PRESENT */}
          {sponsor.demoVideoUrl && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-primary" /> Product Demo & Teaser
              </h4>
              <div className="rounded-2xl overflow-hidden border border-border bg-slate-950 aspect-video flex items-center justify-center">
                <iframe
                  src={sponsor.demoVideoUrl}
                  title={`${sponsor.name} Demo`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* ACTIONS */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              size="lg"
              onClick={handleDropCard}
              disabled={droppingCard || cardDropped}
              className={cn(
                "w-full sm:flex-1 rounded-xl font-bold gap-2 shadow-sm",
                cardDropped ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
              )}
            >
              {droppingCard ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : cardDropped ? (
                <><Check className="w-4 h-4" /> Card Dropped & Shared</>
              ) : (
                <><Send className="w-4 h-4" /> Drop Digital Business Card</>
              )}
            </Button>

            {sponsor.careersUrl && (
              <Button
                variant="outline"
                size="lg"
                asChild
                className="w-full sm:w-auto rounded-xl gap-2 text-xs font-semibold"
              >
                <a href={sponsor.careersUrl} target="_blank" rel="noopener noreferrer">
                  <Briefcase className="w-4 h-4 text-emerald-500" /> View Open Roles
                </a>
              </Button>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
