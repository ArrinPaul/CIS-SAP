'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Calendar, Download, ExternalLink, ChevronDown } from 'lucide-react';
import {
  CalendarEventData,
  getGoogleCalendarUrl,
  getOutlookWebUrl,
  getOffice365Url,
  getYahooCalendarUrl,
  generateSingleEventIcs,
  triggerIcsDownload,
} from '@/core/utils/calendar-links';
import { cn } from '@/core/utils/utils';

interface AddToCalendarButtonProps {
  event: CalendarEventData;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
}

export function AddToCalendarButton({
  event,
  className,
  variant = 'outline',
  size = 'default',
  label = 'Add to Calendar',
}: AddToCalendarButtonProps) {
  const handleDownloadIcs = () => {
    const icsContent = generateSingleEventIcs(event);
    triggerIcsDownload(event.title || 'eventra-event', icsContent);
  };

  const googleUrl = getGoogleCalendarUrl(event);
  const outlookUrl = getOutlookWebUrl(event);
  const office365Url = getOffice365Url(event);
  const yahooUrl = getYahooCalendarUrl(event);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2 rounded-xl shadow-sm', className)}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>{label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-60 ml-auto" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 shadow-xl border-border bg-card">
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
          Choose calendar provider
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60" />

        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 px-2.5 text-sm focus:bg-accent focus:text-accent-foreground">
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
            <span className="font-medium">Google Calendar</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 px-2.5 text-sm focus:bg-accent focus:text-accent-foreground">
          <a href={outlookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
            <span className="font-medium">Outlook (Web)</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 px-2.5 text-sm focus:bg-accent focus:text-accent-foreground">
          <a href={office365Url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
            <span className="font-medium">Office 365</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2 px-2.5 text-sm focus:bg-accent focus:text-accent-foreground">
          <a href={yahooUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full">
            <span className="font-medium">Yahoo Calendar</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/60" />

        <DropdownMenuItem
          onClick={handleDownloadIcs}
          className="rounded-xl cursor-pointer py-2 px-2.5 text-sm focus:bg-accent focus:text-accent-foreground flex items-center justify-between w-full"
        >
          <span className="font-medium">Apple / iCal (.ics)</span>
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
