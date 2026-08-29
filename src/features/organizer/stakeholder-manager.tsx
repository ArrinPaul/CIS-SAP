'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Users,
  Mic,
  Shield,
  UserCheck,
  Loader2,
  Plus,
  Trash2,
  Search,
  Mail,
  UserPlus,
  FileUp,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createStakeholder, getEventStakeholders, getStakeholderStats, deleteStakeholder } from '@/app/actions/stakeholders';
import { format } from 'date-fns';
import Papa from 'papaparse';

const ROLES = [
  { value: 'volunteer', label: 'Volunteer', icon: Shield },
  { value: 'speaker', label: 'Speaker', icon: Mic },
  { value: 'attendee', label: 'Attendee', icon: Users },
  { value: 'organizer', label: 'Organizer', icon: UserCheck },
];

interface StakeholderManagerProps {
  eventId: string;
}

export function StakeholderManager({ eventId }: StakeholderManagerProps) {
  const { toast } = useToast();
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, volunteers: 0, speakers: 0, attended: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ name: '', email: '', role: 'volunteer' });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('volunteer');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [data, statsData] = await Promise.all([
        getEventStakeholders(eventId),
        getStakeholderStats(eventId),
      ]);
      setStakeholders(data);
      setStats(statsData);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.name || !form.email) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await createStakeholder({ eventId, ...form });
      if (result.success) {
        toast({ title: 'Stakeholder added' });
        setShowAddDialog(false);
        setForm({ name: '', email: '', role: 'volunteer' });
        loadData();
      } else {
        toast({ title: result.error || 'Failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to add stakeholder', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this stakeholder?')) return;
    try {
      const result = await deleteStakeholder(id);
      if (result.success) {
        toast({ title: 'Stakeholder removed' });
        loadData();
      }
    } catch (e) {
      toast({ title: 'Failed to remove', variant: 'destructive' });
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = result.data as any[];

      let successCount = 0;
      for (const row of rows) {
        const name = row.Name || row.name || '';
        const email = row.Email || row.email || '';
        const role = row.Role || row.role || 'volunteer';
        if (email) {
          const res = await createStakeholder({ eventId, name: name || email.split('@')[0], email, role });
          if (res.success) successCount++;
        }
      }

      toast({ title: `Imported ${successCount} of ${rows.length} stakeholders` });
      setShowImportDialog(false);
      loadData();
    } catch (err) {
      toast({ title: 'Import failed', variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await createStakeholder({ eventId, name: inviteEmail.split('@')[0], email: inviteEmail, role: inviteRole });
      if (res.success) {
        toast({ title: 'Invitation sent' });
        setShowInviteDialog(false);
        setInviteEmail('');
        loadData();
      } else {
        toast({ title: res.error || 'Failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to send invitation', variant: 'destructive' });
    } finally {
      setInviting(false);
    }
  };

  const filtered = stakeholders.filter((s) => {
    const matchesSearch = searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getRoleConfig = (role: string) => ROLES.find(r => r.value === role) || ROLES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Stakeholders</h2>
          <p className="text-muted-foreground text-sm">Manage volunteers, speakers, and organizers</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.tsv,.txt" onChange={handleCSVImport} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <FileUp className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button variant="outline" onClick={() => setShowInviteDialog(true)}>
            <Mail className="h-4 w-4 mr-2" /> Invite
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{stats.volunteers}</p>
            <p className="text-xs text-muted-foreground">Volunteers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">{stats.speakers}</p>
            <p className="text-xs text-muted-foreground">Speakers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{stats.attended}</p>
            <p className="text-xs text-muted-foreground">Attended</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : loadError ? (
        <LoadError what="stakeholders" onRetry={loadData} />
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No stakeholders found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filtered.map((s) => {
                const roleConfig = getRoleConfig(s.role);
                const RoleIcon = roleConfig.icon;
                return (
                  <div key={s.id} className="flex items-center gap-4 p-4 hover:bg-muted/50">
                    <div className="p-2 rounded-lg bg-muted">
                      <RoleIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{s.name}</p>
                      <p className="text-sm text-muted-foreground truncate">{s.email}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">{s.role}</Badge>
                    <Badge variant={s.attendanceStatus === 'attended' ? 'default' : 'secondary'}>
                      {s.attendanceStatus}
                    </Badge>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Stakeholder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Stakeholder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
