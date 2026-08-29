'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Star, MessageSquareHeart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AutomatedFeedbackModal } from './automated-feedback-modal';
import { checkUserFeedbackEligibility } from '@/app/actions/post-event-feedback';
import { cn } from '@/core/utils/utils';

interface PostEventBannerProps {
  eventId: string;
  eventTitle: string;
  isRegistered?: boolean;
  isCompleted?: boolean;
}

export function PostEventBanner({
  eventId,
  eventTitle,
  isRegistered = false,
  isCompleted = false,
}: PostEventBannerProps) {
  const [shouldShow, setShouldShow] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function checkEligibility() {
      try {
        const res = await checkUserFeedbackEligibility(eventId);
        if (res.shouldPrompt) {
          setShouldShow(true);
        }
      } catch {
        // Guest or non-eligible
      }
    }

    checkEligibility();
  }, [eventId]);

  if (!shouldShow || dismissed) return null;

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/15 via-primary/10 to-primary/5 border border-amber-500/30 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/30 shadow-inner">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                How was your experience at {eventTitle}?
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                  Survey Open
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                The event has concluded. Share your rating & feedback to help shape future editions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="rounded-xl font-bold text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white shadow-sm"
            >
              <MessageSquareHeart className="w-3.5 h-3.5" /> Rate Event (60s)
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed(true)}
              className="w-7 h-7 rounded-xl text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AutomatedFeedbackModal
        eventId={eventId}
        eventTitle={eventTitle}
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        onSubmitted={() => setShouldShow(false)}
      />
    </>
  );
}
