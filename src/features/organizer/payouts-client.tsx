'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  Building2, 
  ShieldCheck,
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
import { getOrganizerPayoutSummary, requestOrganizerPayout, PayoutSummary } from '@/app/actions/payouts';

export default function PayoutsClient() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  const [summary, setSummary] = useState<PayoutSummary>({
    grossRevenue: 0,
    platformFees: 0,
    netRevenue: 0,
    totalPaidOut: 0,
    pendingPayouts: 0,
    availableBalance: 0,
    totalTicketsSold: 0,
    payoutHistory: [],
  });

  const loadFinancials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getOrganizerPayoutSummary();
      setSummary(data);
    } catch {
      // Graceful fallback for unauthenticated preview
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFinancials();
  }, [loadFinancials]);

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);

    if (!amountNum || amountNum <= 0) {
      toast({ title: 'Invalid Amount', description: 'Please enter a valid withdrawal amount.', variant: 'destructive' });
      return;
    }

    if (amountNum > summary.availableBalance) {
      toast({ title: 'Insufficient Balance', description: 'Amount exceeds available balance.', variant: 'destructive' });
      return;
    }

    setIsRequesting(true);
    try {
      const res = await requestOrganizerPayout({
        amount: amountNum,
        destinationDetails: {
          accountName: accountName || 'Primary Organizer Account',
          accountNumber: accountNumber || '••••4892',
          routingOrIfsc: ifscCode || 'HDFC0001234',
        },
      });

      if (res.success) {
        toast({
          title: 'Withdrawal Initiated',
          description: `₹${amountNum.toFixed(2)} requested for bank transfer.`,
        });
        setWithdrawDialogOpen(false);
        setWithdrawAmount('');
        loadFinancials();
      } else {
        toast({
          title: 'Request Failed',
          description: res.error || 'Failed to submit withdrawal request',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal request',
        variant: 'destructive',
      });
    } finally {
      setIsRequesting(false);
    }
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
          <Button variant="outline" size="lg" onClick={loadFinancials} disabled={isLoading} className="gap-2 rounded-xl">
            <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} /> Refresh
          </Button>

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
                  <div className="space-y-1">
                    <Label htmlFor="available">Available for Payout</Label>
                    <div className="text-2xl font-bold text-emerald-500 font-mono">
                      ₹{summary.availableBalance.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Withdrawal Amount (₹ INR)</Label>
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
                  <div className="space-y-2">
                    <Label htmlFor="accName">Account Holder Name</Label>
                    <Input
                      id="accName"
                      placeholder="John Doe"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accNum">Bank Account Number</Label>
                    <Input
                      id="accNum"
                      placeholder="987654321012"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc">IFSC / Routing Code</Label>
                    <Input
                      id="ifsc"
                      placeholder="HDFC0001234"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                    />
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
              ₹{summary.availableBalance.toFixed(2)}
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
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Pending Payouts</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground font-mono">
              ₹{summary.pendingPayouts.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Processing in bank queue
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Gross Event Revenue</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground font-mono">
              ₹{summary.grossRevenue.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-primary" /> {summary.totalTicketsSold} tickets sold
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Platform Split Rate</CardDescription>
            <CardTitle className="text-3xl font-bold text-foreground font-mono">
              5%
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
            <p className="text-sm font-bold text-foreground">Direct Bank Wire</p>
            <p className="text-xs text-muted-foreground">Automated settlement within 1-2 business days into linked account</p>
          </div>
        </CardContent>
      </Card>

      {/* PAYOUT HISTORY TABLE */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Payout History & Transfers</CardTitle>
          <CardDescription>All revenue dispatches from ticket sales.</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.payoutHistory.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No payout requests yet. When you request a payout, status and ledger details will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {summary.payoutHistory.map((tx) => (
                <div key={tx.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground capitalize">{tx.payoutMethod.replace('_', ' ')}</p>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] capitalize",
                          tx.status === 'completed' && "border-emerald-500/30 text-emerald-500 bg-emerald-500/10",
                          (tx.status === 'processing' || tx.status === 'pending') && "border-amber-500/30 text-amber-500 bg-amber-500/10",
                          tx.status === 'failed' && "border-red-500/30 text-red-500 bg-red-500/10"
                        )}
                      >
                        {tx.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-bold font-mono text-foreground">₹{Number(tx.netAmount).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground font-mono">Gross: ₹{Number(tx.amount).toFixed(2)} (Fee: ₹{Number(tx.platformFee).toFixed(2)})</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
