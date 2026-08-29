'use client';

import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Building2, 
  CreditCard, 
  Download, 
  AlertCircle, 
  ShieldCheck,
  Plus,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { cn } from '@/core/utils/utils';

interface PayoutTransaction {
  id: string;
  eventName: string;
  amount: number;
  fee: number;
  net: number;
  status: 'completed' | 'processing' | 'pending';
  date: string;
  method: string;
}

export default function PayoutsClient() {
  const { toast } = useToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  const [payoutStats, setPayoutStats] = useState({
    totalEarned: 14850.00,
    availableBalance: 4230.50,
    pendingClearance: 1120.00,
    platformFeeRate: '5%',
    lifetimePayouts: 9499.50,
  });

  const [transactions, setTransactions] = useState<PayoutTransaction[]>([
    {
      id: 'tx_01',
      eventName: 'Global Tech Summit 2026',
      amount: 4500.00,
      fee: 225.00,
      net: 4275.00,
      status: 'completed',
      date: '2026-08-20',
      method: 'Direct Bank Wire (•••• 4892)',
    },
    {
      id: 'tx_02',
      eventName: 'AI Hackathon & Founders Mesh',
      amount: 2800.00,
      fee: 140.00,
      net: 2660.00,
      status: 'completed',
      date: '2026-08-10',
      method: 'Direct Bank Wire (•••• 4892)',
    },
    {
      id: 'tx_03',
      eventName: 'Design Systems Live Masterclass',
      amount: 1120.00,
      fee: 56.00,
      net: 1064.00,
      status: 'processing',
      date: '2026-08-28',
      method: 'Direct Bank Wire (•••• 4892)',
    },
  ]);

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (!amountNum || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid withdrawal amount.', variant: 'destructive' });
      return;
    }

    if (amountNum > payoutStats.availableBalance) {
      toast({ title: 'Insufficient Balance', description: 'Amount exceeds available balance.', variant: 'destructive' });
      return;
    }

    setIsRequesting(true);
    await new Promise((r) => setTimeout(r, 1200));

    const newTx: PayoutTransaction = {
      id: `tx_${Date.now().toString().slice(-4)}`,
      eventName: 'Manual Balance Withdrawal',
      amount: amountNum,
      fee: Math.round(amountNum * 0.05 * 100) / 100,
      net: Math.round(amountNum * 0.95 * 100) / 100,
      status: 'processing',
      date: new Date().toISOString().split('T')[0],
      method: 'Direct Bank Wire (•••• 4892)',
    };

    setTransactions((prev) => [newTx, ...prev]);
    setPayoutStats((prev) => ({
      ...prev,
      availableBalance: prev.availableBalance - amountNum,
      pendingClearance: prev.pendingClearance + amountNum,
    }));

    setIsRequesting(false);
    setWithdrawDialogOpen(false);
    setWithdrawAmount('');

    toast({
      title: 'Withdrawal Initiated',
      description: `$${amountNum.toFixed(2)} is being dispatched to your verified bank account.`,
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Revenue & Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your ticket revenue splits, connected payout accounts, and withdrawal transfers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-xl font-bold gap-2 shadow-sm">
                <ArrowUpRight className="w-4 h-4" /> Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleWithdrawalRequest}>
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                  <DialogDescription>
                    Transfer your available funds to your linked bank account. Processing takes 1-2 business days.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="available">Available for Payout</Label>
                    <div className="text-2xl font-bold text-emerald-500 font-mono">
                      ${payoutStats.availableBalance.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Withdrawal Amount ($ USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Destination: Chase Checking (•••• 4892)</span>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setWithdrawDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isRequesting} className="gap-2">
                    {isRequesting && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Transfer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Available Balance</CardDescription>
            <CardTitle className="text-3xl font-bold text-emerald-500 font-mono">
              ${payoutStats.availableBalance.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Ready for immediate withdrawal
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Pending Clearance</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground font-mono">
              ${payoutStats.pendingClearance.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Settling from recent registrations
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Gross Event Revenue</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground font-mono">
              ${payoutStats.totalEarned.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> Across all published events
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Platform Split Rate</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground font-mono">
              {payoutStats.platformFeeRate}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 95% direct organizer payout
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LINKED PAYOUT ACCOUNT */}
      <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <CardTitle className="text-base">Linked Bank & Payout Method</CardTitle>
                <CardDescription className="text-xs">Primary account for direct ticket payouts</CardDescription>
              </div>
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> Verified & Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground">Chase Business Checking</p>
            <p className="text-xs text-muted-foreground">Account ending in <span className="font-mono font-bold text-foreground">4892</span> • Routing <span className="font-mono">••••0210</span></p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl text-xs">
            Edit Bank Details
          </Button>
        </CardContent>
      </Card>

      {/* PAYOUT HISTORY TABLE */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Payout History & Transfers</CardTitle>
          <CardDescription>All revenue dispatches from ticket sales.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{tx.eventName}</p>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] capitalize",
                        tx.status === 'completed' && "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
                        tx.status === 'processing' && "border-amber-500/30 text-amber-500 bg-amber-500/10"
                      )}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tx.method} • {tx.date}</p>
                </div>

                <div className="text-right">
                  <p className="text-base font-bold font-mono text-foreground">+${tx.net.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground font-mono">Gross: ${tx.amount.toFixed(2)} (Fee: ${tx.fee.toFixed(2)})</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
