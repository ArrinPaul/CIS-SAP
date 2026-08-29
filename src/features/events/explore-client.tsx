'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, CalendarSearch, WifiOff, Activity, Compass, ChevronRight, SlidersHorizontal, Check, RotateCw, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getEvents } from '@/app/actions/events';
import { useTranslations } from 'next-intl';
import { EventCard } from './event-card';
import { cn } from '@/core/utils/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface EventItem {
  id: string; title: string; description: string; category: string;
  type: string; startDate: Date; endDate: Date; location: any;
  capacity: number; registeredCount: number; price: string;
  imageUrl: string | null; isPaid: boolean; status: string;
}

const PAGE_SIZE = 9;

export default function ExploreClient() {
  const t = useTranslations('Events');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Guards against a slow request landing after a newer one has been issued.
  const requestId = React.useRef(0);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  const debouncedSearch = useDebounce(search, 500);

  const categories = [
    { value: 'All', label: 'All Categories' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Business', label: 'Business' },
    { value: 'Design', label: 'Design' },
    { value: 'Science', label: 'Science' },
    { value: 'Arts', label: 'Arts' },
  ];

  const types = ['physical', 'virtual', 'hybrid'];

  const fetchEvents = React.useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(false);
    try {
      const result = await getEvents({
        search: debouncedSearch || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        type: selectedType || undefined,
        limit: PAGE_SIZE,
        offset: 0,
      });

      // A newer request has since been issued — discard this response.
      if (id !== requestId.current) return;

      const loaded = result as EventItem[];
      setEvents(loaded);
      setHasMore(loaded.length === PAGE_SIZE);
    } catch (error) {
      if (id !== requestId.current) return;
      console.error('Failed to fetch events:', error);
      setEvents([]);
      setHasMore(false);
      // Surface the failure instead of rendering it as "no results".
      setLoadError(true);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, selectedCategory, selectedType]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextBatch = await getEvents({
        search: debouncedSearch || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        type: selectedType || undefined,
        limit: PAGE_SIZE,
        offset: events.length,
      });

      const loaded = nextBatch as EventItem[];
      setEvents(prev => [...prev, ...loaded]);
      setHasMore(loaded.length === PAGE_SIZE);
    } catch (error) {
      console.error('Failed to load more events:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-24 px-6 md:px-10">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-notion-hairline pb-10">
        <div className="space-y-3 text-left">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-notion-canvas border-notion-hairline text-notion-ink-faint font-bold px-3 py-0.5 rounded-md shadow-sm uppercase text-[9px] tracking-widest">
                Network Scan
              </Badge>
           </div>
           <h1 className="font-display text-h1 text-notion-ink">
             Global <span className="text-notion-primary italic">Explore.</span>
           </h1>
           <p className="text-lg text-notion-ink-muted font-medium max-w-2xl leading-relaxed">
             Real-time synchronization of event nodes, digital experiences, and global community activity.
           </p>
        </div>
      </header>

      {/* Search & Filters */}
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <div className="relative group flex-1 w-full">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-notion-ink-faint group-focus-within:text-notion-ink transition-colors pointer-events-none" />
             <Input
               placeholder="Search event title or tags..."
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-11 h-12 text-body-sm"
             />
             {search && (
               <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-notion-ink-faint hover:text-notion-ink transition-colors p-1 rounded-md">
                 <X className="w-4 h-4" />
               </button>
             )}
           </div>
           <Button 
             variant={showFilters ? "primary" : "outline"} 
             onClick={() => setShowFilters(!showFilters)}
             aria-expanded={showFilters}
             aria-controls="explore-filters"
             className="h-12 gap-2 px-6 shrink-0"
           >
              <SlidersHorizontal className="w-4 h-4" /> Filters
           </Button>
        </div>

        <AnimatePresence>
           {showFilters && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="overflow-hidden"
             >
                <div id="explore-filters" className="p-6 rounded-2xl bg-notion-sunken grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-4">
                      <p className="text-eyebrow uppercase text-notion-ink-muted">Event Environment</p>
                      <div className="flex flex-wrap gap-2">
                         {types.map(type => (
                           <button 
                             key={type}
                             onClick={() => setSelectedType(selectedType === type ? null : type)}
                             aria-pressed={selectedType === type}
                             className={cn(
                               "px-4 h-9 rounded-full text-body-sm font-medium flex items-center gap-2",
                               "transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
                               "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                               selectedType === type 
                                ? "bg-notion-primary text-notion-on-primary" 
                                : "bg-notion-surface text-notion-ink-muted hover:bg-accent hover:text-notion-ink"
                             )}
                           >
                              {selectedType === type && <Check className="w-3 h-3" />}
                              {type}
                           </button>
                         ))}
                      </div>
                   </div>
                   <div className="space-y-4">
                      <p className="text-eyebrow uppercase text-notion-ink-muted">Active Filters</p>
                      <div className="flex flex-wrap gap-2">
                         {selectedCategory !== 'All' && <Badge variant="secondary">Category: {selectedCategory}</Badge>}
                         {selectedType && <Badge variant="secondary">Type: {selectedType}</Badge>}
                         {!selectedType && selectedCategory === 'All' && <p className="text-body-sm text-notion-ink-faint">No active filters</p>}
                         {(selectedType || selectedCategory !== 'All') && (
                            <button 
                              onClick={() => { setSelectedCategory('All'); setSelectedType(null); }}
                              className="text-body-sm font-medium text-notion-ink-muted hover:text-destructive underline underline-offset-4 ml-2 transition-colors"
                            >
                               Clear All
                            </button>
                         )}
                      </div>
                   </div>
                </div>
             </motion.div>
           )}
        </AnimatePresence>

        {/* Category Pills */}
        <div className="flex gap-2.5 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              aria-pressed={selectedCategory === cat.value}
              className={cn(
                "px-5 h-10 rounded-full text-body-sm font-medium whitespace-nowrap shrink-0",
                "transition-[background-color,color,box-shadow,transform] duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "active:scale-[0.97]",
                selectedCategory === cat.value
                  ? "bg-notion-primary text-notion-on-primary shadow-notion-soft"
                  : "bg-notion-sunken text-notion-ink-muted hover:bg-accent hover:text-notion-ink"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-notion-sunken overflow-hidden animate-pulse aspect-[4/5]" />
          ))}
        </div>
      ) : loadError ? (
        <div role="alert" className="text-center py-32 bg-notion-sunken rounded-3xl space-y-6">
          <div className="w-16 h-16 bg-notion-surface rounded-2xl flex items-center justify-center mx-auto shadow-notion-soft">
            <WifiOff className="w-8 h-8 text-notion-ink-faint" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-h3 text-notion-ink">Couldn&apos;t load events</h3>
            <p className="text-body-sm text-notion-ink-muted max-w-xs mx-auto">
              Something went wrong reaching the server. Your filters are still applied.
            </p>
          </div>
          <Button variant="secondary" onClick={fetchEvents} className="gap-2">
             <RotateCw className="w-4 h-4" /> Try again
          </Button>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-32 bg-notion-sunken rounded-3xl space-y-6">
          <div className="w-16 h-16 bg-notion-surface rounded-2xl flex items-center justify-center mx-auto shadow-notion-soft">
            <CalendarSearch className="w-8 h-8 text-notion-ink-faint" />
          </div>
          <div className="space-y-2">
            <h3 className="font-display text-h3 text-notion-ink">Sector Empty</h3>
            <p className="text-body-sm text-notion-ink-muted max-w-xs mx-auto">No events detected matching your current scan parameters.</p>
          </div>
          <Button variant="secondary" onClick={() => { setSearch(''); setSelectedCategory('All'); setSelectedType(null); }}>
             Reset Scan
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <h2 className="font-display text-title text-notion-ink">Live Nodes Found</h2>
              </div>
              <span className="text-body-sm text-notion-ink-muted">{events.length} results</span>
           </div>
           <motion.div
             className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
             initial="initial" animate="animate"
             variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
           >
             {events.map((event) => (
               <motion.div
                 key={event.id}
                 variants={{
                   initial: { opacity: 0, y: 20 },
                   animate: { opacity: 1, y: 0 },
                 }}
                 transition={{ duration: 0.5, ease: "easeOut" }}
               >
                 <EventCard event={event as any} />
               </motion.div>
             ))}
           </motion.div>
           
            {hasMore && (
              <div className="pt-10 flex justify-center">
                 <Button 
                   variant="outline" 
                   size="lg" 
                   onClick={handleLoadMore}
                   disabled={loadingMore}
                   className="rounded-xl font-bold border-notion-hairline hover:bg-notion-surface px-10 h-12 gap-2 transition-all active:scale-95"
                 >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-notion-primary" />
                        <span>Loading Nodes...</span>
                      </>
                    ) : (
                      'Load More Nodes'
                    )}
                 </Button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
