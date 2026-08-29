'use client';

import React, { useState, useEffect } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Ticket,
  Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserRegistrations, getRegistrationStatus } from '@/app/actions/registrations';
import { format } from 'date-fns';

interface AttendeeManagementProps {
  eventId: string;
  eventTitle: string;
}

export function AttendeeManagement({ eventId, eventTitle }: AttendeeManagementProps) {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    loadAttendees();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAttendees = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const regs = await getUserRegistrations();
      const eventRegs = regs.filter((r: any) => r.event?.id === eventId);
      setAttendees(eventRegs.map((r: any) => ({
        id: r.ticket?.id || r.id,
        name: r.ticket?.user?.name || 'Unknown',
        email: r.ticket?.user?.email || '',
        avatar: r.ticket?.user?.image,
        ticketNumber: r.ticket?.ticketNumber,
        status: r.ticket?.status,
        purchaseDate: r.ticket?.purchaseDate,
        price: r.ticket?.price,
        entryCode: r.ticket?.entryCode,
        verifiedAt: r.ticket?.verifiedAt,
      })));
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = attendees.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q) || a.ticketNumber?.toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total: attendees.length,
    confirmed: attendees.filter(a => a.status === 'confirmed').length,
    checkedIn: attendees.filter(a => a.status === 'checked-in').length,
    cancelled: attendees.filter(a => a.status === 'cancelled').length,
    revenue: attendees.reduce((sum, a) => sum + Number(a.price || 0), 0),
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = ['Name', 'Email', 'Ticket Number', 'Status', 'Purchase Date', 'Price', 'Verified At'];
      const rows = filtered.map(a => [
        a.name,
        a.email,
        a.ticketNumber,
        a.status,
        a.purchaseDate ? format(new Date(a.purchaseDate), 'PPpp') : '',
        a.price ? `$${a.price}` : 'Free',
        a.verifiedAt ? format(new Date(a.verifiedAt), 'PPpp') : 'Not verified',
      ]);

      const csvContent = [
        `Event: ${eventTitle}`,
        `Total Attendees: ${stats.total}`,
        `Confirmed: ${stats.confirmed}`,
        `Checked In: ${stats.checkedIn}`,
        `Revenue: $${stats.revenue.toFixed(2)}`,
        `Export Date: ${format(new Date(), 'PPP')}`,
        '',
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventTitle}-attendees-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported successfully' });
    } catch (e) {
      toast({ title: 'Export failed', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      'confirmed': { label: 'Confirmed', className: 'bg-emerald-500/10 text-emerald-500' },
      'checked-in': { label: 'Checked In', className: 'bg-blue-500/10 text-blue-500' },
      'cancelled': { label: 'Cancelled', className: 'bg-red-500/10 text-red-500' },
      'expired': { label: 'Expired', className: 'bg-gray-500/10 text-gray-500' },
    };
    const config = configs[status] || configs['confirmed'];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendees</h2>
          <p className="text-muted-foreground text-sm">{stats.total} registered for {eventTitle}</p>
        </div>
        <Button onClick={handleExport} disabled={exporting || attendees.length === 0}>
          {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-500">{stats.confirmed}</p>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-500">{stats.checkedIn}</p>
            <p className="text-xs text-muted-foreground">Checked In</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-500">{stats.cancelled}</p>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-500">${stats.revenue.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search by name, email, or ticket number..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className="pl-9" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : loadError ? (
        <LoadError what="attendees" onRetry={loadAttendees} />
      ) : paginated.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">No attendees found</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Attendee</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={a.avatar} />
                            <AvatarFallback className="text-xs">{a.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{a.name}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-xs">{a.ticketNumber}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(a.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.purchaseDate ? format(new Date(a.purchaseDate), 'MMM d, yyyy') : '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {a.price ? `$${a.price}` : <Badge variant="outline">Free</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
