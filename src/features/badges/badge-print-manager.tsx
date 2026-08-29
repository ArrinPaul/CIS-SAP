'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Download, 
  Search, 
  Filter, 
  Sparkles, 
  Check, 
  Users, 
  Layers, 
  QrCode, 
  Loader2, 
  Grid3X3, 
  Square,
  FileText,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PrintableBadgeCard } from './printable-badge-card';
import { BadgeAttendeeData, calculateSheetGrid } from '@/core/utils/badge-generator';
import { getEventBadgeData } from '@/app/actions/printable-badges';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';

interface BadgePrintManagerProps {
  initialEvents?: { id: string; title: string }[];
  defaultEventId?: string;
}

export default function BadgePrintManager({
  initialEvents = [],
  defaultEventId,
}: BadgePrintManagerProps) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId || initialEvents[0]?.id || '');
  const [badges, setBadges] = useState<BadgeAttendeeData[]>([]);
  const [eventMeta, setEventMeta] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'grid-sheet' | 'individual'>('grid-sheet');

  const printContainerRef = useRef<HTMLDivElement>(null);

  const loadBadges = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await getEventBadgeData(eventId);
      if (res.success) {
        setBadges(res.badges);
        setEventMeta(res.event);
      } else {
        toast({ title: 'Failed to load badges', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadBadges(selectedEventId);
    }
  }, [selectedEventId]);

  // Filtered badges
  const filteredBadges = badges.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.companyOrCollege && b.companyOrCollege.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'all' || b.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const { totalPages, pages } = calculateSheetGrid(filteredBadges.length, 6);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER (HIDDEN ON PRINT) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Printable Name Badges</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 font-mono text-[11px]">
              <Sparkles className="w-3 h-3" /> Avery 3x4" Compatible
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and bulk print physical attendee name tags with HMAC verification QR codes for check-in desks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handlePrint}
            disabled={filteredBadges.length === 0}
            className="rounded-xl font-bold gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Badges ({filteredBadges.length})
          </Button>
        </div>
      </div>

      {/* CONTROLS & FILTERS (HIDDEN ON PRINT) */}
      <Card className="rounded-3xl border-border shadow-sm print:hidden">
        <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* EVENT SELECTOR (IF MULTIPLE) */}
          {initialEvents.length > 1 && (
            <div className="w-full md:w-64">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Event" />
                </SelectTrigger>
                <SelectContent>
                  {initialEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* SEARCH */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search attendee by name, company, or ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl"
            />
          </div>

          {/* ROLE FILTER */}
          <div className="w-full md:w-48">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles ({badges.length})</SelectItem>
                <SelectItem value="vip">VIP Passes</SelectItem>
                <SelectItem value="speaker">Speakers</SelectItem>
                <SelectItem value="attendee">General Attendees</SelectItem>
                <SelectItem value="organizer">Organizers</SelectItem>
                <SelectItem value="sponsor">Sponsors</SelectItem>
                <SelectItem value="volunteer">Staff / Volunteers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* LAYOUT MODE TOGGLE */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl shrink-0">
            <button
              onClick={() => setLayoutMode('grid-sheet')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                layoutMode === 'grid-sheet' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" /> 6-per-Page Sheet
            </button>
            <button
              onClick={() => setLayoutMode('individual')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors",
                layoutMode === 'individual' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Square className="w-3.5 h-3.5" /> Individual Badges
            </button>
          </div>

        </CardContent>
      </Card>

      {/* STATS STRIP (HIDDEN ON PRINT) */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-2 print:hidden">
        <span>Showing <strong className="text-foreground">{filteredBadges.length}</strong> of {badges.length} attendee badges</span>
        {layoutMode === 'grid-sheet' && (
          <span>Estimated: <strong className="text-foreground">{totalPages}</strong> printable A4 sheets</span>
        )}
      </div>

      {/* BADGES DISPLAY & PRINT CONTAINER */}
      <div ref={printContainerRef} className="print:m-0 print:p-0">
        
        {loading ? (
          <div className="p-16 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" /> Loading badge layouts...
          </div>
        ) : filteredBadges.length === 0 ? (
          <Card className="p-12 text-center rounded-3xl border-dashed border-border bg-muted/20">
            <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-base font-semibold text-foreground">No attendee badges match your filter</p>
            <p className="text-xs text-muted-foreground mt-1">
              Select another event or adjust your search query to view printable badges.
            </p>
          </Card>
        ) : layoutMode === 'grid-sheet' ? (
          // 6-PER-PAGE SHEET LAYOUT
          <div className="space-y-12 print:space-y-0">
            {pages.map((pageIndices, pageIndex) => (
              <div
                key={pageIndex}
                className="bg-card p-8 rounded-3xl border border-border shadow-sm print:shadow-none print:border-none print:p-0 print:m-0 print:break-after-page"
                style={{ pageBreakAfter: 'always' }}
              >
                <div className="text-xs text-muted-foreground mb-4 font-mono print:hidden flex justify-between">
                  <span>Page {pageIndex + 1} of {totalPages} (Sheet of 6 Badges)</span>
                  <span>Ready for Avery 3x4" cut / peel</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 justify-items-center">
                  {pageIndices.map((idx) => (
                    <PrintableBadgeCard key={filteredBadges[idx].id} badge={filteredBadges[idx]} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // INDIVIDUAL BADGES GRID
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
            {filteredBadges.map((badge) => (
              <PrintableBadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        )}

      </div>

    </div>
  );
}
