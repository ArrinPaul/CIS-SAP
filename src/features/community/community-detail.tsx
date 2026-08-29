'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
// Fixing imports
import { Button as UIButton } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Users, MessageSquare, Heart, Share2, Shield, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CommunityDetailClient({ communityId, community: initialCommunity, posts: initialPosts, members: initialMembers }: any) {
  const { toast } = useToast();
  const [community, setCommunity] = useState(initialCommunity || null);
  const [posts, setPosts] = useState(initialPosts || []);
  const [members, setMembers] = useState(initialMembers || []);

  const handleLike = async (postId: string) => {
    try {
      setPosts((prev: any[]) =>
        prev.map((post) => (post.id === postId ? { ...post, likes: Number(post.likes || 0) + 1 } : post))
      );
      toast({ title: 'Post liked!' });
    } catch (e) {
      toast({ title: 'Failed to like post', variant: 'destructive' });
    }
  };

  if (!community) return <div className="py-20 text-center text-foreground">Community not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="relative h-64 rounded-3xl overflow-hidden border border-border shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 p-8 z-20 w-full flex flex-col md:flex-row justify-between items-end gap-6">
          <div className="space-y-2 text-foreground">
            <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/90/30">{community.category}</Badge>
            <h1 className="text-5xl font-black text-foreground tracking-tighter">{community.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground text-sm">
              <span className="flex items-center gap-1.5"><Users size={14} className="text-primary" /> {community.memberCount} members</span>
              <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-primary" /> {posts.length} discussions</span>
            </div>
          </div>
          <UIButton className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-cyan-900/40 px-8 rounded-xl h-12">
            Join Community
          </UIButton>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border p-4 rounded-2xl">
             <div className="flex gap-4">
                <Avatar><AvatarFallback className="bg-primary/20 text-primary">ME</AvatarFallback></Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea placeholder="Share something with the community..." className="bg-card border-border resize-none min-h-[100px] text-foreground" />
                  <div className="flex justify-between items-center">
                    <UIButton variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground"><ImageIcon size={18} className="mr-2" /> Media</UIButton>
                    <UIButton size="sm" className="bg-primary hover:bg-primary/90 px-6">Post</UIButton>
                  </div>
                </div>
             </div>
          </Card>

          <div className="space-y-4">
            {posts.map((p: any) => (
                <Card key={p.id} className="bg-card border-border text-foreground overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex gap-4 mb-4">
                      <Avatar className="h-10 w-10 border border-border"><AvatarFallback>{p.authorName?.[0]}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-bold text-foreground">{p.authorName || 'Member'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">{p.content}</p>
                    <div className="flex items-center gap-6 mt-6 pt-4 border-t border-border/50">
                        <button 
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                            onClick={() => handleLike(p.id)}
                        >
                            <Heart size={18} className={p.likes > 0 ? "fill-cyan-500 text-primary" : ""} /> {p.likes || 0}
                        </button>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                            <MessageSquare size={18} /> {p.commentCount || 0}
                        </button>
                        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors ml-auto">
                            <Share2 size={18} />
                        </button>
                    </div>
                  </CardContent>
                </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="bg-card border-border p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground"><Shield size={18} className="text-primary" /> About Community</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">{community.description}</p>
            <Separator className="bg-card mb-6" />
            <div className="space-y-4">
               <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Members</h4>
               <div className="space-y-3">
                {members.slice(0, 5).map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                    <Avatar className="h-8 w-8 border border-border"><AvatarFallback>{m.name?.[0]}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0 text-foreground">
                      <p className="text-sm font-bold truncate">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                    </div>
                  </div>
                ))}
               </div>
               <UIButton variant="ghost" className="w-full text-xs text-primary hover:bg-primary/10">View All Members</UIButton>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
