'use client';

import React from 'react';
import { 
  Calendar as CalendarIcon, 
  Download, 
  ExternalLink, 
  Check 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  CalendarSessionData, 
  generateGoogleCalendarUrl, 
  generateOutlookCalendarUrl, 
  generateIcsContent, 
  downloadIcsFile 
} from '@/core/utils/calendar-export';

interface CalendarExportButtonProps {
  session?: CalendarSessionData;
  allSessions?: CalendarSessionData[];
  eventTitle?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  children?: React.ReactNode;
}

export function CalendarExportButton({
  session,
  allSessions,
  eventTitle = 'Eventra Event',
  variant = 'outline',
  size = 'sm',
  className,
  children,
}: CalendarExportButtonProps) {
  const { toast } = useToast();

  const handleDownloadIcs = () => {
    const sessionsToExport = session ? [session] : (allSessions || []);
    if (sessionsToExport.length === 0) {
      toast({ title: 'No sessions to export', variant: 'destructive' });
      return;
    }

    const title = session ? session.title : eventTitle;
    const icsContent = generateIcsContent(title, sessionsToExport);
    downloadIcsFile(title, icsContent);

    toast({
      title: 'Calendar File Downloaded! 📅',
      description: 'Open the .ics file to import into Apple Calendar, Outlook, or mobile apps.',
    });
  };

  const handleGoogleCalendar = () => {
    if (!session) return;
    const url = generateGoogleCalendarUrl(session);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleOutlookCalendar = () => {
    if (!session) return;
    const url = generateOutlookCalendarUrl(session);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children ? (
          <div>{children}</div>
        ) : (
          <Button variant={variant} size={size} className={className}>
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Add to Calendar
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5 font-sans">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
          {session ? 'Sync Session' : 'Export Conference'}
        </DropdownMenuLabel>
        
        {session && (
          <>
            <DropdownMenuItem onClick={handleGoogleCalendar} className="rounded-xl text-xs gap-2 cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-blue-500" /> Google Calendar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOutlookCalendar} className="rounded-xl text-xs gap-2 cursor-pointer">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> Outlook Web
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={handleDownloadIcs} className="rounded-xl text-xs gap-2 cursor-pointer font-medium text-foreground">
          <Download className="w-3.5 h-3.5 text-primary" />
          Download .ics File (Apple / Outlook)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
