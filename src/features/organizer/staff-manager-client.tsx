'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Trash2, 
  Shield, 
  Mic, 
  Users, 
  Mail, 
  Loader2,
  FileUp,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Settings2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addEventStaff, removeEventStaff, getEventStaff, updateEventStaff } from '@/app/actions/collab';
import Image from 'next/image';
import Papa from 'papaparse';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';

interface StaffMember {
  id: string;
  role: string;
  permissions?: string[] | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface StaffManagerProps {
  eventId: string;
  eventTitle: string;
}

export function StaffManagerClient({ eventId, eventTitle }: StaffManagerProps) {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('volunteer');
  const [isInviting, setIsInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Permission Edit State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [tempPermissions, setLocalPermissions] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const availablePermissions = [
    { id: 'scan_tickets', label: 'Scan Tickets', desc: 'Allow user to use check-in scanner.' },
    { id: 'manage_content', label: 'Manage Content', desc: 'Edit event details and agenda.' },
    { id: 'view_analytics', label: 'View Analytics', desc: 'Access revenue and feedback reports.' },
    { id: 'manage_staff', label: 'Manage Staff', desc: 'Add or remove other staff members.' },
  ];

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getEventStaff(eventId);
      setStaff(data as any);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setIsInviting(true);
    try {
      await addEventStaff(eventId, inviteEmail, inviteRole);
      toast({ title: "Staff Added", description: `${inviteEmail} is now a ${inviteRole}.` });
      setInviteEmail('');
      loadStaff();
    } catch (error: any) {
      toast({ title: "Invite Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingStaff) return;
    setIsUpdating(true);
    try {
      await updateEventStaff(editingStaff.id, { permissions: tempPermissions });
      toast({ title: "Permissions Updated" });
      setEditingStaff(null);
      loadStaff();
    } catch (e) {
      toast({ title: "Update Failed", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const togglePermission = (id: string) => {
    setLocalPermissions(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleRemove = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return;

    try {
      await removeEventStaff(staffId);
      toast({ title: "Staff Removed" });
      loadStaff();
    } catch (error: any) {
      toast({ title: "Removal Failed", variant: "destructive" });
    }
  };

  const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        let success = 0;
        let fail = 0;

        toast({ title: "Importing...", description: `Processing ${rows.length} records.` });

        for (const row of rows) {
          const email = row.email || row.Email;
          const role = row.role || row.Role || 'volunteer';
          if (email) {
            try {
              await addEventStaff(eventId, email, role.toLowerCase());
              success++;
            } catch (e) {
              fail++;
            }
          }
        }

        toast({ 
          title: "Import Complete", 
          description: `Successfully added ${success} staff. Failed: ${fail}.`,
        });
        loadStaff();
      }
    });
  };

  const filteredStaff = staff.filter(s => 
    s.user.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (s.user.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'speaker': return <Mic size={14} className="text-purple-400" />;
      case 'admin': return <Shield size={14} className="text-primary" />;
      default: return <Users size={14} className="text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-8 text-foreground">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Invite Form */}
        <Card className="bg-card border-border text-foreground h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus size={20} className="text-primary" />
              Add Event Staff
            </CardTitle>
            <CardDescription>Invite team members to help manage {eventTitle}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">User Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="colleague@example.com" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="bg-card border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select 
                  id="role"
                  className="w-full bg-card border border-border rounded-md p-2 text-sm focus:ring-1 focus:ring-cyan-500 outline-none"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                >
                  <option value="volunteer" className="bg-card">Volunteer</option>
                  <option value="speaker" className="bg-card">Speaker</option>
                  <option value="moderator" className="bg-card">Moderator</option>
                  <option value="admin" className="bg-card">Event Admin</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isInviting}>
                {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                Send Invitation
              </Button>
            </form>
          </CardContent>
          <CardFooter className="border-t border-border/50 pt-6 flex flex-col items-start gap-4">
            <Label className="text-xs text-muted-foreground uppercase font-black">Bulk Import (CSV)</Label>
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleBulkImport}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <Button variant="outline" className="w-full border-border bg-card">
                  <FileUp className="h-4 w-4 mr-2" /> Upload CSV
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="border border-border" title="Download Template">
                <Download size={16} />
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Staff List */}
        <Card className="lg:col-span-2 bg-card border-border text-foreground overflow-hidden">
          <CardHeader className="border-b border-border/50 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle>Team Roster</CardTitle>
                <CardDescription>{staff.length} members managing this event</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search team..." 
                  className="pl-9 bg-card border-border"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : loadError ? (
              <LoadError what="staff" onRetry={loadStaff} />
            ) : (
              <div className="divide-y divide-white/5">
                {filteredStaff.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 hover:bg-card transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="relative h-10 w-10 rounded-full bg-cyan-900/20 overflow-hidden">
                        {member.user.image ? (
                          <Image src={member.user.image} fill className="object-cover" alt="" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center font-bold text-primary">
                            {(member.user.name || member.user.email)[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{member.user.name || 'Staff User'}</p>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingStaff(member);
                          setLocalPermissions(member.permissions || []);
                        }}
                      >
                        <Settings2 className="w-4 h-4 mr-2" /> Permissions
                      </Button>
                      <Badge variant="outline" className="capitalize bg-card border-border flex items-center gap-1.5 px-3 py-1">
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-red-400/10 h-8 w-8"
                        onClick={() => handleRemove(member.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredStaff.length === 0 && (
                  <div className="py-20 text-center text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-10" />
                    <p>No staff members found matching your search.</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permission Dialog */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="bg-gray-950 border-border text-foreground">
          <DialogHeader>
            <DialogTitle>Edit Permissions</DialogTitle>
            <DialogDescription>
              Assign granular access for {editingStaff?.user.name || editingStaff?.user.email}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {availablePermissions.map((perm) => (
              <div key={perm.id} className="flex items-start space-x-3 p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors">
                <Checkbox 
                  id={perm.id} 
                  checked={tempPermissions.includes(perm.id)}
                  onCheckedChange={() => togglePermission(perm.id)}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor={perm.id} className="text-sm font-bold cursor-pointer">{perm.label}</Label>
                  <p className="text-xs text-muted-foreground">{perm.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingStaff(null)}>Cancel</Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleUpdatePermissions} disabled={isUpdating}>
              {isUpdating ? <Loader2 size={16} className="animate-spin mr-2" /> : <Shield size={16} className="mr-2" />}
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
