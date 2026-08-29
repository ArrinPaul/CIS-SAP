'use client';

import React, { useState, useEffect } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Bell,
  CalendarClock,
  MapPin,
  XCircle,
  Clock,
  Megaphone,
  Loader2,
  Plus,
  Trash2,
  Send,
  Mail,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createEventUpdate, getEventUpdates, deleteEventUpdate } from '@/app/actions/event-updates';
import { format } from 'date-fns';

const UPDATE_TYPES = [
  { value: 'announcement', label: 'Announcement', icon: Megaphone, color: 'bg-blue-500/10 text-blue-500' },
  { value: 'schedule_change', label: 'Schedule Change', icon: CalendarClock, color: 'bg-amber-500/10 text-amber-500' },
  { value: 'location_change', label: 'Location Change', icon: MapPin, color: 'bg-purple-500/10 text-purple-500' },
  { value: 'cancellation', label: 'Cancellation', icon: XCircle, color: 'bg-red-500/10 text-red-500' },
  { value: 'reminder', label: 'Reminder', icon: Clock, color: 'bg-green-500/10 text-green-500' },
  { value: 'general', label: 'General', icon: Bell, color: 'bg-gray-500/10 text-gray-500' },
];

interface EventUpdatesManagerProps {
  eventId: string;
}

export function EventUpdatesManager({ eventId }: EventUpdatesManagerProps) {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'announcement',
    sendEmail: true,
  });

  useEffect(() => {
    loadUpdates();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUpdates = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getEventUpdates(eventId);
      setUpdates(data);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title || !form.content) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await createEventUpdate({ eventId, ...form });
      if (result.success) {
        toast({ title: 'Update published' });
        setShowCreateDialog(false);
        setForm({ title: '', content: '', type: 'announcement', sendEmail: true });
        loadUpdates();
      } else {
        toast({ title: result.error || 'Failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to create update', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!confirm('Delete this update?')) return;
    try {
      const result = await deleteEventUpdate(updateId);
      if (result.success) {
        toast({ title: 'Update deleted' });
        loadUpdates();
      }
    } catch (e) {
      toast({ title: 'Failed to delete', variant: 'destructive' });
    }
  };

  const getTypeConfig = (type: string) => UPDATE_TYPES.find(t => t.value === type) || UPDATE_TYPES[5];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Updates</h2>
          <p className="text-muted-foreground text-sm">Create and manage event notifications</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Update
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : loadError ? (
        <LoadError what="updates" onRetry={loadUpdates} />
      ) : updates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No updates yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {updates.map((update) => {
            const typeConfig = getTypeConfig(update.type);
            const TypeIcon = typeConfig.icon;
            return (
              <Card key={update.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <TypeIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{update.title}</h3>
                          <Badge variant="outline" className="text-[10px]">{typeConfig.label}</Badge>
                          {update.sendEmail && (
                            <Badge variant="outline" className="text-[10px]"><Mail className="h-3 w-3 mr-1" /> Email</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{update.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(update.createdAt), 'MMM d, yyyy • h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleDelete(update.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Event Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UPDATE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input placeholder="Update title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea placeholder="What do you want to tell attendees?" rows={4} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="sendEmail" checked={form.sendEmail} onChange={(e) => setForm({ ...form, sendEmail: e.target.checked })} className="rounded" />
              <Label htmlFor="sendEmail" className="cursor-pointer">Send as email notification</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
