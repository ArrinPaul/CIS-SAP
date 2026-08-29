'use client';

import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Globe, 
  Briefcase, 
  MapPin, 
  Gift, 
  Play, 
  Trash2, 
  Users, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  Edit2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  createSponsor, 
  getEventSponsors, 
  deleteSponsor, 
  tierBadgeStyles, 
  SponsorTier 
} from '@/app/actions/sponsors';
import { cn } from '@/core/utils/utils';

interface SponsorsManagerProps {
  initialEvents?: { id: string; title: string }[];
  defaultEventId?: string;
}

export default function SponsorsManager({
  initialEvents = [],
  defaultEventId,
}: SponsorsManagerProps) {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>(defaultEventId || initialEvents[0]?.id || '');
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [tier, setTier] = useState<SponsorTier>('gold');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [careersUrl, setCareersUrl] = useState('');
  const [description, setDescription] = useState('');
  const [demoVideoUrl, setDemoVideoUrl] = useState('');
  const [promoOffer, setPromoOffer] = useState('');
  const [boothNumber, setBoothNumber] = useState('');

  const loadSponsors = async (eventId: string) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await getEventSponsors(eventId);
      if (res.success) {
        setSponsors(res.sponsors);
      }
    } catch (e) {
      toast({ title: 'Failed to load sponsors', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadSponsors(selectedEventId);
    }
  }, [selectedEventId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const res = await createSponsor({
        eventId: selectedEventId,
        name: name.trim(),
        tier,
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim() || undefined,
        careersUrl: careersUrl.trim() || undefined,
        description: description.trim() || undefined,
        demoVideoUrl: demoVideoUrl.trim() || undefined,
        promoOffer: promoOffer.trim() || undefined,
        boothNumber: boothNumber.trim() || undefined,
      });

      if (res.success && res.sponsor) {
        toast({ title: 'Exhibitor Added! 🏢', description: `${res.sponsor.name} is now showcased in the Expo Hall.` });
        setSponsors([...sponsors, res.sponsor]);
        setDialogOpen(false);
        // Reset
        setName('');
        setLogoUrl('');
        setBannerUrl('');
        setWebsiteUrl('');
        setCareersUrl('');
        setDescription('');
        setDemoVideoUrl('');
        setPromoOffer('');
        setBoothNumber('');
      } else {
        toast({ title: 'Creation Failed', description: res.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (sponsorId: string) => {
    try {
      const res = await deleteSponsor(sponsorId);
      if (res.success) {
        setSponsors(sponsors.filter(s => s.id !== sponsorId));
        toast({ title: 'Sponsor Removed' });
      }
    } catch (e) {
      toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Sponsors & Exhibitor Hub</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 font-mono text-[11px]">
              <Sparkles className="w-3 h-3" /> Virtual Expo Hall
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Showcase partners, manage tiered virtual exhibitor booths, and review captured attendee leads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {initialEvents.length > 1 && (
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-56 rounded-xl">
                <SelectValue placeholder="Select Event" />
              </SelectTrigger>
              <SelectContent>
                {initialEvents.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-xl font-bold gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Add Sponsor
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Add Event Sponsor & Virtual Booth</DialogTitle>
                  <DialogDescription>
                    Configure company profile, sponsorship tier, booth perks, and demo links.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* NAME & TIER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-name">Company Name</Label>
                      <Input
                        id="s-name"
                        placeholder="e.g. Anthropic, Google, Vercel"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Sponsorship Tier</Label>
                      <Select value={tier} onValueChange={(val: any) => setTier(val)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="title">Title Sponsor</SelectItem>
                          <SelectItem value="platinum">Platinum Sponsor</SelectItem>
                          <SelectItem value="gold">Gold Sponsor</SelectItem>
                          <SelectItem value="silver">Silver Sponsor</SelectItem>
                          <SelectItem value="bronze">Bronze Sponsor</SelectItem>
                          <SelectItem value="community">Community Partner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* BOOTH NUMBER & PROMO OFFER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-booth">Physical / Virtual Booth #</Label>
                      <Input
                        id="s-booth"
                        placeholder="e.g. Booth #B12"
                        value={boothNumber}
                        onChange={(e) => setBoothNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="s-promo">Special Perk / Promo Code</Label>
                      <Input
                        id="s-promo"
                        placeholder="e.g. Free $100 API Credits"
                        value={promoOffer}
                        onChange={(e) => setPromoOffer(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* LOGO & BANNER URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-logo">Logo Image URL</Label>
                      <Input
                        id="s-logo"
                        placeholder="https://..."
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="s-banner">Booth Banner Artwork URL</Label>
                      <Input
                        id="s-banner"
                        placeholder="https://..."
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* WEBSITE & CAREERS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-web">Website URL</Label>
                      <Input
                        id="s-web"
                        placeholder="https://company.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="s-jobs">Careers / Job Board URL</Label>
                      <Input
                        id="s-jobs"
                        placeholder="https://company.com/careers"
                        value={careersUrl}
                        onChange={(e) => setCareersUrl(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* DEMO VIDEO */}
                  <div className="space-y-1.5">
                    <Label htmlFor="s-video">Demo / Teaser Video URL (Embeddable)</Label>
                    <Input
                      id="s-video"
                      placeholder="https://www.youtube.com/embed/..."
                      value={demoVideoUrl}
                      onChange={(e) => setDemoVideoUrl(e.target.value)}
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="space-y-1.5">
                    <Label htmlFor="s-desc">Company Bio / Booth Description</Label>
                    <Textarea
                      id="s-desc"
                      placeholder="Brief overview of products, developer tools, and conference presence..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating} className="gap-2">
                    {isCreating && <Loader2 className="w-4 h-4 animate-spin" />} Save Exhibitor
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SPONSOR LIST */}
      <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg">Configured Exhibitors & Sponsors</CardTitle>
          <CardDescription>All companies displaying in the attendee Expo Hall for this event.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading sponsors...
            </div>
          ) : sponsors.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-base font-semibold text-foreground">No sponsors added yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Add your event's sponsors, title partners, and community exhibitors to showcase them to attendees.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {sponsors.map((s) => {
                const style = tierBadgeStyles[s.tier as SponsorTier] || tierBadgeStyles.gold;
                return (
                  <div key={s.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12 border border-border">
                        <AvatarImage src={s.logoUrl || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {s.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-base font-bold text-foreground">{s.name}</span>
                          <Badge className={cn("text-[10px] font-black uppercase tracking-wider", style.bg, style.text, style.border)}>
                            {s.tier}
                          </Badge>
                          {s.boothNumber && (
                            <span className="text-xs text-muted-foreground font-mono">
                              ({s.boothNumber})
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-primary font-semibold">
                            <Users className="w-3.5 h-3.5" /> {s.leadCount || 0} Leads Captured
                          </span>
                          {s.websiteUrl && <span>Website linked</span>}
                          {s.careersUrl && <span className="text-emerald-500 font-medium">Hiring</span>}
                          {s.promoOffer && <span className="text-amber-500">Perk active</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(s.id)}
                        className="text-muted-foreground hover:text-red-500 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
