'use client';

import React from 'react';
import { 
  Star, 
  TrendingUp, 
  Smile, 
  Meh, 
  Frown, 
  Quote, 
  CheckCircle2, 
  Sparkles 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { NpsSummary, FeedbackAverages } from '@/core/utils/nps-analytics';
import { cn } from '@/core/utils/utils';

interface NpsAnalyticsCardProps {
  npsSummary: NpsSummary;
  averages: FeedbackAverages;
  testimonials?: Array<{
    id: string;
    userName: string;
    userRole?: string | null;
    rating: number;
    quote: string;
  }>;
}

export function NpsAnalyticsCard({
  npsSummary,
  averages,
  testimonials = [],
}: NpsAnalyticsCardProps) {
  const {
    nps,
    totalResponses,
    promoterCount,
    passiveCount,
    detractorCount,
    promoterPercentage,
    passivePercentage,
    detractorPercentage,
    statusLabel,
  } = npsSummary;

  const getNpsBadgeColor = (status: string) => {
    switch (status) {
      case 'World Class':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Excellent':
        return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'Good':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Needs Improvement':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default:
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* TOP SUMMARY GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* NPS GAUGE */}
        <Card className="rounded-3xl border-border shadow-sm bg-gradient-to-br from-card via-card to-muted/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Net Promoter Score (NPS)
              </span>
              <Badge className={cn("text-[10px] font-bold uppercase tracking-wider border", getNpsBadgeColor(statusLabel))}>
                {statusLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-extrabold tracking-tight text-foreground font-mono">
                {nps > 0 ? `+${nps}` : nps}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                from {totalResponses} survey responses
              </span>
            </div>

            {/* SEGMENT BAR */}
            <div className="space-y-1.5">
              <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted">
                <div style={{ width: `${promoterPercentage}%` }} className="bg-emerald-500 transition-all" title={`Promoters: ${promoterPercentage}%`} />
                <div style={{ width: `${passivePercentage}%` }} className="bg-amber-400 transition-all" title={`Passives: ${passivePercentage}%`} />
                <div style={{ width: `${detractorPercentage}%` }} className="bg-rose-500 transition-all" title={`Detractors: ${detractorPercentage}%`} />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Promoters ({promoterCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Passives ({passiveCount})
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> Detractors ({detractorCount})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* OVERALL RATING CARD */}
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Overall Satisfaction
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-4xl font-extrabold text-foreground font-mono">
                {averages.overallRating > 0 ? averages.overallRating.toFixed(1) : '—'}
              </span>
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "w-4 h-4",
                      s <= Math.round(averages.overallRating) ? "fill-amber-400" : "fill-transparent text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>5 Stars</span>
                <span>{averages.ratingDistribution[5] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>4 Stars</span>
                <span>{averages.ratingDistribution[4] || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>1-3 Stars</span>
                <span>{(averages.ratingDistribution[1] || 0) + (averages.ratingDistribution[2] || 0) + (averages.ratingDistribution[3] || 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CATEGORY BREAKDOWN */}
        <Card className="rounded-3xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Experience Pillars
            </span>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>Venue & Stages</span>
                <span className="font-bold text-foreground">{averages.venueRating ? `${averages.venueRating} / 5` : '—'}</span>
              </div>
              <Progress value={(averages.venueRating / 5) * 100} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>Speakers & Content</span>
                <span className="font-bold text-foreground">{averages.contentRating ? `${averages.contentRating} / 5` : '—'}</span>
              </div>
              <Progress value={(averages.contentRating / 5) * 100} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span>Schedule & Organization</span>
                <span className="font-bold text-foreground">{averages.organizationRating ? `${averages.organizationRating} / 5` : '—'}</span>
              </div>
              <Progress value={(averages.organizationRating / 5) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* VERIFIED TESTIMONIALS */}
      {testimonials.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Quote className="w-4 h-4 text-primary" /> Attendee Testimonials ({testimonials.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {testimonials.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-foreground/90 italic leading-relaxed">
                  "{t.quote}"
                </p>
                <div className="text-[11px] font-medium text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
                  <span>{t.userName}</span>
                  <span className="text-[10px] text-emerald-500 font-bold">Verified Attendee</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
