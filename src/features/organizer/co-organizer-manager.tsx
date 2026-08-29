'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserMinus, UserPlus, Mail, ShieldCheck } from 'lucide-react';
import type { Id } from '@/types';
import { updateEvent } from '@/app/actions/events';
import { getUserByEmail, getUsersByIds, type AdminUserRow } from '@/app/actions/admin';

interface CoOrganizerManagerProps {
  eventId: string;
  organizerId: string;
  coOrganizerIds?: string[];
  organizerEmail?: string;
  organizerName?: string;
  organizerImage?: string;
}

export function CoOrganizerManager({
  eventId,
  organizerId,
  coOrganizerIds = [],
  organizerEmail,
  organizerName,
  organizerImage
}: CoOrganizerManagerProps) {
  const { toast } = useToast();
  
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [coOrganizers, setCoOrganizers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Hoisted out of the effect so the error state can offer a retry.
  const fetchCoOrganizers = useCallback(async () => {
    if (!coOrganizerIds.length) {
      setCoOrganizers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const users = await getUsersByIds(coOrganizerIds);
      setCoOrganizers(users);
    } catch (error) {
      setLoadError(true);
      console.error("Failed to fetch co-organizers:", error);
    } finally {
      setLoading(false);
    }
  }, [coOrganizerIds]);

  useEffect(() => {
    fetchCoOrganizers();
  }, [fetchCoOrganizers]);

  const handleAddByEmail = async () => {
    if (!email.trim()) return;
    setIsSearching(true);
    try {
      const targetUser = await getUserByEmail(email.trim());
      
      if (!targetUser) {
        toast({ title: "User not found", description: "No user found with this email address.", variant: "destructive" });
        return;
      }

      if (targetUser.id === organizerId) {
        toast({ title: "Invalid action", description: "You are already the main organizer." });
        return;
      }

      if (coOrganizerIds.includes(targetUser.id)) {
        toast({ title: "Already added", description: "This user is already a co-organizer." });
        return;
      }

      setIsUpdating(true);
      const result = await updateEvent(eventId, {
        coOrganizerIds: [...coOrganizerIds, targetUser.id]
      });

      if (result.success) {
        toast({ title: "Co-organizer added", description: `${targetUser.name} can now manage this event.` });
        setEmail('');
        // Refresh local list
        const updatedUsers = await getUsersByIds([...coOrganizerIds, targetUser.id]);
        setCoOrganizers(updatedUsers);
      } else {
        toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to add co-organizer.", variant: "destructive" });
    } finally {
      setIsSearching(false);
      setIsUpdating(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setIsUpdating(true);
    try {
      const result = await updateEvent(eventId, {
        coOrganizerIds: coOrganizerIds.filter(id => id !== userId)
      });
      if (result.success) {
        toast({ title: "Co-organizer removed" });
        setCoOrganizers(prev => prev.filter(u => u.id !== userId));
      } else {
        toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove co-organizer.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="bg-card border-border/50 text-foreground rounded-[2rem] shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/[0.02] border-b border-border/50 p-8">
        <CardTitle className="text-2xl font-black font-headline flex items-center gap-3">
          <ShieldCheck className="text-primary h-7 w-7" />
          Co-Organizers
        </CardTitle>
        <CardDescription className="text-muted-foreground font-medium">
          Share management permissions with other team members.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8 space-y-8">
        {/* Main Organizer */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Main Organizer</p>
          <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              <AvatarImage src={organizerImage} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{organizerName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-bold text-foreground">{organizerName || 'Owner'}</p>
              <p className="text-xs font-medium text-muted-foreground">{organizerEmail}</p>
            </div>
            <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 font-black px-3 py-1 text-[10px]">OWNER</Badge>
          </div>
        </div>

        {/* Team Members */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Co-Organizers</p>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              </div>
            ) : loadError ? (
              <LoadError what="co-organizers" onRetry={fetchCoOrganizers} />
            ) : coOrganizers.length === 0 ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl bg-muted/10">
                <p className="text-sm text-muted-foreground font-medium">
                  No co-organizers added yet.
                </p>
              </div>
            ) : (
              coOrganizers.map((coOp) => (
                <div key={coOp.id} className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50 group hover:border-primary/30 transition-colors">
                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarImage src={coOp.image || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground font-bold">{coOp.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-bold text-foreground">{coOp.name}</p>
                    <p className="text-[10px] font-medium text-muted-foreground">{coOp.email}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="ml-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl"
                    onClick={() => handleRemove(coOp.id)}
                    disabled={isUpdating}
                  >
                    <UserMinus className="h-5 w-5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add New */}
        <div className="pt-8 border-t border-border/50 space-y-4">
          <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Invite by Email</Label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="colleague@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-14 bg-muted/20 border-border rounded-2xl focus-visible:ring-primary font-medium"
              />
            </div>
            <Button 
              onClick={handleAddByEmail} 
              disabled={isSearching || isUpdating || !email}
              size="lg"
              className="h-14 px-8 rounded-2xl font-black"
            >
              {isUpdating ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5 mr-2" />}
              Invite
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
