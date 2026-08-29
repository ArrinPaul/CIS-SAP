'use client';

import { motion, useScroll, useTransform, Variants, AnimatePresence, useMotionValueEvent } from 'framer-motion';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EventCard } from '@/features/events/event-card';
import { EventraEvent } from '@/types';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/core/utils/utils';
import {
  ArrowRight,
  Globe,
  Network,
  LayoutDashboard,
  LayoutGrid,
  Sparkles,
  BarChart3,
  DollarSign,
  TrendingUp,
  Calendar,
  Users,
  Hash,
  MessageSquare,
  Bot,
  FileText,
  BookOpen,
  NotebookText,
  Workflow,
  ListChecks,
  ListTodo,
  Server,
  ShieldCheck,
  Linkedin,
  Twitter,
  Moon,
  Sun,
  Award,
  CheckCircle2,
  Zap
} from 'lucide-react';
import {
  NotionLogo,
  SlackLogo,
  DiscordLogo,
  GoogleCalendarLogo,
  FigmaLogo,
  MiroLogo,
  StripeLogo,
  ZoomLogo,
  GitHubLogo,
  ConfluenceLogo
} from '@/components/brand/integration-logos';

const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: "easeOut" } 
  },
};

const STAGGER: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
  },
};

const MODULES = [
  {
    id: 'networking',
    title: 'Networking',
    icon: Users,
    description: 'High-performance real-time networking for attendees and organizers.',
    preview: (
      <div className="w-full bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 p-6 flex flex-col gap-4 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between border-b border-border/20 pb-4">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-semibold text-[10px] ">AC</div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-medium text-notion-ink leading-none">Alex Chen</span>
                 <span className="text-[8px] text-data-positive font-medium flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-data-positive animate-pulse" />
                    Connected
                 </span>
              </div>
           </div>
        </div>
        <div className="flex flex-col gap-3">
           <div className="self-start bg-muted/30 p-3 rounded-2xl rounded-tl-none max-w-[80%] border border-border/10 shadow-sm">
              <p className="text-[10px] text-foreground/70 leading-tight font-bold">Protocol check: Have you verified your session encryption keys?</p>
           </div>
           <div className="self-end bg-notion-primary p-3 rounded-2xl rounded-tr-none max-w-[80%] text-notion-on-primary">
              <p className="text-[10px] font-medium leading-tight">Uplink confirmed. Nodes are synchronized.</p>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'experience',
    title: 'Gamification',
    icon: Award,
    description: 'Gamified attendee progression with experience points and levels.',
    preview: (
      <div className="w-full bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 p-6 flex flex-col gap-6 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between">
           <h4 className="text-lg font-display font-bold tracking-tight text-foreground">Level 12</h4>
           <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Award className="w-5 h-5" />
           </div>
        </div>
        <div className="space-y-4">
           <div className="p-4 rounded-2xl bg-background/60 border border-border/30 shadow-sm flex items-center gap-4">
              <div className="flex-1">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-medium text-notion-ink">Next Unlock</span>
                    <span className="text-[9px] font-mono font-bold text-primary">850 / 1200 XP</span>
                 </div>
                 <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: '70%' }} className="h-full bg-primary" />
                 </div>
              </div>
           </div>
        </div>
      </div>
    )
  },
  {
    id: 'calendar',
    title: 'Schedule',
    icon: Calendar,
    description: 'Dynamic session tracks and personalized schedules for every attendee.',
    preview: (
      <div className="w-full bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 p-6 flex flex-col overflow-hidden shadow-inner">
        <div className="grid grid-cols-7 gap-1.5">
           {Array.from({ length: 14 }).map((_, i) => (
             <div key={i} className={cn(
               "aspect-square rounded-lg border transition-all flex flex-col items-center justify-center gap-0.5",
               i === 5 || i === 8 || i === 12 ? "bg-primary text-primary-foreground border-primary" : "bg-background/60 border-border/20 text-muted-foreground"
             )}>
                <span className="text-[8px] font-mono font-bold">{i + 1}</span>
             </div>
           ))}
        </div>
      </div>
    )
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    description: 'Real-time data visualization and attendance tracking across all event nodes.',
    preview: (
      <div className="w-full bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 p-6 flex flex-col gap-4 overflow-hidden shadow-inner">
        <div className="h-32 flex items-end gap-1.5 px-2">
           {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95].map((h, i) => (
             <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} className="flex-1 bg-primary/20 rounded-full" />
           ))}
        </div>
        <p className="text-[9px] text-center text-notion-ink-muted">Real-time Performance</p>
      </div>
    )
  },
  {
    id: 'ai-tools',
    title: 'AI Workspace',
    icon: Sparkles,
    description: 'Intelligent automation layer for content summarization and action items.',
    preview: (
      <div className="w-full bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 p-6 flex flex-col gap-4 overflow-hidden shadow-inner">
        <div className="space-y-3">
           <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-semibold uppercase text-primary">Neural_Processor_Active</span>
           </div>
           <div className="h-2 w-3/4 bg-muted/40 rounded-full" />
           <div className="h-2 w-1/2 bg-muted/20 rounded-full" />
        </div>
      </div>
    )
  },
  {
    id: 'security',
    title: 'Security',
    icon: ShieldCheck,
    description: 'Enterprise-grade encryption and secure access protocols for all attendees.',
    preview: (
      <div className="w-full bg-background/40 backdrop-blur-md rounded-2xl border border-border/40 p-6 flex flex-col items-center justify-center gap-4 overflow-hidden shadow-inner min-h-[160px]">
        <div className="w-16 h-16 rounded-full bg-data-positive-soft border border-transparent flex items-center justify-center text-data-positive">
           <ShieldCheck className="w-8 h-8" />
        </div>
        <span className="text-[10px] font-semibold uppercase text-data-positive tracking-[0.07em]">AES-256 SECURE</span>
      </div>
    )
  }
];

