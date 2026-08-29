'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Globe, 
  Sparkles, 
  Search, 
  MapPin, 
  Gift, 
  Briefcase, 
  Crown,
  Filter
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SponsorBoothDialog, SponsorBoothData } from './sponsor-booth-dialog';
import { tierBadgeStyles, SponsorTier } from '@/core/utils/sponsors';
import { cn } from '@/core/utils/utils';

interface ExpoHallGridProps {
  sponsors: SponsorBoothData[];
}

export function ExpoHallGrid({ sponsors }: ExpoHallGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  const filtered = sponsors.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.promoOffer && s.promoOffer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTier = selectedTier === 'all' || s.tier === selectedTier;
    return matchesSearch && matchesTier;
  });

  const titleAndPlatinum = filtered.filter(s => s.tier === 'title' || s.tier === 'platinum');
  const goldAndSilver = filtered.filter(s => s.tier === 'gold' || s.tier === 'silver');
  const bronzeAndCommunity = filtered.filter(s => s.tier === 'bronze' || s.tier === 'community');

  return (
    <div className="space-y-8 font-sans">
      
      {/* EXPO HALL CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/60 p-4 rounded-2xl border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exhibitors, perks, technologies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'title', 'platinum', 'gold', 'silver', 'community'].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shrink-0",
                selectedTier === tier
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              )}
            >
              {tier === 'all' ? `All (${sponsors.length})` : tier}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-dashed border-border bg-muted/10 space-y-3">
          <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <p className="text-base font-semibold text-foreground">No exhibitors match your filter</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or selecting another tier.</p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* SECTION 1: TITLE & PLATINUM SPOTLIGHT */}
          {titleAndPlatinum.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Premier Spotlight Exhibitors
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {titleAndPlatinum.map((sponsor) => {
                  const style = tierBadgeStyles[sponsor.tier as SponsorTier] || tierBadgeStyles.gold;
                  return (
                    <Card key={sponsor.id} className="rounded-3xl border-border overflow-hidden hover:border-primary/40 transition-all duration-300 shadow-sm group bg-gradient-to-b from-card to-card/80">
                      {sponsor.bannerUrl && (
                        <div className="h-32 w-full overflow-hidden relative">
                          <img src={sponsor.bannerUrl} alt={sponsor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <Badge className={cn("absolute top-3 right-3 text-[10px] font-black uppercase tracking-widest", style.bg, style.text, style.border)}>
                            {style.label}
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-12 h-12 border border-border bg-background shadow-sm">
                              <AvatarImage src={sponsor.logoUrl || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {sponsor.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">{sponsor.name}</h4>
                              {sponsor.boothNumber && (
                                <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-primary" /> {sponsor.boothNumber}
                                </p>
                              )}
                            </div>
                          </div>

                          {!sponsor.bannerUrl && (
                            <Badge className={cn("text-[10px] font-black uppercase tracking-widest", style.bg, style.text, style.border)}>
                              {style.label}
                            </Badge>
                          )}
                        </div>

                        {sponsor.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {sponsor.description}
                          </p>
                        )}

                        {sponsor.promoOffer && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 font-medium flex items-center gap-2">
                            <Gift className="w-4 h-4 shrink-0" />
                            <span className="line-clamp-1">{sponsor.promoOffer}</span>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between gap-3">
                          <SponsorBoothDialog sponsor={sponsor} />
                          {sponsor.careersUrl && (
                            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                              <Briefcase className="w-3 h-3" /> Hiring
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: GOLD & SILVER EXHIBITORS */}
          {goldAndSilver.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Featured Partners & Sponsors
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {goldAndSilver.map((sponsor) => {
                  const style = tierBadgeStyles[sponsor.tier as SponsorTier] || tierBadgeStyles.gold;
                  return (
                    <Card key={sponsor.id} className="rounded-2xl border-border overflow-hidden hover:border-primary/40 transition-all shadow-sm group">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <Avatar className="w-10 h-10 border border-border">
                            <AvatarImage src={sponsor.logoUrl || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                              {sponsor.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <Badge className={cn("text-[9px] font-bold uppercase", style.bg, style.text, style.border)}>
                            {sponsor.tier}
                          </Badge>
                        </div>

                        <div>
                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{sponsor.name}</h4>
                          {sponsor.boothNumber && (
                            <p className="text-[11px] text-muted-foreground font-mono">{sponsor.boothNumber}</p>
                          )}
                        </div>

                        {sponsor.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {sponsor.description}
                          </p>
                        )}

                        <div className="pt-2">
                          <SponsorBoothDialog sponsor={sponsor} />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 3: BRONZE & COMMUNITY PARTNERS */}
          {bronzeAndCommunity.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Community & Ecosystem Partners
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {bronzeAndCommunity.map((sponsor) => (
                  <Card key={sponsor.id} className="rounded-xl border-border p-4 text-center hover:border-primary/30 transition-all">
                    <Avatar className="w-10 h-10 border border-border mx-auto mb-2">
                      <AvatarImage src={sponsor.logoUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                        {sponsor.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-bold text-foreground line-clamp-1">{sponsor.name}</p>
                    <SponsorBoothDialog
                      sponsor={sponsor}
                      trigger={
                        <button className="text-[10px] text-primary hover:underline mt-1">
                          View Booth
                        </button>
                      }
                    />
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
