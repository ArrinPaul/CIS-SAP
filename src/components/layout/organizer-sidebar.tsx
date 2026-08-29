'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/core/utils/utils';
import { motion } from 'framer-motion';
import { Logo } from '@/components/brand/logo';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  Calendar,
  BarChart3,
  Users,
  Settings,
  QrCode,
  Ticket,
  Mail,
  Plus,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Sparkles,
  Award,
  MessageSquare,
  DollarSign,
  Eye,
  Tag,
  Contact2,
} from 'lucide-react';

const sidebarGroups = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', href: '/organizer', icon: LayoutDashboard },
      { title: 'AI Insights', href: '/organizer/ai-insights', icon: Sparkles },
    ],
  },
  {
    label: 'Event Management',
    items: [
      { title: 'My Events', href: '/organizer/events', icon: Calendar },
      { title: 'Attendees', href: '/organizer/attendees', icon: Users },
      { title: 'Name Badges', href: '/organizer/badges', icon: Contact2 },
      { title: 'Certificates', href: '/organizer/certificates', icon: Award },
      { title: 'Feedback', href: '/organizer/feedback', icon: MessageSquare },
      { title: 'Scanner', href: '/check-in-scanner', icon: QrCode },
      { title: 'CV Density', href: '/organizer/attendance-scanner', icon: Eye },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Analytics', href: '/organizer/analytics', icon: BarChart3 },
      { title: 'Ticketing', href: '/organizer/ticketing', icon: Ticket },
      { title: 'Promo Codes', href: '/organizer/promos', icon: Tag },
      { title: 'Payouts', href: '/organizer/payouts', icon: DollarSign },
      { title: 'Comms', href: '/organizer/communications', icon: Mail },
      { title: 'Settings', href: '/organizer/settings', icon: Settings },
    ],
  },
];

export function OrganizerSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const groups = React.useMemo(() => sidebarGroups, []);

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? '80px' : '280px' }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 bg-background/80 backdrop-blur-xl border-r border-border/40 transition-all duration-300 flex flex-col shadow-2xl",
        )}
      >
        {/* Header */}
        <div className="h-24 flex items-center px-6 mb-4 overflow-hidden">
          {!collapsed ? (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4 transition-transform active:scale-95 group overflow-hidden shrink-0"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-notion-soft group-hover:rotate-12 transition-transform duration-500 shrink-0">
                 <Logo iconClassName="w-8 h-8 text-primary-foreground" className="gap-0" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-display font-bold text-xl tracking-tighter text-foreground truncate">Organizer.</span>
                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.3em] truncate opacity-60">Command_Hub</span>
              </div>
            </motion.div>
          ) : (
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-notion-soft shrink-0">
               <Logo iconClassName="w-8 h-8 text-primary-foreground" className="gap-0" />
            </div>
          )}
        </div>

        {/* Action Toggle */}
        <div className="px-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 rounded-xl hover:bg-muted/50 border border-border/20 shadow-sm"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        {/* Create Event Action */}
        <div className="px-4 mb-8">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild size={collapsed ? "icon" : "lg"} className={cn("rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] border-none transition-all active:scale-95", collapsed ? "w-12 h-12" : "w-full h-14")}>
                <Link href="/events/create">
                  <Plus className={cn("w-5 h-5", !collapsed && "mr-3")} />
                  {!collapsed && <span>New Mission</span>}
                </Link>
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="bg-primary text-primary-foreground border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] ml-2 shadow-2xl">
                New Mission
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-4 custom-scrollbar overflow-x-hidden">
          <nav className="flex flex-col gap-10 pb-10">
            {groups.map((group, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                {!collapsed && (
                  <p className="px-4 mb-2 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/50 animate-in fade-in duration-700">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/organizer' && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              'relative flex items-center gap-4 rounded-2xl px-4 py-3.5 text-sm font-bold transition-all duration-300 group overflow-hidden',
                              isActive
                                ? 'text-primary'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                              collapsed && 'justify-center px-0'
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="org-sidebar-active-pill"
                                className="absolute inset-0 bg-primary/5 border-l-4 border-primary -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                              />
                            )}
                            <Icon className={cn("w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : "group-hover:text-primary")} />
                            {!collapsed && <span className="text-[11px] uppercase tracking-[0.2em] truncate">{item.title}</span>}
                          </Link>
                        </TooltipTrigger>
                        {collapsed && (
                          <TooltipContent side="right" className="bg-foreground text-background border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] ml-2 shadow-2xl">
                            {item.title}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border/40 bg-muted/10">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/support" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background/60 border border-border/40 text-muted-foreground hover:text-primary transition-all shadow-lg hover:scale-110">
                  <HelpCircle className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-foreground text-background border-none rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] ml-2 shadow-2xl">
                Support
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link href="/support" className="flex items-center gap-4 p-3.5 rounded-3xl bg-background/60 border border-border/40 shadow-xl transition-all hover:bg-background/80 group">
              <div className="w-10 h-10 rounded-2xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                <HelpCircle className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground">Need help?</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">Ops_Support</p>
              </div>
            </Link>
          )}
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