const AI_FEATURES = [
  {
    title: "Reply Suggestions",
    description: "Context-aware AI replies for networking and support chats.",
    icon: MessageSquare
  },
  {
    title: "Daily Recap",
    description: "Intelligent activity summaries and key takeaway extractions.",
    icon: FileText
  },
  {
    title: "Text to Diagram",
    description: "Automated flowchart and floor plan generation from prompts.",
    icon: Workflow
  },
  {
    title: "Notes Formatter",
    description: "Instant action item extraction and structuring from session notes.",
    icon: ListChecks
  }
];

export default function LandingPage({ featuredEvents = [] }: { featuredEvents?: EventraEvent[] }) {
  const [activeModule, setActiveModule] = useState(MODULES[0].id);
  const [activeAIIndex, setActiveAIIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveAIIndex((prev) => (prev + 1) % AI_FEATURES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    if (latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
  });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4], [1, 0.95]);

  return (
    <div ref={containerRef} className="relative min-h-screen bg-background text-foreground selection:bg-notion-ink selection:text-notion-canvas font-sans overflow-x-clip">
      
      {/* NAVIGATION */}
      <motion.nav 
        variants={{
          visible: { y: 0 },
          hidden: { y: "-100%" },
        }}
        animate={hidden ? "hidden" : "visible"}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="fixed top-0 w-full z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl"
      >
        <div className="container mx-auto px-10 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer transition-transform active:scale-95">
             <Logo iconClassName="w-10 h-10" showText />
          </div>
          <div className="hidden md:flex items-center gap-10 text-body-sm text-notion-ink-muted">
            <Link href="#features" className="hover:text-notion-ink transition-colors">Features</Link>
            <Link href="#ecosystem" className="hover:text-notion-ink transition-colors">Ecosystem</Link>
            <Link href="#events" className="hover:text-notion-ink transition-colors">Explore</Link>
          </div>
          <div className="flex items-center gap-4">
             {mounted && (
               <button 
                 onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                 className="h-10 w-10 flex items-center justify-center rounded-full bg-notion-sunken transition-all text-notion-ink-muted hover:text-notion-ink active:scale-95"
                 aria-label="Toggle Theme"
               >
                 {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
               </button>
             )}
             <Link href="/login" className="text-body-sm text-notion-ink-muted hover:text-notion-ink transition-all hidden sm:block">Login</Link>
             <Button size="sm" className="px-6 h-10" asChild>
                <Link href="/register">Get Started</Link>
             </Button>
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 px-6 flex flex-col items-center justify-center text-center overflow-hidden">
        <motion.div 
          style={{ opacity, scale }}
          initial="hidden" 
          animate="visible" 
          variants={STAGGER} 
          className="relative z-10 w-full max-w-6xl space-y-12 flex flex-col items-center"
        >
          <motion.h1 variants={FADE_UP} className="font-display text-5xl md:text-8xl tracking-[-0.035em] leading-[0.9] text-notion-ink">
            Discussion to <br />
            <span className="italic text-notion-ink-faint">Execution.</span>
          </motion.h1>

          <motion.p variants={FADE_UP} className="text-body-md md:text-xl text-notion-ink-muted max-w-2xl mx-auto leading-relaxed">
            Eventra is your intelligent workspace for live experiences. <br className="hidden md:block" />
            Unified, AI-driven, and engineered for high-performance delivery.
          </motion.p>

          <motion.div variants={FADE_UP} className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
            <Button size="xl" className="px-10" asChild>
              <Link href="/register">Get Started</Link>
            </Button>
            <Button size="xl" variant="secondary" className="px-10" asChild>
              <Link href="#ecosystem">Explore Mesh</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview - Professional High Fidelity App UI */}
        <motion.div 
          initial={{ opacity: 0, y: 100, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 relative w-full max-w-7xl aspect-[16/10] mx-auto rounded-3xl border-[10px] border-notion-sunken bg-notion-surface shadow-notion-elevated overflow-hidden group flex"
        >
           {/* Sidebar Navigation */}
           <div className="w-20 md:w-64 border-r border-border/50 bg-muted/20 flex flex-col p-6 shrink-0 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-10 px-2">
                 <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center ">
                    <Logo iconClassName="w-6 h-6 text-primary-foreground" />
                 </div>
                 <span className="font-display text-title hidden md:block">Eventra<span className="text-notion-ink-faint">.</span></span>
              </div>
              
              <div className="space-y-1">
                 {[
                   { i: LayoutDashboard, l: "Overview", a: true },
                   { i: Calendar, l: "Events" },
                   { i: Users, l: "Attendees" },
                   { i: DollarSign, l: "Revenue" },
                   { i: Bot, l: "AI Agent" },
                   { i: Network, l: "Network" }
                 ].map((item, i) => (
                   <motion.div 
                     key={i} 
                     whileHover={{ x: 4, backgroundColor: 'rgba(var(--primary), 0.05)' }}
                     className={cn(
                       "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all cursor-pointer group/nav",
                       item.a ? "bg-primary text-primary-foreground " : "text-muted-foreground hover:text-foreground"
                     )}
                   >
                      <item.i className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-bold hidden md:block tracking-tight">{item.l}</span>
                   </motion.div>
                 ))}
              </div>
              
              <div className="mt-auto space-y-6 px-2">
                 <div className="p-5 rounded-2xl bg-background/40 border border-border/40 hidden md:block shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-[9px] font-medium text-notion-ink">Mesh Pro</p>
                       <TrendingUp className="w-3 h-3 text-notion-ink-secondary" />
                    </div>
                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         whileInView={{ width: '75%' }}
                         transition={{ duration: 1.5, delay: 1 }}
                         className="h-full bg-primary" 
                       />
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-3 font-bold">14.2GB / 20GB Sync</p>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-muted to-border border border-border shrink-0 shadow-inner" />
                    <div className="hidden md:block">
                       <p className="text-xs font-medium leading-none text-notion-ink">Sarah Miller</p>
                       <p className="text-[9px] text-notion-ink-muted mt-1.5">Organizer</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* Main App Area */}
           <div className="flex-1 flex flex-col min-w-0 bg-muted/5">
              {/* Browser Header Bar */}
              <div className="h-14 border-b border-border/50 flex items-center justify-between px-10 shrink-0 bg-background/40 backdrop-blur-md">
                 <div className="flex items-center gap-4 flex-1">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/30" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                    </div>
                    <div className="h-8 flex-1 max-w-xl bg-muted/20 border border-border/40 rounded-xl flex items-center px-5 gap-3 ml-6">
                       <Globe className="w-3 h-3 text-muted-foreground/40" />
                       <span className="text-[10px] font-mono text-muted-foreground/50 tracking-[0.06em] select-none">https://eventra.cloud/mission-control</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-data-positive-soft border border-transparent">
                       <div className="w-1.5 h-1.5 rounded-full bg-data-positive animate-pulse" />
                       <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-data-positive">Live</span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted/40 border border-border/40" />
                 </div>
              </div>

              {/* Sub Header / Breadcrumbs */}
              <div className="h-16 border-b border-border/30 flex items-center justify-between px-10 shrink-0 bg-background/20">
                 <div className="flex items-center gap-6">
                    <h2 className="font-display text-title text-notion-ink">Dashboard</h2>
                    <div className="h-4 w-px bg-border/40" />
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                       <Sparkles className="w-3 h-3 text-notion-ink-secondary" />
                       <span className="text-[9px] font-medium uppercase tracking-[0.04em] text-notion-ink-secondary">Operational</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-background/40 transition-colors"><Calendar className="w-4 h-4 text-muted-foreground" /></Button>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-background/40 transition-colors"><Users className="w-4 h-4 text-muted-foreground" /></Button>
                    <Button size="sm" variant="secondary" className="h-9">Share Intel</Button>
                 </div>
              </div>

              {/* Dashboard Content */}
              <div className="flex-1 p-10 overflow-hidden flex flex-col gap-8">
                 {/* Top Metrics Row */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 shrink-0">
                    {[
                      { l: "Monthly Revenue", v: "$124,500", c: "+12.4%", i: DollarSign, color: "text-data-5" },
                      { l: "Active Attendees", v: "14,202", c: "+8.1%", i: Users, color: "text-data-4" },
                      { l: "Event Velocity", v: "98.2%", c: "+2.4%", i: TrendingUp, color: "text-data-2" }
                    ].map((m, i) => (
                      <motion.div 
                        key={i} 
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="p-7 rounded-2xl bg-notion-surface flex flex-col justify-between h-44 shadow-notion-soft hover:shadow-notion-elevated cursor-pointer transition-all duration-300"
                      >
                         <div className="flex justify-between items-start">
                            <span className="text-[10px] text-notion-ink-muted">{m.l}</span>
                            <div className={cn("w-10 h-10 rounded-2xl bg-muted/40 flex items-center justify-center transition-colors border border-border/40", m.color)}>
                               <m.i className="w-5 h-5" />
                            </div>
                         </div>
                         <div className="flex items-end justify-between">
                            <span className="font-display text-metric tabular text-notion-ink">{m.v}</span>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-data-positive-soft text-data-positive text-caption font-medium">
                               <ArrowRight className="w-3 h-3 -rotate-45" />
                               {m.c}
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 {/* Main Chart Area - Refined Data Viz */}
                 <motion.div 
                   layout
                   className="flex-1 min-h-0 rounded-2xl bg-notion-surface p-8 flex flex-col gap-6 relative overflow-hidden shadow-notion-soft"
                 >
                    <div className="flex items-center justify-between relative z-10 shrink-0">
                       <div className="space-y-1.5">
                          <h3 className="font-display text-h3 text-notion-ink">Growth Projection</h3>
                          <p className="text-caption text-notion-ink-muted">Real-time attendance &amp; revenue tracking across nodes</p>
                       </div>
                       <div className="flex bg-notion-sunken p-1 rounded-full gap-1">
                          {['D', 'W', 'M'].map(t => (
                            <button key={t} className={cn("w-10 h-10 rounded-xl text-[10px] font-semibold transition-all", t === 'W' ? 'bg-notion-primary text-notion-on-primary' : 'text-notion-ink-muted hover:text-notion-ink')}>{t}</button>
                          ))}
                       </div>
                    </div>

                    <div className="flex-1 flex items-end gap-3 px-2 relative z-10 min-h-0">
                       {[40, 70, 45, 90, 65, 80, 50, 85, 60, 95, 75, 85, 60, 40, 55, 70, 90, 100, 80, 60, 85, 45, 75, 90, 60, 70, 50, 80, 65, 40].map((h, i) => (
                         <motion.div 
                           key={i} 
                           initial={{ height: 0 }}
                           whileInView={{ height: `${h}%` }}
                           whileHover={{ scaleY: 1.05, opacity: 1 }}
                           transition={{ 
                             height: { delay: i * 0.02, duration: 1, ease: [0.16, 1, 0.3, 1] },
                             scaleY: { duration: 0.2 }
                           }}
                           style={{ background: `hsl(var(--data-${Math.min(5, Math.max(1, Math.ceil(h / 20)))}))` }}
                           className="flex-1 rounded-full cursor-pointer transition-all duration-300 opacity-80" 
                         />
                       ))}
                    </div>

                    {/* Grid Overlay for realism */}
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />
                 </motion.div>
              </div>
           </div>
        </motion.div>
      </section>

      {/* TECHNICAL EXCELLENCE BANNER */}
      <section className="py-14 border-y border-border bg-notion-sunken">
        <div className="container mx-auto px-10">
           <div className="flex flex-col md:flex-row items-center justify-around gap-12 md:gap-24">
              <div className="flex flex-col items-center md:items-start">
                 <span className="text-eyebrow uppercase text-notion-ink-muted mb-2">Latency</span>
                 <span className="font-display text-h3 text-notion-ink whitespace-nowrap">0.4ms Global Avg.</span>
              </div>
              <div className="flex flex-col items-center md:items-start md:border-l border-border/60 md:pl-24 hidden md:flex">
                 <span className="text-eyebrow uppercase text-notion-ink-muted mb-2">Reliability</span>
                 <span className="font-display text-h3 text-notion-ink whitespace-nowrap">99.99% Uptime</span>
              </div>
              <div className="flex flex-col items-center md:items-start md:border-l border-border/60 md:pl-24 hidden lg:flex">
                 <span className="text-eyebrow uppercase text-notion-ink-muted mb-2">Security</span>
                 <span className="font-display text-h3 text-notion-ink whitespace-nowrap">AES-256 E2E</span>
              </div>
              <div className="flex flex-col items-center md:items-start md:border-l border-border/60 md:pl-24">
                 <span className="text-eyebrow uppercase text-notion-ink-muted mb-2">Architecture</span>
                 <span className="font-display text-h3 text-notion-ink whitespace-nowrap">Edge-First Core</span>
              </div>
           </div>
        </div>
      </section>

      {/* MODULE NAVIGATION */}
      <section id="ecosystem" className="py-16 relative">
        <div className="container mx-auto px-6 md:px-10">
          <div className="max-w-3xl mb-12">
             <Badge variant="outline" className="mb-5">Integrated Ecosystem</Badge>
             <h2 className="font-display text-4xl md:text-6xl tracking-[-0.03em] mb-5 text-notion-ink leading-[1.05]">Built for scale.</h2>
             <p className="text-lg text-muted-foreground leading-relaxed font-medium opacity-90 max-w-2xl">
               Hover through our core modules to see how Eventra orchestrates every layer of your experience with surgical precision.
             </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-10 items-start">
            {/* Module List */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-4">
               {MODULES.map((module) => (
                 <button
                   key={module.id}
                   onMouseEnter={() => setActiveModule(module.id)}
                   className={`w-full text-left p-6 rounded-2xl transition-all duration-300 flex flex-col gap-4 group relative ${
                     activeModule === module.id 
                       ? 'bg-notion-surface shadow-notion-elevated -translate-y-1' 
                       : 'bg-notion-surface shadow-notion-soft hover:shadow-notion-elevated'
                   }`}
                 >
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                     activeModule === module.id ? 'bg-notion-primary text-notion-on-primary' : 'bg-notion-sunken text-notion-ink-muted group-hover:text-notion-ink'
                   }`}>
                     <module.icon className="w-5 h-5" />
                   </div>
                   <div>
                     <h3 className={`text-body-sm font-medium transition-colors ${
                       activeModule === module.id ? 'text-notion-ink' : 'text-notion-ink-muted'
                     }`}>{module.title}</h3>
                   </div>
                   {activeModule === module.id && (
                     <motion.div 
                       layoutId="active-module-pill"
                       className="absolute inset-0 ring-2 ring-notion-ink rounded-2xl pointer-events-none"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                     />
                   )}
                 </button>
               ))}
            </div>

            {/* Module Preview */}
            <div className="lg:col-span-7 relative rounded-3xl bg-notion-surface overflow-hidden flex flex-col p-0 min-h-[500px] shadow-notion-elevated">
               <div className="h-12 border-b border-border bg-notion-sunken flex items-center px-6 gap-3 shrink-0">
                  <div className="flex gap-2.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-600/20 shadow-sm" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/20 shadow-sm" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/20 shadow-sm" />
                  </div>
                  <div className="ml-6 text-caption font-mono text-notion-ink-faint">
                    {MODULES.find(m => m.id === activeModule)?.title} Module Preview
                  </div>
               </div>
               
               <div className="flex-1 p-8 md:p-12 flex flex-col min-h-0">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeModule}
                      initial={{ opacity: 0, scale: 0.98, x: 20 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 1.02, x: -20 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex-1 flex flex-col min-h-0"
                    >
                      <div className="flex-1 min-h-0">
                        {MODULES.find(m => m.id === activeModule)?.preview}
                      </div>
                      
                      <div className="mt-8 md:mt-10 pt-8 border-t border-border/60 shrink-0">
                         <h4 className="font-display text-h3 text-notion-ink mb-3">Key Capabilities</h4>
                         <p className="text-body-md text-notion-ink-muted leading-relaxed">
                            {MODULES.find(m => m.id === activeModule)?.description}
                         </p>
                      </div>
                    </motion.div>
                  </AnimatePresence>
               </div>
               
               {/* Decorative background for preview */}
               <div className="absolute inset-0 -z-10 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* SMART TOOLS CAROUSEL */}
      <section id="features" className="py-28 bg-notion-sunken overflow-hidden">
        <div className="container mx-auto px-10">
           <div className="flex flex-col items-center text-center max-w-4xl mx-auto mb-20">
              <Badge variant="outline" className="mb-5">Neural Augmentation</Badge>
              <h2 className="font-display text-4xl md:text-6xl tracking-[-0.03em] mb-5 text-notion-ink leading-[1.05]">Smart Tools for <br /> Smarter Events.</h2>
              <p className="text-base text-muted-foreground leading-loose font-medium opacity-90 max-w-3xl">
                Our neural layer automates the heavy lifting, extracting actionable insights from every interaction.
              </p>
           </div>

           <div className="relative">
              <div className="flex justify-center gap-6 mb-12">
                 {AI_FEATURES.map((_, i) => (
                   <button 
                     key={i}
                     onMouseEnter={() => setActiveAIIndex(i)}
                     className={`group relative h-10 w-10 flex items-center justify-center`}
                   >
                      <span className={`text-body-sm font-mono transition-colors ${activeAIIndex === i ? 'text-notion-ink' : 'text-notion-ink-faint'}`}>0{i+1}</span>
                      {activeAIIndex === i && (
                        <motion.div 
                          layoutId="ai-indicator"
                          className="absolute inset-0 border-b-2 border-notion-ink"
                        />
                      )}
                   </button>
                 ))}
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                 {AI_FEATURES.map((feature, i) => (
                   <motion.div
                     key={i}
                     initial={false}
                     animate={{ 
                       opacity: activeAIIndex === i ? 1 : 0.4,
                       y: activeAIIndex === i ? 0 : 20,
                       scale: activeAIIndex === i ? 1 : 0.95,
                     }}
                     transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                     className={`p-8 rounded-2xl transition-all cursor-pointer ${
                        activeAIIndex === i 
                          ? 'bg-notion-surface shadow-notion-elevated' 
                          : 'bg-notion-surface/60 shadow-notion-soft'
                     }`}
                     onMouseEnter={() => setActiveAIIndex(i)}
                   >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-all duration-300 ${
                         activeAIIndex === i ? 'bg-notion-primary text-notion-on-primary' : 'bg-notion-sunken text-notion-ink-muted'
                      }`}>
                         <feature.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-display text-h3 mb-3 text-notion-ink">{feature.title}</h3>
                      <p className="text-body-sm text-notion-ink-muted leading-relaxed">{feature.description}</p>
                   </motion.div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* INTEGRATION VISUALIZATION */}
      <section className="py-28 relative bg-gradient-to-b from-background via-notion-sunken/40 to-background overflow-hidden border-t border-border/40">
        <div className="container mx-auto px-6 md:px-10 text-center">
           <div className="max-w-3xl mx-auto mb-16 space-y-4">
              <Badge variant="outline" className="px-3.5 py-1 text-xs font-semibold tracking-wide uppercase bg-background/80 backdrop-blur-sm">
                Omnichannel Ecosystem
              </Badge>
              <h2 className="font-display text-4xl md:text-6xl tracking-[-0.035em] text-notion-ink leading-[1.05]">
                 Unified <span className="italic text-notion-ink-faint">Control.</span>
              </h2>
              <p className="text-body-md md:text-lg text-notion-ink-muted leading-relaxed">
                Eventra seamlessly bridges your favorite collaboration and production tools into a synchronized operations mesh — streaming schedules, live communication, design specs, and attendee telemetry directly to your command center.
              </p>
           </div>
           
           {/* Hub & Mesh Container */}
           <div className="relative max-w-6xl mx-auto my-6">
              {/* Desktop SVG Connecting Lines */}
              <div className="absolute inset-0 pointer-events-none hidden lg:block" style={{ zIndex: 0 }}>
                 <svg className="w-full h-full" viewBox="0 0 1000 480" fill="none" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="stream-left" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                        <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="hsl(var(--data-5))" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="stream-right" x1="100%" y1="0%" x2="0%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                        <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="hsl(var(--data-5))" stopOpacity="1" />
                      </linearGradient>
                    </defs>

                    {/* Left Connectors */}
                    {[
                      "M 260 55 C 380 55, 420 240, 500 240",
                      "M 260 145 C 370 145, 430 240, 500 240",
                      "M 260 235 C 360 235, 440 240, 500 240",
                      "M 260 325 C 370 325, 430 240, 500 240"
                    ].map((d, i) => (
                      <g key={`left-${i}`}>
                        <path d={d} stroke="currentColor" strokeWidth="1.5" className="text-border/60 dark:text-border/40" />
                        <motion.path
                          d={d}
                          stroke="url(#stream-left)"
                          strokeWidth="2.5"
                          strokeDasharray="24 120"
                          initial={{ strokeDashoffset: 144 }}
                          animate={{ strokeDashoffset: -144 }}
                          transition={{ 
                            duration: 2.8, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: i * 0.35
                          }}
                        />
                      </g>
                    ))}

                    {/* Right Connectors */}
                    {[
                      "M 740 55 C 620 55, 580 240, 500 240",
                      "M 740 145 C 630 145, 570 240, 500 240",
                      "M 740 235 C 640 235, 560 240, 500 240",
                      "M 740 325 C 630 325, 570 240, 500 240"
                    ].map((d, i) => (
                      <g key={`right-${i}`}>
                        <path d={d} stroke="currentColor" strokeWidth="1.5" className="text-border/60 dark:text-border/40" />
                        <motion.path
                          d={d}
                          stroke="url(#stream-right)"
                          strokeWidth="2.5"
                          strokeDasharray="24 120"
                          initial={{ strokeDashoffset: 144 }}
                          animate={{ strokeDashoffset: -144 }}
                          transition={{ 
                            duration: 2.8, 
                            repeat: Infinity, 
                            ease: "linear",
                            delay: i * 0.35 + 0.15
                          }}
                        />
                      </g>
                    ))}
                 </svg>
              </div>

              {/* 3-Column Visual Layout (Desktop) / Stood-up Grid (Mobile) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                 
                 {/* Left Column: Productivity & Comms */}
                 <div className="lg:col-span-4 flex flex-col gap-3.5 order-2 lg:order-1">
                    {[
                      { 
                        name: "Notion", 
                        role: "Docs & Runbooks", 
                        tag: "2-Way Live", 
                        icon: NotionLogo, 
                        bg: "bg-neutral-900 text-white dark:bg-neutral-800",
                        glow: "group-hover:border-neutral-400/40"
                      },
                      { 
                        name: "Slack", 
                        role: "Channel Dispatch", 
                        tag: "Instant Ping", 
                        icon: SlackLogo, 
                        bg: "bg-white dark:bg-neutral-900 border border-border/40",
                        glow: "group-hover:border-emerald-500/40"
                      },
                      { 
                        name: "Discord", 
                        role: "Stage & Voice Hub", 
                        tag: "Broadcasting", 
                        icon: DiscordLogo, 
                        bg: "bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/20",
                        glow: "group-hover:border-[#5865F2]/50"
                      },
                      { 
                        name: "Google Calendar", 
                        role: "Dynamic Schedule", 
                        tag: "Auto-Sync", 
                        icon: GoogleCalendarLogo, 
                        bg: "bg-white dark:bg-neutral-900 border border-border/40",
                        glow: "group-hover:border-blue-500/40"
                      }
                    ].map((tool, i) => (
                      <motion.div
                        key={tool.name}
                        initial={{ opacity: 0, x: -24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.6 }}
                        whileHover={{ y: -3, scale: 1.02 }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl bg-notion-surface/90 backdrop-blur-md border border-border/60 shadow-notion-soft hover:shadow-notion-elevated transition-all group cursor-default text-left",
                          tool.glow
                        )}
                      >
                         <div className="flex items-center gap-3.5 min-w-0">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", tool.bg)}>
                               <tool.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                               <h4 className="text-body-sm font-semibold text-notion-ink tracking-tight truncate">{tool.name}</h4>
                               <p className="text-[11px] text-notion-ink-muted truncate font-medium">{tool.role}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-notion-sunken text-[10px] font-mono font-medium text-notion-ink-secondary shrink-0 border border-border/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-data-positive animate-pulse" />
                            {tool.tag}
                         </div>
                      </motion.div>
                    ))}
                 </div>

                 {/* Center Column: Eventra Core Hub */}
                 <div className="lg:col-span-4 flex flex-col items-center justify-center order-1 lg:order-2 py-4 lg:py-0">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="relative flex items-center justify-center"
                    >
                       {/* Animated Radial Pulse Rings */}
                       <motion.div 
                         animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.6, 0.35] }}
                         transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                         className="absolute -inset-10 rounded-full border border-primary/20 bg-primary/5 pointer-events-none"
                       />
                       <motion.div 
                         animate={{ scale: [1.05, 0.98, 1.05], opacity: [0.2, 0.45, 0.2] }}
                         transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                         className="absolute -inset-20 rounded-full border border-dashed border-primary/20 pointer-events-none hidden sm:block"
                       />

                       {/* Central Core Console */}
                       <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-[2.75rem] bg-gradient-to-b from-notion-surface via-notion-surface to-notion-sunken p-6 border-2 border-border/80 shadow-notion-elevated flex flex-col items-center justify-between text-center overflow-hidden group">
                          {/* Inner Lighting Glow */}
                          <div className="absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
                          
                          {/* Top Status */}
                          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-notion-sunken/80 border border-border/60 backdrop-blur-md">
                             <Zap className="w-3 h-3 text-data-3 fill-data-3 animate-bounce" />
                             <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-notion-ink">Core Engine</span>
                          </div>

                          {/* Center Emblem */}
                          <div className="relative my-auto flex flex-col items-center">
                             <div className="w-20 h-20 rounded-2xl bg-notion-primary text-notion-on-primary flex items-center justify-center shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-300">
                                <Logo 
                                  iconClassName="w-12 h-12 text-notion-on-primary" 
                                  className="gap-0" 
                                />
                             </div>
                             <span className="font-display font-bold text-lg text-notion-ink tracking-tight mt-3">Eventra Mesh</span>
                             <span className="text-[11px] font-mono text-notion-ink-muted">0.2ms latency • 100% synced</span>
                          </div>

                          {/* Bottom Pulse Bar */}
                          <div className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-notion-sunken/90 border border-border/40 text-[10px] font-mono text-notion-ink-secondary">
                             <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2 h-2 rounded-full bg-data-positive animate-pulse" />
                                32 Active Nodes
                             </span>
                             <span className="text-data-positive font-bold">Encrypted</span>
                          </div>
                       </div>
                    </motion.div>
                 </div>

                 {/* Right Column: Creative, Production & Infra */}
                 <div className="lg:col-span-4 flex flex-col gap-3.5 order-3">
                    {[
                      { 
                        name: "Figma", 
                        role: "Stage Assets & Specs", 
                        tag: "Live Spec", 
                        icon: FigmaLogo, 
                        bg: "bg-white dark:bg-neutral-900 border border-border/40",
                        glow: "group-hover:border-purple-500/40"
                      },
                      { 
                        name: "Miro", 
                        role: "Interactive Boards", 
                        tag: "Multi-Canvas", 
                        icon: MiroLogo, 
                        bg: "bg-[#FFD02F]/10 border border-[#FFD02F]/30",
                        glow: "group-hover:border-[#FFD02F]/60"
                      },
                      { 
                        name: "Stripe", 
                        role: "Ticketing & Payouts", 
                        tag: "Instant Pay", 
                        icon: StripeLogo, 
                        bg: "bg-[#635BFF]/10 border border-[#635BFF]/30",
                        glow: "group-hover:border-[#635BFF]/50"
                      },
                      { 
                        name: "Zoom", 
                        role: "Hybrid Video Mesh", 
                        tag: "4K Pipeline", 
                        icon: ZoomLogo, 
                        bg: "bg-[#2D8CFF]/10 border border-[#2D8CFF]/30",
                        glow: "group-hover:border-[#2D8CFF]/50"
                      }
                    ].map((tool, i) => (
                      <motion.div
                        key={tool.name}
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1, duration: 0.6 }}
                        whileHover={{ y: -3, scale: 1.02 }}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl bg-notion-surface/90 backdrop-blur-md border border-border/60 shadow-notion-soft hover:shadow-notion-elevated transition-all group cursor-default text-left",
                          tool.glow
                        )}
                      >
                         <div className="flex items-center gap-3.5 min-w-0">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110", tool.bg)}>
                               <tool.icon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                               <h4 className="text-body-sm font-semibold text-notion-ink tracking-tight truncate">{tool.name}</h4>
                               <p className="text-[11px] text-notion-ink-muted truncate font-medium">{tool.role}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-notion-sunken text-[10px] font-mono font-medium text-notion-ink-secondary shrink-0 border border-border/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-data-positive animate-pulse" />
                            {tool.tag}
                         </div>
                      </motion.div>
                    ))}
                 </div>

              </div>
           </div>

           {/* Value Pill Banner */}
           <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              {[
                { title: "100+ Connectors", subtitle: "Zero-code webhook setup" },
                { title: "< 1.2ms Global Sync", subtitle: "Edge-replicated pipelines" },
                { title: "AES-256 Verified", subtitle: "End-to-end payload trust" },
                { title: "Bi-Directional State", subtitle: "Zero manual reconciliation" }
              ].map((feat, i) => (
                <div key={i} className="p-4 rounded-2xl bg-notion-surface/60 border border-border/40 text-center flex flex-col items-center justify-center gap-1 shadow-sm">
                   <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-data-positive" />
                      <span className="text-xs font-bold text-notion-ink tracking-tight">{feat.title}</span>
                   </div>
                   <span className="text-[10px] text-notion-ink-muted">{feat.subtitle}</span>
                </div>
              ))}
           </div>
        </div>
      </section>

      {/* LIVE INFRASTRUCTURE STATUS */}
      <section id="events" className="py-24">
        <div className="container mx-auto px-10">
           <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
              <div className="max-w-2xl text-left">
                 <Badge variant="outline" className="mb-5">Infrastructure Pulse</Badge>
                 <h2 className="font-display text-4xl md:text-6xl tracking-[-0.03em] text-notion-ink leading-[1.05]">Edge Nodes.</h2>
                 <p className="mt-4 text-body-md text-notion-ink-muted leading-relaxed">
                   Real-time synchronization status across our global high-availability network.
                 </p>
              </div>
              <Button size="xl" variant="secondary" className="px-9" asChild>
                 <Link href="/explore">View Network</Link>
              </Button>
           </div>

           <div className="grid md:grid-cols-3 gap-10">
             {featuredEvents.length > 0 ? featuredEvents.slice(0, 3).map((event) => (
               <EventCard key={event.id} event={event} />
             )) : (
               [
                 { name: "North_America_East", region: "Virginia, US" },
                 { name: "Europe_Central_1", region: "Frankfurt, DE" },
                 { name: "Asia_Pacific_South", region: "Mumbai, IN" }
               ].map((node, i) => (
                 <div key={i} className="rounded-2xl bg-notion-surface p-8 flex flex-col gap-8 group relative overflow-hidden transition-all hover:-translate-y-1 shadow-notion-soft hover:shadow-notion-elevated">
                    <div className="flex justify-between items-start">
                       <div className="w-13 h-13 p-3.5 rounded-xl bg-notion-sunken flex items-center justify-center transition-all duration-300">
                          <Server className="w-6 h-6 text-notion-ink-muted group-hover:text-notion-ink transition-colors" />
                       </div>
                       <div className="px-3 py-1 rounded-full bg-data-positive-soft text-caption font-medium text-data-positive">
                          Active
                       </div>
                    </div>
                    <div className="space-y-6">
                       <div className="h-2 w-full bg-notion-sunken rounded-full overflow-hidden relative">
                          <motion.div 
                            className="absolute inset-y-0 left-0 fill-data-ramp rounded-full"
                            animate={{ 
                              x: ['-100%', '100%'],
                              width: ['20%', '40%', '20%']
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          />
                       </div>
                       <div className="h-2 w-2/3 bg-notion-sunken rounded-full" />
                    </div>
                    <div className="pt-6 mt-auto border-t border-border flex justify-between items-center text-caption font-mono text-notion-ink-muted">
                       <span>{node.name}</span>
                       <span className="flex items-center gap-2">
                         <div className="w-1 h-1 rounded-full bg-notion-ink-faint" />
                         {node.region}
                       </span>
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 relative overflow-hidden border-t border-border">
        
        <div className="container mx-auto px-10 relative z-10 text-center space-y-12">
           <motion.div
             initial={{ opacity: 0, scale: 0.9 }}
             whileInView={{ opacity: 1, scale: 1 }}
             className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-notion-sunken mb-6"
           >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-data-positive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-data-positive"></span>
              </span>
              <span className="text-eyebrow uppercase text-notion-ink-secondary">Public Beta v0.1_Operational</span>
           </motion.div>
           
           <h2 className="font-display text-5xl md:text-7xl tracking-[-0.035em] leading-[0.95] text-notion-ink">Scale your next <br /> <span className="italic text-notion-ink-faint">experience.</span></h2>
           
           <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6">
              <Button size="xl" className="px-12" asChild>
                 <Link href="/register">Get Started Free</Link>
              </Button>
              <Link href="#" className="text-notion-ink-secondary hover:text-notion-ink transition-all flex items-center gap-3 group text-body-md font-medium px-8 h-14 rounded-full hover:bg-accent border border-border">
                 Contact Sales <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Link>
           </div>
        </div>
      </section>

      <footer className="border-t border-border pt-16 pb-10 relative z-10">
        <div className="container mx-auto px-10">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-14">
              <div className="col-span-2 md:col-span-1 space-y-6">
                 <Logo showText />
                 <p className="text-body-sm text-notion-ink-muted leading-relaxed max-w-xs">
                    Engineered for high-performance delivery of modern live experiences.
                 </p>
              </div>
              {['Product', 'Company', 'Support'].map((cat) => (
                <div key={cat} className="space-y-6">
                   <h4 className="text-eyebrow uppercase text-notion-ink-muted">{cat}</h4>
                   <ul className="space-y-3 text-body-sm text-notion-ink-muted">
                      {['Features', 'Ecosystem', 'Network'].map((item) => (
                        <li key={item}><Link href="#" className="hover:text-notion-ink transition-colors">{item}</Link></li>
                      ))}
                   </ul>
                </div>
              ))}
           </div>
           
           <div className="pt-10 border-t border-border/40 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-8 text-caption text-notion-ink-muted">
                 <span>© 2026 Eventra Protocol Inc.</span>
                 <div className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 bg-data-positive rounded-full" />
                    <span className="text-data-positive">Systems_Nominal</span>
                 </div>
              </div>
              <div className="flex gap-6">
                 {[Globe, Linkedin, Twitter].map((Icon, i) => (
                   <div key={i} className="w-10 h-10 rounded-full bg-notion-sunken flex items-center justify-center hover:bg-accent transition-all cursor-pointer text-notion-ink-muted hover:text-notion-ink hover:-translate-y-0.5">
                      <Icon className="w-4 h-4" />
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
}
