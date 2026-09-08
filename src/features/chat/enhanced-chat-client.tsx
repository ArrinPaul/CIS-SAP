'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageCircle, 
  Plus, 
  Shield, 
  Send,
  Loader2,
  ChevronUp,
  Image as ImageIcon,
  Paperclip,
  FileIcon,
  X,
  FileText
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { UserPicker } from './user-picker';
import { getChatRooms, getChatMessages, sendMessage, createChatRoom } from '@/app/actions/chat';
import { useStorage } from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';

export default function EnhancedChatClient({ initialRoomId }: { initialRoomId?: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadFile } = useStorage();

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId || null);
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isStartingDM, setIsStartingDM] = useState(false);
  const [uploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ url: string, type: string, name: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userCacheRef = useRef<Record<string, { id: string, name: string | null, image: string | null }>>({});

  const [newRoom, setNewRoom] = useState({ name: '', type: 'group' as const });

  // 1. Fetch Rooms
  useEffect(() => {
    async function loadRooms() {
      const rooms = await getChatRooms();
      setChatRooms(rooms);
      setLoadingRooms(false);
    }
    loadRooms();
  }, []);

  // 2. Fetch Messages when room changes
  useEffect(() => {
    if (!selectedRoomId) return;

    async function loadMessages() {
      setLoadingMessages(true);
      const msgs = await getChatMessages(selectedRoomId!);
      
      // Cache users from historical messages
      msgs.forEach(m => {
        if (m.sender && !userCacheRef.current[m.sender.id]) {
          userCacheRef.current[m.sender.id] = m.sender;
        }
      });

      setMessages(msgs);
      setLoadingMessages(false);
      
      // Scroll to bottom after loading
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 100);
    }
    loadMessages();

    // 3. Real-time Subscription with Reconnection Logic
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribeToRoom = () => {
      if (cancelled) return;

      // supabase.channel() dedupes by topic: if a channel for this room's
      // topic already exists (e.g. an abandoned instance from a prior
      // effect run — React 18 dev mode double-invokes this effect, and
      // removeChannel() below is async, so it may not have finished
      // detaching the old one yet), it returns that same already-subscribed
      // channel instead of a fresh one. Calling `.on()` on an
      // already-subscribed channel throws, so make sure none is left over
      // before creating a new one.
      const topic = `realtime:room:${selectedRoomId}`;
      const stale = supabase.getChannels().find((c) => c.topic === topic);
      if (stale) {
        supabase.removeChannel(stale);
      }

      channel = supabase
        .channel(`room:${selectedRoomId}`, {
          config: {
            presence: { key: user?.id },
          }
        })
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `room_id=eq.${selectedRoomId}`,
          },
          async (payload) => {
            const newest = payload.new as any;
            const senderId = newest.sender_id;
            let senderInfo = userCacheRef.current[senderId];

            if (!senderInfo) {
              const { data: userData } = await supabase
                .from('users')
                .select('id, name, image')
                .eq('id', senderId)
                .single();
              
              senderInfo = userData || { id: senderId, name: 'Unknown', image: null };
              userCacheRef.current[senderId] = senderInfo;
            }

            const formattedMsg = {
              message: {
                id: newest.id,
                content: newest.content,
                imageUrl: newest.image_url,
                senderId: newest.sender_id,
                createdAt: newest.created_at,
              },
              sender: senderInfo
            };

            setMessages((prev) => {
              if (prev.some(m => m.message.id === formattedMsg.message.id)) return prev;
              return [...prev, formattedMsg];
            });
            
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }
        )
        .subscribe(async (status) => {
          if (cancelled) return;
          if (status === 'SUBSCRIBED') {
            if (process.env.NODE_ENV === 'development') {
              console.log(`Subscribed to room:${selectedRoomId}`);
            }
          }
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn(`Connection ${status} for room:${selectedRoomId}, retrying...`);
            // The subscribe callback can fire CLOSED/CHANNEL_ERROR more than
            // once for the same channel; clear any retry already scheduled
            // so repeated errors don't stack up multiple pending resubscribes.
            if (retryTimeout) clearTimeout(retryTimeout);
            retryTimeout = setTimeout(subscribeToRoom, 3000);
          }
        });
    };

    subscribeToRoom();

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedRoomId, user?.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const url = await uploadFile(file, 'eventra-uploads', 'any');
      setPendingFile({ url, type: file.type, name: file.name });
    } catch (e) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleStartDM = async (otherUserId: string, name: string) => {
    if (!user) return;
    try {
      const room = await createChatRoom({
        name: `Chat with ${name}`,
        type: 'direct',
        participantIds: [otherUserId]
      });
      setChatRooms(prev => [room, ...prev]);
      setSelectedRoomId(room.id);
      setIsStartingDM(false);
    } catch (e) {
      toast({ title: 'Failed to start message', variant: 'destructive' });
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingFile) || !selectedRoomId || !user) return;
    const content = newMessage.trim();
    const file = pendingFile;

    setNewMessage('');
    setPendingFile(null);

    try {
      const result = await sendMessage({
        roomId: selectedRoomId,
        content: content || (file ? `Shared a ${file.type.startsWith('image/') ? 'photo' : 'file'}` : ''),
        imageUrl: file?.url,
      });

      if (!result.success || !result.message) {
        throw new Error(result.error || 'Failed to send');
      }

      // Render immediately instead of waiting on the realtime round-trip —
      // that subscription can lag or drop, and the sender should always see
      // their own message land. The realtime INSERT handler dedupes by
      // message id, so this won't double up when it also arrives that way.
      const sent = result.message;
      userCacheRef.current[user.id] = { id: user.id, name: user.name ?? null, image: user.image ?? null };
      setMessages((prev) => {
        if (prev.some((m) => m.message.id === sent.id)) return prev;
        return [
          ...prev,
          {
            message: {
              id: sent.id,
              content: sent.content,
              imageUrl: sent.imageUrl,
              senderId: sent.senderId,
              createdAt: sent.createdAt,
            },
            sender: userCacheRef.current[user.id],
          },
        ];
      });

      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (e) {
      toast({ title: 'Failed to send', variant: 'destructive' });
      setNewMessage(content);
      setPendingFile(file);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim() || !user) return;
    try {
      const room = await createChatRoom({ 
        name: newRoom.name, 
        type: newRoom.type 
      });
      setChatRooms(prev => [room, ...prev]);
      setSelectedRoomId(room.id);
      setIsCreatingRoom(false);
      setNewRoom({ name: '', type: 'group' });
    } catch (e) {
      toast({ title: 'Failed to create room', variant: 'destructive' });
    }
  };

  const selectedRoom = chatRooms.find((r: any) => r.id === selectedRoomId);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-80 bg-card border-r border-border flex flex-col">
        <div className="p-4 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold text-primary">Conversations</h2>
          <div className="flex gap-1">
            <Dialog open={isStartingDM} onOpenChange={setIsStartingDM}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="New DM">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground border-border">
                <DialogHeader><DialogTitle>Start a conversation</DialogTitle></DialogHeader>
                <UserPicker onSelect={handleStartDM} excludeIds={[user?.id || '']} />
              </DialogContent>
            </Dialog>

            <Dialog open={isCreatingRoom} onOpenChange={setIsCreatingRoom}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="New Room">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground border-border">
                <DialogHeader><DialogTitle>Create Room</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input 
                    placeholder="Room Name" 
                    value={newRoom.name} 
                    onChange={e => setNewRoom({...newRoom, name: e.target.value})} 
                    className="bg-card border-border"
                  />
                  <Button onClick={handleCreateRoom} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <ScrollArea className="flex-1">
          {loadingRooms ? (
            <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <div className="p-2 space-y-1">
              {chatRooms.map((room: any) => (
                <button 
                  key={room.id} 
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all flex items-center gap-3", 
                    selectedRoomId === room.id ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-card"
                  )} 
                  onClick={() => setSelectedRoomId(room.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold">
                    {room.type === 'direct' ? room.name?.[0] || '?' : '#'}
                  </div>
                  <div className="truncate">
                    <p className="font-medium truncate text-sm">{room.name || 'Untitled Room'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{room.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedRoomId ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between bg-background/40">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  {selectedRoom?.type === 'direct' ? <MessageCircle size={16} /> : <Shield size={16} />}
                </div>
                <h2 className="font-bold text-foreground">{selectedRoom?.name || 'Loading...'}</h2>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-6">
                {loadingMessages ? (
                   <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                  messages.map((m: any) => {
                    const isMe = m.message.senderId === user?.id;
                    return (
                      <div key={m.message.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto items-end" : "items-start")}>
                        {!isMe && (
                          <p className="text-caption text-notion-ink-muted mb-1 ml-1">{m.sender.name}</p>
                        )}
                        
                        <div className={cn(
                          "px-3.5 py-2.5 rounded-2xl text-body-sm relative group", 
                          isMe
                            ? "bg-notion-primary text-notion-on-primary rounded-br-sm"
                            : "bg-notion-sunken text-notion-ink rounded-bl-sm"
                        )}>
                          {m.message.imageUrl && (
                            <div className="mb-2 overflow-hidden rounded-lg">
                              <Image 
                                src={m.message.imageUrl} 
                                width={300} 
                                height={300} 
                                className="max-w-full h-auto hover:scale-105 transition-transform" 
                                alt="shared" 
                                unoptimized 
                              />
                            </div>
                          )}
                          <p className="leading-relaxed whitespace-pre-wrap">{m.message.content}</p>
                        </div>
                        
                        <p className="text-[9px] text-gray-600 mt-1 mx-1 font-mono">
                          {new Date(m.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input Footer */}
            <div className="p-4 border-t border-border bg-background/40">
              {pendingFile && (
                <div className="mb-3 p-2 bg-card rounded-xl border border-primary/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {pendingFile.type.startsWith('image/') ? <ImageIcon size={16} className="text-primary" /> : <FileIcon size={16} className="text-primary" />}
                    <span className="text-xs text-foreground/80 truncate">{pendingFile.name}</span>
                  </div>
                  <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                </div>
              )}
              
              <div className="flex gap-2 items-end">
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 shrink-0 text-muted-foreground hover:text-primary" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                </Button>
                
                <Textarea 
                  placeholder="Type a message..." 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                  className="min-h-[40px] max-h-32 resize-none bg-notion-sunken border-transparent focus-visible:ring-ring rounded-2xl" 
                />
                
                <Button
                  onClick={handleSendMessage}
                  aria-label="Send message"
                  disabled={(!newMessage.trim() && !pendingFile) || !selectedRoomId}
                  size="icon"
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 space-y-4">
            <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center text-gray-600">
              <MessageCircle size={40} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Your Messages</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-2">Select a conversation from the sidebar or start a new one to begin chatting.</p>
            </div>
            <Button variant="outline" className="border-border" onClick={() => setIsStartingDM(true)}>Start Chatting</Button>
          </div>
        )}
      </div>
    </div>
  );
}
