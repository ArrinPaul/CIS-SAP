'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Terminal, 
  Bot, 
  MessageSquare, 
  ChevronRight, 
  Loader2, 
  Send,
  FileText,
  Activity,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateDiagram, formatNotes, moderateContent } from '@/app/actions/ai-tools';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';

export function AIToolsClient() {
  const { toast } = useToast();
  const [activeTool, setActiveTool] = useState('notes');
  const [loading, setLoading] = useState(false);
  
  // Notes State
  const [rawNotes, setRawNotes] = useState('');
  const [structuredNotes, setStructuredNotes] = useState<{ summary: string, actionItems: string[] } | null>(null);
  
  // Diagram State
  const [diagramPrompt, setDiagramPrompt] = useState('');
  const [mermaidCode, setMermaidCode] = useState<string | null>(null);

  const handleFormatNotes = async () => {
    if (!rawNotes.trim()) return;
    setLoading(true);
    try {
      const res = await formatNotes(rawNotes);
      if (res.success) {
        setStructuredNotes(res.data);
        toast({ title: 'Notes Structured' });
      }
    } catch (e) {
      toast({ title: 'Operation Failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDiagram = async () => {
    if (!diagramPrompt.trim()) return;
    setLoading(true);
    try {
      const res = await generateDiagram(diagramPrompt);
      if (res.success && res.code) {
        setMermaidCode(res.code);
        toast({ title: 'Diagram Generated' });
      }
    } catch (e) {
      toast({ title: 'Generation Failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 pb-24 px-6 md:px-10">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-notion-hairline pb-10">
        <div className="space-y-3 text-left">
           <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-notion-canvas border-notion-hairline text-notion-ink-faint font-bold px-3 py-0.5 rounded-md shadow-sm uppercase text-[9px] tracking-widest">
                Neural Augmentation
              </Badge>
           </div>
           <h1 className="text-4xl md:text-5xl font-display font-black tracking-tighter text-notion-ink uppercase">
             AI Smart <span className="text-notion-primary italic">Tools.</span>
           </h1>
           <p className="text-lg text-notion-ink-muted font-medium max-w-2xl leading-relaxed">
             Advanced utilities for event organizers and attendees, powered by the Eventra Intelligence Mesh.
           </p>
        </div>
      </header>

      <div className="grid lg:grid-cols-12 gap-12">
        {/* TOOL SELECTION */}
        <div className="lg:col-span-4 space-y-6">
           <div className="grid gap-4">
              {[
                { id: 'notes', label: 'Notes Formatter', icon: FileText, desc: 'Structure raw session notes' },
                { id: 'diagram', label: 'Text to Diagram', icon: Layers, desc: 'Generate Mermaid logic flows' },
                { id: 'moderator', label: 'Safety Scanner', icon: ShieldCheck, desc: 'Real-time content moderation' },
              ].map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={cn(
                    "w-full text-left p-6 rounded-[2rem] border transition-all duration-300 flex flex-col gap-3 group relative",
                    activeTool === tool.id 
                      ? 'bg-white dark:bg-zinc-950 border-primary shadow-notion-elevated -translate-y-1' 
                      : 'bg-notion-canvas-soft border-notion-hairline hover:border-notion-ink-faint hover:bg-notion-surface dark:hover:bg-zinc-900'
                  )}
                >
                   <div className={cn(
                     "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                     activeTool === tool.id ? "bg-primary text-primary-foreground" : "bg-notion-canvas border border-notion-hairline text-notion-ink-faint group-hover:text-notion-ink"
                   )}>
                      <tool.icon className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="font-bold text-notion-ink leading-none">{tool.label}</h3>
                      <p className="text-[10px] font-bold text-notion-ink-faint mt-1 uppercase tracking-widest">{tool.desc}</p>
                   </div>
                </button>
              ))}
           </div>

           <div className="p-8 rounded-[2.5rem] bg-notion-primary/5 border border-notion-primary/10 space-y-4">
              <div className="flex items-center gap-2 text-notion-primary">
                 <Sparkles className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Mesh Intelligence</span>
              </div>
              <p className="text-xs font-medium text-notion-ink-muted leading-relaxed italic">
                 "Our neural layer processes your data locally within the secure mesh, ensuring maximum privacy and minimal latency."
              </p>
           </div>
        </div>

        {/* WORKSPACE */}
        <div className="lg:col-span-8">
           <Card className="border-notion-hairline bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-notion-soft overflow-hidden min-h-[600px] flex flex-col">
              <CardHeader className="p-8 border-b border-notion-hairline bg-notion-canvas-soft/30 flex flex-row items-center justify-between">
                 <div className="space-y-1">
                    <CardTitle className="text-xl font-bold tracking-tight">Workspace_Active</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest">Syncing with Node_0x1</CardDescription>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-widest">Online</span>
                 </div>
              </CardHeader>

              <CardContent className="p-8 flex-1 flex flex-col gap-10">
                 <AnimatePresence mode="wait">
                    {activeTool === 'notes' && (
                      <motion.div 
                        key="notes" 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col gap-8"
                      >
                         <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-notion-ink-faint ml-1">Input Raw Notes</label>
                            <Textarea 
                              placeholder="Paste your event notes, key takeaways, or session transcripts here..." 
                              className="min-h-[200px] rounded-2xl border-notion-hairline bg-notion-canvas-soft/50 text-sm font-medium leading-loose focus:bg-notion-surface transition-all"
                              value={rawNotes}
                              onChange={(e) => setRawNotes(e.target.value)}
                            />
                         </div>
                         
                         <Button onClick={handleFormatNotes} disabled={loading || !rawNotes.trim()} className="w-fit rounded-xl font-black px-10 h-12 shadow-notion-soft uppercase text-[10px] tracking-widest">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Terminal className="w-4 h-4 mr-2" />} 
                            Process Intelligence
                         </Button>

                         {structuredNotes && (
                           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 p-8 rounded-[2rem] bg-notion-canvas-soft border border-notion-hairline shadow-inner">
                              <div className="space-y-3">
                                 <h4 className="text-sm font-black uppercase tracking-widest text-notion-primary">Executive Summary</h4>
                                 <p className="text-base font-medium leading-loose text-notion-ink-muted">{structuredNotes.summary}</p>
                              </div>
                              <div className="space-y-4">
                                 <h4 className="text-sm font-black uppercase tracking-widest text-notion-primary">Action Items</h4>
                                 <div className="grid gap-3">
                                    {structuredNotes.actionItems.map((item, i) => (
                                      <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-notion-hairline">
                                         <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                         <span className="text-sm font-bold text-notion-ink">{item}</span>
                                      </div>
                                    ))}
                                 </div>
                              </div>
                           </motion.div>
                         )}
                      </motion.div>
                    )}

                    {activeTool === 'diagram' && (
                       <motion.div 
                        key="diagram" 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col gap-8"
                      >
                         <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-notion-ink-faint ml-1">Flow Description</label>
                            <Input 
                              placeholder="e.g., A sequence diagram where user logs in, auth responds, and dashboard loads" 
                              className="h-14 rounded-2xl border-notion-hairline bg-notion-canvas-soft/50 text-sm font-bold uppercase tracking-widest focus:bg-notion-surface transition-all"
                              value={diagramPrompt}
                              onChange={(e) => setDiagramPrompt(e.target.value)}
                            />
                         </div>
                         
                         <Button onClick={handleGenerateDiagram} disabled={loading || !diagramPrompt.trim()} className="w-fit rounded-xl font-black px-10 h-12 shadow-notion-soft uppercase text-[10px] tracking-widest">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Layers className="w-4 h-4 mr-2" />} 
                            Generate Diagram
                         </Button>

                         {mermaidCode && (
                           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-notion-ink-faint ml-1">Mermaid_Protocol_Output</p>
                              <div className="p-6 rounded-[1.5rem] bg-zinc-900 text-emerald-500 font-mono text-xs overflow-x-auto border border-zinc-800">
                                 <pre>{mermaidCode}</pre>
                              </div>
                              <p className="text-xs text-notion-ink-muted italic">Copy this code into any Mermaid.js viewer to visualize your flow.</p>
                           </motion.div>
                         )}
                      </motion.div>
                    )}

                    {activeTool === 'moderator' && (
                       <motion.div 
                        key="moderator" 
                        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                        className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-8"
                      >
                         <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <ShieldCheck size={48} />
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-2xl font-bold tracking-tight">Active Sentinel</h3>
                            <p className="text-sm font-medium text-notion-ink-muted max-w-sm mx-auto uppercase tracking-widest">The Safety Scanner is currently active and monitoring all activity feeds within the mesh.</p>
                         </div>
                         <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4 w-full max-w-md">
                            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">All Systems Protected</span>
                         </div>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
