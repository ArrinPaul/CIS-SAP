'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  MonitorUp, 
  MonitorOff, 
  Hand, 
  MessageSquare, 
  Users, 
  Settings, 
  PhoneOff, 
  Sparkles, 
  Volume2, 
  Radio, 
  Smile, 
  HelpCircle, 
  Maximize, 
  Minimize, 
  Send, 
  ArrowLeft, 
  ShieldCheck, 
  Crown,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';

interface LiveStageClientProps {
  event: {
    id: string;
    title: string;
    description: string;
    organizerId: string;
    type: string;
  };
}

interface ChatMessage {
  id: string;
  sender: string;
  avatar?: string;
  text: string;
  timestamp: string;
  isHost?: boolean;
}

export default function LiveStageClient({ event }: LiveStageClientProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'people' | 'qa'>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'Eventra Stage Bot',
      text: `Welcome to the live virtual stage for ${event.title}! Please keep microphones muted unless called on stage.`,
      timestamp: '10:00 AM',
      isHost: true,
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [attendeeCount, setAttendeeCount] = useState(42);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const isOrganizer = user && (user.id === event.organizerId || user.role === 'admin');

  // Toggle Camera
  const toggleCamera = async () => {
    if (isCameraOn) {
      if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => track.stop());
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: isMicOn });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setIsCameraOn(true);
        toast({ title: 'Camera Enabled' });
      } catch (err) {
        console.warn('Camera access denied or unavailable', err);
        // Fallback simulation mode
        setIsCameraOn(true);
        toast({ title: 'Camera Activated (Preview Mode)' });
      }
    }
  };

  // Toggle Microphone
  const toggleMic = async () => {
    if (isMicOn) {
      if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => track.stop());
      }
      setIsMicOn(false);
      toast({ title: 'Microphone Muted' });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (streamRef.current) {
          stream.getAudioTracks().forEach(track => streamRef.current?.addTrack(track));
        }
        setIsMicOn(true);
        toast({ title: 'Microphone Unmuted' });
      } catch (err) {
        setIsMicOn(true);
        toast({ title: 'Microphone Active' });
      }
    }
  };

  // Toggle Screen Sharing
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      setIsScreenSharing(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        toast({ title: 'Screen Sharing Started' });
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
        };
      } catch (err) {
        toast({ title: 'Screen Share Cancelled', variant: 'destructive' });
      }
    }
  };

  // Send Floating Reaction
  const sendReaction = (emoji: string) => {
    const reaction = {
      id: Date.now() + Math.random(),
      emoji,
      x: Math.floor(Math.random() * 60) + 20,
    };
    setFloatingReactions(prev => [...prev, reaction]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 2500);
  };

  // Send Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      sender: user?.name || 'Attendee',
      avatar: user?.image || undefined,
      text: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHost: !!isOrganizer,
    };

    setChatMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      stageContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div ref={stageContainerRef} className="min-h-screen bg-neutral-950 text-white flex flex-col font-sans select-none">
      
      {/* TOP STAGE HEADER */}
      <header className="h-16 border-b border-neutral-800/80 px-6 flex items-center justify-between bg-neutral-900/60 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="sm" asChild className="text-neutral-400 hover:text-white hover:bg-neutral-800 gap-2">
            <Link href={`/events/${event.id}`}>
              <ArrowLeft className="w-4 h-4" /> Back to Event
            </Link>
          </Button>

          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              LIVE STAGE
            </div>
            <h1 className="text-sm font-semibold truncate text-neutral-200 hidden md:block">
              {event.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800/80 border border-neutral-700 text-xs text-neutral-300 font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{attendeeCount} Watching</span>
          </div>

          <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl">
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT / CENTER: STAGE VIDEO VIEWPORT */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden relative bg-black/40">
          
          {/* FLOATING REACTION STREAM */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
            <AnimatePresence>
              {floatingReactions.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 1, y: '80%', x: `${r.x}%`, scale: 0.8 }}
                  animate={{ opacity: 0, y: '10%', scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2.2, ease: 'easeOut' }}
                  className="absolute text-4xl"
                >
                  {r.emoji}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* MAIN STAGE TILES */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 rounded-3xl overflow-hidden relative">
            
            {/* STAGE SCREEN / HOST TILE */}
            <div className="relative rounded-2xl bg-neutral-900 border border-neutral-800/90 overflow-hidden flex items-center justify-center shadow-2xl group">
              {isCameraOn ? (
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover mirror"
                />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center shadow-inner">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={user?.image || undefined} />
                      <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                        {user?.name?.[0] || 'H'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-neutral-200">{user?.name || 'Stage Host'}</p>
                    <p className="text-xs text-neutral-500">Camera Off</p>
                  </div>
                </div>
              )}

              {/* Status Tags on Video */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <Badge className="bg-neutral-950/80 backdrop-blur-md border border-neutral-700 text-neutral-200 font-medium text-[11px] gap-1.5">
                  <Crown className="w-3 h-3 text-amber-400" /> Host
                </Badge>
                {isMicOn && (
                  <Badge className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[11px] gap-1">
                    <Mic className="w-3 h-3" /> Speaking
                  </Badge>
                )}
              </div>

              <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-neutral-950/70 backdrop-blur-md text-xs font-semibold text-neutral-300">
                {user?.name || 'You'} (Host)
              </div>
            </div>

            {/* SECONDARY PRESENTER / SCREEN SHARE TILE */}
            <div className="relative rounded-2xl bg-neutral-900/80 border border-neutral-800/90 overflow-hidden flex items-center justify-center">
              {isScreenSharing ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-neutral-950 p-6 text-center">
                  <MonitorUp className="w-16 h-16 text-primary mb-3 animate-pulse" />
                  <p className="text-sm font-semibold text-neutral-200">Screen Sharing Active</p>
                  <p className="text-xs text-neutral-500">Broadcasting display stream to 42 attendees</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="w-20 h-20 rounded-2xl bg-neutral-800/60 border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500">
                    <Radio className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-neutral-300">Stage Co-Host Podium</p>
                    <p className="text-xs text-neutral-500">Waiting for guest speaker to take the floor</p>
                  </div>
                </div>
              )}

              <div className="absolute bottom-4 left-4 px-3 py-1 rounded-lg bg-neutral-950/70 backdrop-blur-md text-xs font-semibold text-neutral-400">
                Guest Podium
              </div>
            </div>

          </div>

          {/* STAGE BOTTOM CONTROL DOCK */}
          <div className="mt-4 h-20 rounded-2xl bg-neutral-900/90 border border-neutral-800/80 backdrop-blur-xl px-4 sm:px-8 flex items-center justify-between shadow-2xl">
            
            {/* Quick Reactions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {['👏', '🔥', '🎉', '❤️', '💡'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-lg shadow-sm"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Center Broadcast Controls */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant={isMicOn ? 'secondary' : 'destructive'}
                size="icon"
                onClick={toggleMic}
                className="w-12 h-12 rounded-2xl transition-all shadow-lg"
              >
                {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isCameraOn ? 'secondary' : 'destructive'}
                size="icon"
                onClick={toggleCamera}
                className="w-12 h-12 rounded-2xl transition-all shadow-lg"
              >
                {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                variant={isScreenSharing ? 'default' : 'secondary'}
                size="icon"
                onClick={toggleScreenShare}
                className="w-12 h-12 rounded-2xl transition-all shadow-lg hidden sm:flex"
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
              </Button>

              <Button
                variant={isHandRaised ? 'default' : 'secondary'}
                size="icon"
                onClick={() => {
                  setIsHandRaised(!isHandRaised);
                  toast({ title: isHandRaised ? 'Hand Lowered' : 'Hand Raised to Speak' });
                }}
                className={cn("w-12 h-12 rounded-2xl transition-all shadow-lg", isHandRaised && "bg-amber-500 hover:bg-amber-600")}
              >
                <Hand className="w-5 h-5" />
              </Button>
            </div>

            {/* Leave Stage */}
            <Button
              variant="destructive"
              asChild
              className="rounded-xl h-11 px-5 font-bold gap-2 shadow-lg"
            >
              <Link href={`/events/${event.id}`}>
                <PhoneOff className="w-4 h-4" /> Leave Stage
              </Link>
            </Button>

          </div>

        </div>

        {/* RIGHT SIDEBAR: CHAT & AUDIENCE */}
        <div className="w-80 sm:w-96 border-l border-neutral-800 bg-neutral-900/90 flex flex-col shrink-0">
          
          {/* Sidebar Tabs */}
          <div className="grid grid-cols-3 border-b border-neutral-800 p-2 gap-1 bg-neutral-950/40 text-xs font-semibold">
            <button
              onClick={() => setActiveSidebarTab('chat')}
              className={cn(
                "py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5",
                activeSidebarTab === 'chat' ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Stage Chat
            </button>
            <button
              onClick={() => setActiveSidebarTab('people')}
              className={cn(
                "py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5",
                activeSidebarTab === 'people' ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <Users className="w-3.5 h-3.5" /> People ({attendeeCount})
            </button>
            <button
              onClick={() => setActiveSidebarTab('qa')}
              className={cn(
                "py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5",
                activeSidebarTab === 'qa' ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200"
              )}
            >
              <HelpCircle className="w-3.5 h-3.5" /> Q&A
            </button>
          </div>

          {/* TAB 1: LIVE STAGE CHAT */}
          {activeSidebarTab === 'chat' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatMessages.map((msg) => (
                  <div key={msg.id} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={cn("font-bold", msg.isHost ? "text-amber-400" : "text-neutral-300")}>
                        {msg.sender} {msg.isHost && '👑'}
                      </span>
                      <span className="text-neutral-500">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-800/40 p-2.5 rounded-xl border border-neutral-800/60">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-neutral-800 bg-neutral-950/40 flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Send message to stage..."
                  className="bg-neutral-800/80 border-neutral-700 text-white text-xs h-10 rounded-xl"
                />
                <Button type="submit" size="icon" className="h-10 w-10 rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}

          {/* TAB 2: AUDIENCE & SPEAKERS */}
          {activeSidebarTab === 'people' && (
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">On Stage</p>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-800/50 border border-neutral-700/40">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">H</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-bold text-white">{user?.name || 'Stage Host'}</p>
                    <p className="text-[10px] text-amber-400">Host & Speaker</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">Live</Badge>
              </div>

              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider pt-3">Audience ({attendeeCount})</p>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-neutral-800/40 transition-colors">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-xs text-neutral-300">Attendee #{i + 1}</span>
                  </div>
                  <span className="text-[10px] text-neutral-500 font-mono">Listening</span>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Q&A */}
          {activeSidebarTab === 'qa' && (
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-neutral-800/40 border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-200">Will session slides be shared?</span>
                    <Badge variant="secondary" className="text-[10px]">12 votes</Badge>
                  </div>
                  <p className="text-[11px] text-neutral-400">Asked by Alex M.</p>
                </div>
              </div>

              <Button variant="outline" className="w-full rounded-xl border-neutral-700 text-xs">
                Ask a Question
              </Button>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
