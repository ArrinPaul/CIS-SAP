'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Zap, 
  Sparkles, 
  Loader2, 
  RefreshCw,
  Search,
  UserPlus,
  MessageSquare,
  Trophy,
  Target,
  Check,
  X,
  UserMinus
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getMatchmakingRecommendations, MatchmakingResult } from '@/app/actions/matchmaking';
import { MatchmakingCard } from './matchmaking-card';
import { MatchmakingSection } from './matchmaking-section';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/utils/utils';
import {
  getNetworkingSnapshot,
  removeConnection,
  respondToConnectionRequest,
  sendConnectionRequest,
} from '@/app/actions/networking';
import { useTranslations } from 'next-intl';

export default function NetworkingClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const t = useTranslations('Phase2I18n.networking');
  const [searchTerm, setSearchTerm] = useState('');

  const [connections, setConnections] = useState<any[]>([]);
  const [publicUsers, setPublicUsers] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const snapshot = await getNetworkingSnapshot();
        if (!mounted) return;

        setPublicUsers(snapshot.publicUsers);
        setConnections(
          snapshot.acceptedConnections.map((c) => ({
            id: c.otherUser.id,
            status: c.status,
            direction: c.direction,
            otherUser: {
              id: c.otherUser.id,
              name: c.otherUser.name,
              image: c.otherUser.image,
              role: c.otherUser.role,
            },
          }))
        );
      } catch (error) {
        console.error('Networking load failed', error);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const acceptedConnections = connections.filter((c: any) => c.status === 'accepted');
  const pendingReceived = connections.filter((c: any) => c.status === 'pending' && c.direction === 'received');
  const pendingSent = connections.filter((c: any) => c.status === 'pending' && c.direction === 'sent');

  const handleConnect = async (userId: string) => {
    try {
      const result = await sendConnectionRequest(userId as any);
      if (!result.success) throw new Error(result.error || 'Failed to connect');
      setConnections((prev) => [
        ...prev,
        {
          id: userId,
          status: 'accepted',
          direction: 'sent',
          otherUser: publicUsers.find((u) => u.id === userId),
        },
      ]);
      toast({ title: t('requestSent'), description: t('requestSentDesc') });
    } catch (e: any) {
      toast({ title: t('errorTitle'), description: e.message || t('sendRequestFailed'), variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl text-foreground space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-cyan-500/20 px-3 py-1">
            <Sparkles className="w-3 h-3 mr-2" />
            {t('badge')}
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-lg">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t('searchPlaceholder')} 
              className="pl-9 bg-card border-border text-foreground"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="ai-matches" className="w-full">
        <TabsList className="bg-card border border-border p-1 mb-8">
          <TabsTrigger value="ai-matches" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('aiMatchmaking')}
          </TabsTrigger>
          <TabsTrigger value="discover" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="w-4 h-4 mr-2" />
            {t('discoverAll')}
          </TabsTrigger>
          <TabsTrigger value="connections" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="w-4 h-4 mr-2" />
            {t('myConnections')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-matches" className="space-y-8">
          <MatchmakingSection />
        </TabsContent>

        <TabsContent value="discover" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publicUsers
              .filter(u => u.id !== user?.id && 
                (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 u.interests?.toLowerCase().includes(searchTerm.toLowerCase())))
              .map((u: any) => (
                <Card key={u.id} className="bg-card border-border hover:border-primary/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Avatar className="h-12 w-12 border border-border">
                        <AvatarImage src={u.image} />
                        <AvatarFallback className="bg-primary/10 text-primary">{u.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 text-foreground">
                        <h3 className="font-bold truncate">{u.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">{u.role || t('member')}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4 h-8 italic">
                      {u.bio || u.interests || t('noBio')}
                    </p>
                    <Button 
                      className="w-full bg-card hover:bg-primary hover:text-primary-foreground border-border text-foreground/80" 
                      onClick={() => handleConnect(u.id)}
                      disabled={connections.some((c: any) => c.id === u.id)}
                    >
                      {connections.some((c: any) => c.id === u.id) ? (
                        <><Check className="w-4 h-4 mr-2" /> Connected</>
                      ) : (
                        <><UserPlus className="w-4 h-4 mr-2" /> {t('connect')}</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
          {publicUsers.length === 0 && (
            <div className="py-20 text-center text-muted-foreground border border-border rounded-lg">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('noMembers')}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          {pendingReceived.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{t('pendingRequests')}</h3>
              {pendingReceived.map((c: any) => (
                <Card key={c.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={c.otherUser?.image} />
                        <AvatarFallback className="bg-primary/10 text-primary">{c.otherUser?.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="text-foreground">
                        <p className="font-medium">{c.otherUser?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{c.otherUser?.role || t('member')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={async () => { await respondToConnectionRequest(c.id, true); toast({ title: t('accepted') }); }}>
                        <Check className="w-4 h-4 mr-1" /> {t('accept')}
                      </Button>
                      <Button size="sm" variant="outline" className="border-border text-destructive hover:bg-destructive/10" onClick={async () => { await respondToConnectionRequest(c.id, false); toast({ title: t('declined') }); }}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {acceptedConnections.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground">{t('myConnectionsTitle', { count: acceptedConnections.length })}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {acceptedConnections.map((c: any) => (
                  <Card key={c.id} className="bg-card border-border">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={c.otherUser?.image} />
                          <AvatarFallback className="bg-primary/10 text-primary">{c.otherUser?.name?.charAt(0) || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="text-foreground">
                          <p className="font-medium">{c.otherUser?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{c.otherUser?.role || t('member')}</p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={async () => { await removeConnection(c.id); setConnections((prev) => prev.filter((x) => x.id !== c.id)); toast({ title: t('connectionRemoved') }); }}>
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : pendingReceived.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground border border-border rounded-lg">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-medium text-foreground mb-1">{t('noConnections')}</p>
              <p className="text-sm">{t('noConnectionsSubtitle')}</p>
            </div>
          ) : null}

          {pendingSent.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-muted-foreground">{t('sentRequests', { count: pendingSent.length })}</h3>
              {pendingSent.map((c: any) => (
                <Card key={c.id} className="bg-card border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={c.otherUser?.image} />
                        <AvatarFallback className="bg-primary/10 text-primary">{c.otherUser?.name?.charAt(0) || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="text-foreground">
                        <p className="font-medium">{c.otherUser?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{t('pending')}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:bg-card" onClick={async () => { await removeConnection(c.id); toast({ title: t('requestCancelled') }); }}>
                      {t('cancel')}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
