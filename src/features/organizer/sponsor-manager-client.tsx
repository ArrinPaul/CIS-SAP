'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { upsertSponsor, deleteSponsor, getSponsorsForEvent, getSponsorLeads, recordSponsorLead } from '@/app/actions/sponsors';
import Image from 'next/image';
import { cn } from '@/core/utils/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Globe, 
  Image as ImageIcon, 
  LayoutGrid, 
  Loader2,
  Award,
  Settings2,
  Users,
  QrCode,
  ScanLine,
  CheckCircle2,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Sponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  tier: string;
  order: number;
}

interface SponsorManagerProps {
  eventId: string;
  eventTitle: string;
}

const TIERS = [
  { id: 'platinum', label: 'Platinum', color: 'text-primary', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20' },
  { id: 'gold', label: 'Gold', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
  { id: 'silver', label: 'Silver', color: 'text-foreground/80', bg: 'bg-gray-300/10', border: 'border-gray-300/20' },
  { id: 'bronze', label: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20' },
];

export function SponsorManagerClient({ eventId, eventTitle }: SponsorManagerProps) {
  const { toast } = useToast();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Leads State
  const [activeTab, setActiveTab] = useState('roster');
  const [selectedSponsorForLeads, setSelectedSponsorForLeads] = useState<Sponsor | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [tier, setTier] = useState('silver');

  const loadSponsors = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getSponsorsForEvent(eventId);
      setSponsors(data as any);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadSponsors();
  }, [loadSponsors]);

  const loadLeads = async (sponsor: Sponsor) => {
    setSelectedSponsorForLeads(sponsor);
    setLoadingLeads(true);
    try {
      const data = await getSponsorLeads(sponsor.id);
      setLeads((data as any).leads || (data as any) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLeads(false);
    }
  };

  const startScanner = async () => {
    setShowScanner(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode("sponsor-qr-reader");
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 }, 
        async (decodedText) => {
            await html5QrCode.stop();
            setScanning(false);
            handleProcessLead(decodedText);
        }, 
        () => {}
      );
      setScanning(true);
    } catch (err) {
      toast({ title: 'Camera Error', description: 'Could not access camera', variant: 'destructive' });
      setShowScanner(false);
    }
  };

  const handleProcessLead = async (payload: string) => {
    if (!selectedSponsorForLeads) return;
    
    try {
      const result = await recordSponsorLead({
        sponsorId: selectedSponsorForLeads.id,
        userId: payload, // In a real app, this would be a ticket ID that resolves to a user
        notes: "Scanned at booth"
      });

      if (result.success) {
        setScanResult({ success: true, lead: result.lead });
        toast({ title: "Lead Captured!" });
        loadLeads(selectedSponsorForLeads);
      } else {
        setScanResult({ success: false, message: "Invalid attendee code." });
      }
    } catch (e) {
      setScanResult({ success: false, message: "System error processing lead." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const result = await upsertSponsor({
        id: editingId || undefined,
        eventId,
        name,
        logoUrl,
        websiteUrl,
        tier,
        order: sponsors.length
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to save sponsor');
      }
      toast({ title: editingId ? "Sponsor Updated" : "Sponsor Added" });
      resetForm();
      loadSponsors();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this sponsor?")) return;
    try {
      const result = await deleteSponsor(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove sponsor');
      }
      toast({ title: "Sponsor removed" });
      loadSponsors();
    } catch (error: any) {
      toast({ title: "Failed to remove", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setLogoUrl('');
    setWebsiteUrl('');
    setTier('silver');
  };

  const startEdit = (s: Sponsor) => {
    setEditingId(s.id);
    setName(s.name);
    setLogoUrl(s.logoUrl || '');
    setWebsiteUrl(s.websiteUrl || '');
    setTier(s.tier);
    setActiveTab('roster');
  };

  return (
    <div className="space-y-8 text-foreground">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card border-border border p-1 rounded-2xl h-12 w-fit mb-4">
          <TabsTrigger value="roster" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full font-bold transition-all">
            <LayoutGrid className="w-4 h-4 mr-2" /> Roster
          </TabsTrigger>
          <TabsTrigger value="leads" className="rounded-xl px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground h-full font-bold transition-all">
            <Users className="w-4 h-4 mr-2" /> Retrieval & Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Sponsor Form */}
            <Card className="bg-card border-border text-foreground h-fit">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  {editingId ? <Settings2 className="text-primary" /> : <Plus className="text-primary" />}
                  {editingId ? 'Edit Sponsor' : 'Add New Sponsor'}
                </CardTitle>
                <CardDescription>Display partner logos on the event page.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sponsor Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} className="bg-card border-border" required placeholder="Acme Corp" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <div className="flex gap-2">
                      <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="bg-card border-border flex-1" placeholder="https://..." />
                      <Button type="button" variant="outline" size="icon" className="border-border"><ImageIcon size={16} /></Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Website URL (Optional)</Label>
                    <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="bg-card border-border" placeholder="https://acme.com" />
                  </div>

                  <div className="space-y-2">
                    <Label>Sponsorship Tier</Label>
                    <select 
                      className="w-full bg-card border border-border rounded-md p-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
                      value={tier}
                      onChange={e => setTier(e.target.value)}
                    >
                      {TIERS.map(t => (
                        <option key={t.id} value={t.id} className="bg-card">{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : editingId ? 'Update Sponsor' : 'Add Sponsor'}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="ghost" className="border border-border" onClick={resetForm}>Cancel</Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Sponsor Display */}
            <Card className="lg:col-span-2 bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle>Sponsor Roster</CardTitle>
                <CardDescription>Partners supporting {eventTitle}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : loadError ? (
                  <LoadError what="sponsors" onRetry={loadSponsors} />
                ) : sponsors.length > 0 ? (
                  <div className="space-y-8">
                    {TIERS.map(t => {
                      const tierSponsors = sponsors.filter(s => s.tier === t.id);
                      if (tierSponsors.length === 0) return null;
                      
                      return (
                        <div key={t.id} className="space-y-4">
                          <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                            <Award size={16} className={t.color} />
                            <h3 className={cn("font-black uppercase tracking-widest text-xs", t.color)}>{t.label} Sponsors</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {tierSponsors.map(s => (
                              <div key={s.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border/50 group hover:border-border transition-all">
                                <div className="flex items-center gap-4">
                                  <div className="relative h-12 w-12 rounded-lg bg-notion-surface p-1 flex items-center justify-center">
                                    {s.logoUrl ? (
                                      <Image src={s.logoUrl} fill className="object-contain p-1" alt={s.name} />
                                    ) : (
                                      <span className="text-black font-bold text-xs">{s.name[0]}</span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-bold text-sm">{s.name}</p>
                                    {s.websiteUrl && (
                                      <a href={s.websiteUrl} target="_blank" className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-primary">
                                        <Globe size={10} /> {new URL(s.websiteUrl).hostname}
                                      </a>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => startEdit(s)}><Settings2 size={14} /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-red-300 hover:bg-red-400/10" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center text-muted-foreground">
                    <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p>No sponsors added yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="leads">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="bg-card border-border text-foreground">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">Active Sponsors</CardTitle>
                <CardDescription>Select a sponsor to manage their leads.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sponsors.map(s => (
                  <Button 
                    key={s.id} 
                    variant={selectedSponsorForLeads?.id === s.id ? "default" : "outline"} 
                    className="w-full justify-start border-border"
                    onClick={() => loadLeads(s)}
                  >
                    <div className="w-6 h-6 rounded bg-notion-surface mr-3 flex items-center justify-center overflow-hidden">
                      {s.logoUrl ? <Image src={s.logoUrl} width={24} height={24} className="object-contain" alt="" /> : <span className="text-[10px] text-black font-bold">{s.name[0]}</span>}
                    </div>
                    {s.name}
                    <Badge className="ml-auto text-[8px] h-4 bg-muted text-muted-foreground border-border">{s.tier}</Badge>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 bg-card border-border text-foreground">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{selectedSponsorForLeads ? `${selectedSponsorForLeads.name} Leads` : 'Capture Analytics'}</CardTitle>
                  <CardDescription>Lead retrieval data and booth scanning performance.</CardDescription>
                </div>
                {selectedSponsorForLeads && (
                  <Button className="bg-primary hover:bg-cyan-700" onClick={startScanner}>
                    <QrCode className="w-4 h-4 mr-2" /> Scan New Lead
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {loadingLeads ? (
                  <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                ) : selectedSponsorForLeads ? (
                  leads.length > 0 ? (
                    <div className="space-y-4">
                      {leads.map((lead: any) => (
                        <div key={lead.id} className="flex items-center gap-4 p-4 bg-muted/20 rounded-xl border border-border">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                            {lead.user.image ? <Image src={lead.user.image} width={40} height={40} className="rounded-full" alt="" /> : <Users className="text-primary w-5 h-5" />}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-sm">{lead.user.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.user.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{lead.notes || 'No notes'}</p>
                            <p className="text-[9px] text-gray-500 mt-1">{new Date(lead.scannedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-20 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
                      <ScanLine className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p>No leads captured yet for this sponsor.</p>
                    </div>
                  )
                ) : (
                  <div className="py-20 text-center text-muted-foreground">
                    <p>Select a sponsor from the left to view leads.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Scanner Modal */}
      <Dialog open={showScanner} onOpenChange={setShowScanner}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground p-0 overflow-hidden">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold flex items-center gap-2"><QrCode className="text-primary" /> Lead Scanner</h2>
            <p className="text-xs text-muted-foreground mt-1">Scanning for <span className="text-foreground font-bold">{selectedSponsorForLeads?.name}</span></p>
          </div>
          
          <div className="p-6 space-y-6">
            <div id="sponsor-qr-reader" className="w-full aspect-square bg-black/40 rounded-2xl overflow-hidden border border-border relative">
               {!scanning && !scanResult && (
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                 </div>
               )}
            </div>

            {scanResult && (
              <div className={cn(
                "p-4 rounded-xl border flex items-center gap-3",
                scanResult.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"
              )}>
                {scanResult.success ? <CheckCircle2 className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
                <div className="flex-1">
                  <p className="text-sm font-bold">{scanResult.success ? "Lead Recorded Successfully" : "Scan Failed"}</p>
                  <p className="text-xs opacity-70">{scanResult.success ? "The contact info is now in the roster." : scanResult.message}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setScanResult(null)}>Scan Next</Button>
              </div>
            )}

            <Button variant="outline" className="w-full border-border" onClick={() => setShowScanner(false)}>Close Scanner</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
