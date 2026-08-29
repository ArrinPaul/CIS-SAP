'use client';

import React, { useState, useEffect } from 'react';
import { 
  Tag, 
  Plus, 
  Percent, 
  DollarSign, 
  Copy, 
  Check, 
  Trash2, 
  Power, 
  PowerOff, 
  Calendar, 
  Users, 
  Sparkles, 
  Loader2,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  createPromoCode, 
  getEventPromoCodes, 
  togglePromoCodeStatus, 
  deletePromoCode 
} from '@/app/actions/promo-codes';
import { cn } from '@/core/utils/utils';

export default function PromoCodesManager() {
  const { toast } = useToast();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('20');
  const [maxUses, setMaxUses] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [expiresAt, setExpiresAt] = useState('');

  const loadPromos = async () => {
    setLoading(true);
    try {
      const res = await getEventPromoCodes();
      if (res.success) {
        setPromos(res.promoCodes);
      }
    } catch (e) {
      toast({ title: 'Failed to load promo codes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await createPromoCode({
        code: code.trim(),
        discountType,
        discountValue: parseFloat(discountValue),
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : 0,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });

      if (res.success && res.promoCode) {
        toast({ title: 'Promo Code Created!', description: `Code ${res.promoCode.code} is now active.` });
        setPromos([res.promoCode, ...promos]);
        setDialogOpen(false);
        // Reset
        setCode('');
        setDiscountValue('20');
        setMaxUses('');
        setExpiresAt('');
      } else {
        toast({ title: 'Creation Failed', description: res.error || 'Check fields and try again.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (promoId: string, currentStatus: boolean) => {
    try {
      const res = await togglePromoCodeStatus(promoId, !currentStatus);
      if (res.success) {
        setPromos(promos.map(p => p.id === promoId ? { ...p, isActive: !currentStatus } : p));
        toast({ title: !currentStatus ? 'Promo Code Activated' : 'Promo Code Paused' });
      }
    } catch (e) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDelete = async (promoId: string) => {
    try {
      const res = await deletePromoCode(promoId);
      if (res.success) {
        setPromos(promos.filter(p => p.id !== promoId));
        toast({ title: 'Promo Code Deleted' });
      }
    } catch (e) {
      toast({ title: 'Delete Failed', variant: 'destructive' });
    }
  };

  const handleCopy = (promoCode: string) => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(promoCode);
    toast({ title: 'Copied to Clipboard!', description: promoCode });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const applyPreset = (presetCode: string, type: 'percentage' | 'fixed', val: string) => {
    setCode(presetCode);
    setDiscountType(type);
    setDiscountValue(val);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Promo Codes & Discounts</h1>
            <Badge className="bg-primary/10 text-primary border-primary/20 gap-1 font-mono text-[11px]">
              <Sparkles className="w-3 h-3" /> Discount Engine
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Create coupons, percentage discounts, and early-bird promotional codes for your events.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="rounded-xl font-bold gap-2 shadow-sm">
              <Plus className="w-4 h-4" /> Create Promo Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreatePromo}>
              <DialogHeader>
                <DialogTitle>New Promotional Code</DialogTitle>
                <DialogDescription>
                  Configure discount amounts, usage limits, and expiration dates.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* PRESET SHORTCUTS */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Quick Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset('EARLYBIRD20', 'percentage', '20')}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted font-mono"
                    >
                      EARLYBIRD20 (-20%)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('STUDENT50', 'percentage', '50')}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted font-mono"
                    >
                      STUDENT50 (-50%)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('VIPFREE', 'percentage', '100')}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted font-mono"
                    >
                      VIPFREE (-100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset('SAVE15', 'fixed', '15')}
                      className="px-2.5 py-1 text-xs rounded-lg border border-border bg-muted/40 hover:bg-muted font-mono"
                    >
                      SAVE15 (-$15)
                    </button>
                  </div>
                </div>

                {/* CODE INPUT */}
                <div className="space-y-2">
                  <Label htmlFor="promo-code">Coupon Code</Label>
                  <Input
                    id="promo-code"
                    placeholder="e.g. SUMMERFEST"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono uppercase tracking-wider font-bold"
                    required
                  />
                </div>

                {/* TYPE & VALUE */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <RadioGroup 
                      value={discountType} 
                      onValueChange={(val: any) => setDiscountType(val)}
                      className="flex gap-4 pt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id="r-percent" />
                        <Label htmlFor="r-percent" className="text-xs">Percent (%)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id="r-fixed" />
                        <Label htmlFor="r-fixed" className="text-xs">Fixed ($)</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount-val">
                      {discountType === 'percentage' ? 'Percentage Off (%)' : 'Fixed Amount ($)'}
                    </Label>
                    <Input
                      id="discount-val"
                      type="number"
                      step="0.01"
                      min="1"
                      max={discountType === 'percentage' ? '100' : '9999'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* USAGE LIMIT & MIN ORDER */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-uses">Max Uses (Optional)</Label>
                    <Input
                      id="max-uses"
                      type="number"
                      placeholder="Unlimited"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min-order">Min Order ($)</Label>
                    <Input
                      id="min-order"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={minOrderAmount}
                      onChange={(e) => setMinOrderAmount(e.target.value)}
                    />
                  </div>
                </div>

                {/* EXPIRATION DATE */}
                <div className="space-y-2">
                  <Label htmlFor="expires">Expiration Date (Optional)</Label>
                  <Input
                    id="expires"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating} className="gap-2">
                  {isCreating && <Loader2 className="w-4 h-4 animate-spin" />} Create Coupon
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* PROMO CODES LIST */}
      <Card className="rounded-3xl border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg">Active Coupons & Promo Codes</CardTitle>
          <CardDescription>Share these codes with your community to apply instant checkout discounts.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading promo codes...
            </div>
          ) : promos.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Tag className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-base font-semibold text-foreground">No promo codes created yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Create your first promotional discount coupon to drive early bird sales and boost event registration.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {promos.map((promo) => {
                const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
                const isCapped = promo.maxUses && promo.usedCount >= promo.maxUses;

                return (
                  <div key={promo.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                    
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-base font-bold text-foreground bg-primary/10 px-2.5 py-0.5 rounded-lg border border-primary/20">
                          {promo.code}
                        </span>

                        <Badge 
                          variant="secondary" 
                          className="font-bold text-xs"
                        >
                          {promo.discountType === 'percentage' ? `${promo.discountValue}% OFF` : `$${promo.discountValue} OFF`}
                        </Badge>

                        {promo.isActive && !isExpired && !isCapped ? (
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                            Active
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="destructive" className="text-[10px]">
                            Expired
                          </Badge>
                        ) : isCapped ? (
                          <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/30">
                            Limit Reached
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Paused
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Used: <strong className="text-foreground">{promo.usedCount}</strong> {promo.maxUses ? `/ ${promo.maxUses}` : '(Unlimited)'}</span>
                        {Number(promo.minOrderAmount) > 0 && (
                          <span>Min Order: ${Number(promo.minOrderAmount).toFixed(2)}</span>
                        )}
                        {promo.expiresAt && (
                          <span>Expires: {new Date(promo.expiresAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(promo.code)}
                        className="rounded-xl text-xs gap-1.5"
                      >
                        {copiedCode === promo.code ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode === promo.code ? 'Copied' : 'Copy'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(promo.id, promo.isActive)}
                        className={cn("rounded-xl text-xs gap-1.5", promo.isActive ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600")}
                      >
                        {promo.isActive ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                        {promo.isActive ? 'Pause' : 'Activate'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(promo.id)}
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
