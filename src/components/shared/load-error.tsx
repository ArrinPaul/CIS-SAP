'use client';

import { WifiOff, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/utils/utils';

interface LoadErrorProps {
  /** What failed to load, e.g. "attendees". Used in the message. */
  what?: string;
  onRetry?: () => void;
  /** Inline banner instead of a full-height empty state, for views that
   *  always render their own content. */
  compact?: boolean;
  className?: string;
}

/**
 * Shown when a fetch fails, in place of the empty state.
 *
 * Without this, a failed request and a genuinely empty result render
 * identically, so the user is told there is nothing there when in fact
 * nothing loaded.
 */
export function LoadError({ what = 'this', onRetry, compact, className }: LoadErrorProps) {
  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          'flex items-center gap-3 rounded-2xl bg-notion-sunken px-4 py-3',
          className
        )}
      >
        <WifiOff className="w-4 h-4 text-notion-ink-faint shrink-0" />
        <p className="text-body-sm text-notion-ink-secondary flex-1">
          Couldn&apos;t load {what}. Something went wrong reaching the server.
        </p>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} className="gap-1.5 shrink-0">
            <RotateCw className="w-3.5 h-3.5" /> Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center text-center gap-5 py-16 px-6', className)}
    >
      <div className="w-14 h-14 rounded-2xl bg-notion-sunken flex items-center justify-center">
        <WifiOff className="w-7 h-7 text-notion-ink-faint" />
      </div>
      <div className="space-y-1.5">
        <h3 className="font-display text-title text-notion-ink">Couldn&apos;t load {what}</h3>
        <p className="text-body-sm text-notion-ink-muted max-w-xs">
          Something went wrong reaching the server.
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="gap-2">
          <RotateCw className="w-4 h-4" /> Try again
        </Button>
      )}
    </div>
  );
}
