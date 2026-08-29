'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/core/utils/utils';
import { useTheme } from 'next-themes';
import { UserButton } from "@clerk/nextjs";
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Compass, 
  Ticket, 
  Calendar, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Moon,
  Sun,
  Briefcase,
  LogOut,
  Zap,
  Activity,
  Globe,
  Sparkles,
  MessageCircle,
  Lightbulb
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const t = useTranslations('Common');
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = React.useMemo(() => [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/explore', label: 'Explore', icon: Compass },
    { href: '/chat', label: 'Messages', icon: MessageCircle, requireAuth: true },
    { href: '/ai-recommendations', label: 'For You', icon: Lightbulb, requireAuth: true },
    { href: '/ai-tools', label: 'AI Workspace', icon: Sparkles, requireAuth: true },
    { href: '/tickets', label: 'My Tickets', icon: Ticket, requireAuth: true },
    { href: '/my-events', label: 'Schedule', icon: Calendar, requireAuth: true },
    { href: '/search', label: 'Global Search', icon: Search },
    { href: '/organizer', label: 'Management', icon: Briefcase, roles: ['organizer', 'admin'] },
  ].filter(link => {
    if (link.href === '/' || link.href === '/explore' || link.href === '/search') return true;
    if (link.requireAuth && !isAuthenticated) return false;
    return !link.roles || (user && link.roles.includes(user.role));
  }), [user, isAuthenticated]);

  const sidebarWidth = isCollapsed ? '72px' : '260px';

  if (!mounted) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        className={cn(
          "fixed left-0 top-0 bottom-0 z-50 bg-notion-surface border-r border-notion-hairline/60 flex flex-col transition-all duration-300",
          className
        )}
      >
        {/* HEADER / LOGO */}
        <div className="h-16 flex items-center px-5 shrink-0">
          <Link href="/" className="flex items-center gap-3 active:scale-95 group overflow-hidden">
             <div className="w-8 h-8 rounded-xl bg-notion-primary flex items-center justify-center shrink-0">
                <Logo iconClassName="w-5 h-5 text-notion-on-primary" className="gap-0" />
             </div>
             {!isCollapsed && (
                <span className="font-display text-title text-notion-ink antialiased">
                   Eventra<span className="text-notion-ink-faint">.</span>
                </span>
             )}
          </Link>
        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-6 overflow-x-hidden custom-scrollbar">
          {!isCollapsed && (
             <p className="px-3 mb-2 text-eyebrow uppercase text-notion-ink-faint">Main Console</p>
          )}
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <Link href={link.href}>
                    <motion.div 
                      whileHover={{ x: 2 }}
                      className={cn(
                        "group relative flex items-center h-10 gap-3.5 px-3 rounded-xl transition-all cursor-pointer",
                        isActive 
                          ? "bg-notion-primary text-notion-on-primary shadow-notion-soft font-medium" 
                          : "text-notion-ink-secondary hover:bg-accent hover:text-notion-ink"
                      )}
                    >
                      <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-notion-on-primary" : "text-notion-ink-muted group-hover:text-notion-ink")} />
                      {!isCollapsed && (
                        <span className="text-body-sm truncate">
                          {link.label}
                        </span>
                      )}
                      {isActive && !isCollapsed && (
                         <div className="ml-auto w-1 h-1 rounded-full bg-notion-on-primary" />
                      )}
                    </motion.div>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="bg-notion-ink text-notion-canvas border-none rounded-md px-3 py-1.5 text-caption ml-3 shadow-notion-elevated">
                    {link.label}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>

        {/* FOOTER ACTIONS */}
        <div className="mt-auto border-t border-notion-hairline/60 flex flex-col p-3 gap-4">
          


          <div className="flex flex-col gap-1">
             {/* THEME & COLLAPSE */}
             <div className={cn("flex items-center gap-1", isCollapsed ? "flex-col" : "justify-between")}>
                <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                   className="h-9 w-9 rounded-xl hover:bg-accent text-notion-ink-muted"
                >
                   {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                </Button>
                
                <Button
                   variant="ghost"
                   size="icon"
                   onClick={() => setIsCollapsed(!isCollapsed)}
                   className="h-9 w-9 rounded-xl hover:bg-accent text-notion-ink-muted"
                >
                   {isCollapsed ? <ChevronRight className="w-4.5 h-4.5" /> : <ChevronLeft className="w-4.5 h-4.5" />}
                </Button>
             </div>

             {/* SIGN OUT */}
             <Tooltip>
                <TooltipTrigger asChild>
                   <button
                      type="button"
                      onClick={async (e) => {
                         e.preventDefault();
                         e.stopPropagation();
                         await logout();
                      }}
                      className={cn(
                         "flex items-center h-10 gap-3.5 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-notion-ink-muted hover:text-red-600 transition-colors w-full cursor-pointer",
                         isCollapsed && "justify-center"
                      )}
                   >
                      <LogOut className="w-5 h-5 shrink-0" />
                      {!isCollapsed && <span className="text-sm font-bold tracking-tight">Sign out</span>}
                   </button>
                </TooltipTrigger>
                {isCollapsed && (
                   <TooltipContent side="right" className="bg-red-600 text-white border-none rounded-lg px-3 py-1.5 text-xs ml-3 font-bold">
                      Sign out
                   </TooltipContent>
                )}
             </Tooltip>
          </div>

          {/* USER PROFILE */}
          <div className={cn(
            "flex items-center gap-3.5 p-2 rounded-xl hover:bg-accent transition-colors group overflow-hidden",
            isCollapsed && "justify-center px-0"
          )}>
            <div className="shrink-0">
              <UserButton 
                appearance={{
                  elements: {
                    userButtonAvatarBox: "h-8 w-8 rounded-lg border border-notion-hairline shadow-sm",
                    userButtonTrigger: "focus:shadow-none focus:ring-0",
                  }
                }}
              />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[13px] font-black text-notion-ink truncate leading-tight uppercase tracking-tight">{user?.name?.split(' ')[0]}</span>
                <span className="text-[10px] text-primary font-black uppercase tracking-widest leading-none mt-1">{user?.role}</span>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
