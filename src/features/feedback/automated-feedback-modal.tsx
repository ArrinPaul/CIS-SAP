'use client';

import React, { useState } from 'react';
import { 
  Star, 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Heart, 
  Smile, 
  Meh, 
  Frown 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { submitPostEventFeedback } from '@/app/actions/post-event-feedback';
import { cn } from '@/core/utils/utils';

interface AutomatedFeedbackModalProps {
  eventId: string;
  eventTitle: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}

export function AutomatedFeedbackModal({
  eventId,
  eventTitle,
  isOpen,
  onOpenChange,
  onSubmitted,
}: AutomatedFeedbackModalProps) {
  const { toast } = useToast();

  const [rating, setRating] = useState<number>(5);
  const [npsScore, setNpsScore] = useState<number | null>(10);
  const [venueRating, setVenueRating] = useState<number>(5);
  const [contentRating, setContentRating] = useState<number>(5);
  const [orgRating, setOrgRating] = useState<number>(5);
  const [highlight, setHighlight] = useState('');
  const [improvement, setImprovement] = useState('');
  const [allowTestimonial, setAllowTestimonial] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await submitPostEventFeedback({
        eventId,
        rating,
        npsScore: npsScore ?? undefined,
        venueRating,
        contentRating,
        organizationRating: orgRating,
        highlight: highlight.trim() || undefined,
        improvement: improvement.trim() || undefined,
        allowTestimonial,
      });

      if (res.success) {
        setSubmitted(true);
        toast({ title: 'Feedback Recorded! 🎉', description: res.message });
        if (onSubmitted) onSubmitted();
        setTimeout(() => {
          onOpenChange(false);
        }, 2000);
      } else {
        toast({ title: 'Submission Failed', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error submitting feedback', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (current: number, setter: (val: number) => void) => (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setter(star)}
          className="p-1 text-muted-foreground/40 hover:text-amber-400 hover:scale-110 transition-transform"
        >
          <Star
            className={cn(
              "w-6 h-6 transition-colors",
              star <= current ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto font-sans rounded-3xl">
        {submitted ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5 animate-in zoom-in-75">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Thank you for your feedback!</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Your insights help organizers create even better experiences for future events.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Sparkles className="w-4 h-4" />
                </span>
                <DialogTitle className="text-xl">How was {eventTitle}?</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Take 60 seconds to share your experience and rate the sessions.
              </DialogDescription>
            </DialogHeader>

            {/* OVERALL RATING */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/60 text-center space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Overall Event Experience
              </Label>
              <div className="flex justify-center">
                {renderStars(rating, setRating)}
              </div>
            </div>

            {/* NPS (0-10) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-foreground">
                  How likely are you to recommend this event to a peer? (NPS)
                </Label>
                <span className="text-xs font-bold text-primary font-mono">{npsScore ?? 10} / 10</span>
              </div>

              <div className="grid grid-cols-11 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                  const isSelected = npsScore === num;
                  const isPromoter = num >= 9;
                  const isPassive = num >= 7 && num < 9;

                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNpsScore(num)}
                      className={cn(
                        "h-8 rounded-lg text-xs font-bold transition-all border",
                        isSelected
                          ? isPromoter
                            ? "bg-emerald-500 text-white border-emerald-600 shadow-sm scale-105"
                            : isPassive
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm scale-105"
                            : "bg-rose-500 text-white border-rose-600 shadow-sm scale-105"
                          : "bg-muted/40 hover:bg-muted text-muted-foreground border-transparent"
                      )}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                <span>Not likely at all (0)</span>
                <span>Extremely likely (10)</span>
              </div>
            </div>

            {/* CATEGORY RATINGS */}
            <div className="space-y-3 pt-1 border-t border-border">
              <Label className="text-xs font-semibold text-foreground">Detailed Category Ratings</Label>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground">Venue / Stage</span>
                  <div className="flex justify-center scale-90">
                    {renderStars(venueRating, setVenueRating)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground">Speakers & Content</span>
                  <div className="flex justify-center scale-90">
                    {renderStars(contentRating, setContentRating)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-1.5 text-center">
                  <span className="text-[11px] font-semibold text-muted-foreground">Schedule & Org</span>
                  <div className="flex justify-center scale-90">
                    {renderStars(orgRating, setOrgRating)}
                  </div>
                </div>
              </div>
            </div>

            {/* OPEN COMMENTS */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="highlight-txt" className="text-xs font-semibold">
                  What did you enjoy the most?
                </Label>
                <Textarea
                  id="highlight-txt"
                  placeholder="The interactive workshops, networking stage, keynote insights..."
                  value={highlight}
                  onChange={(e) => setHighlight(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="improve-txt" className="text-xs font-semibold">
                  What could be improved next time?
                </Label>
                <Textarea
                  id="improve-txt"
                  placeholder="More Q&A time, additional seating, clearer track maps..."
                  value={improvement}
                  onChange={(e) => setImprovement(e.target.value)}
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>
            </div>

            {/* TESTIMONIAL CONSENT */}
            <div className="flex items-center space-x-2.5 pt-1">
              <Checkbox
                id="testimonial-consent"
                checked={allowTestimonial}
                onCheckedChange={(c) => setAllowTestimonial(!!c)}
              />
              <label
                htmlFor="testimonial-consent"
                className="text-xs text-muted-foreground leading-none cursor-pointer"
              >
                The organizer may feature my positive comments in event marketing.
              </label>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl">
                Skip for now
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl gap-2 font-bold px-6">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit Feedback
              </Button>
            </div>

          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
