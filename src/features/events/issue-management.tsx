'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Bug,
  MessageSquare,
  CreditCard,
  HelpCircle,
  Loader2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createIssue, getEventIssues, updateIssueStatus } from '@/app/actions/issues';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'event-info', label: 'Event Information', icon: FileText },
  { value: 'tickets-registration', label: 'Tickets & Registration', icon: AlertTriangle },
  { value: 'event-experience', label: 'Event Experience', icon: MessageSquare },
  { value: 'payments', label: 'Payments', icon: CreditCard },
  { value: 'other', label: 'Other', icon: HelpCircle },
];

const SEVERITIES = [
  { value: 'low', label: 'Low', color: 'bg-green-500/10 text-green-500' },
  { value: 'medium', label: 'Medium', color: 'bg-amber-500/10 text-amber-500' },
  { value: 'high', label: 'High', color: 'bg-red-500/10 text-red-500' },
];

const STATUSES = [
  { value: 'open', label: 'Open', color: 'bg-blue-500/10 text-blue-500' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-amber-500/10 text-amber-500' },
  { value: 'resolved', label: 'Resolved', color: 'bg-green-500/10 text-green-500' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-500/10 text-gray-500' },
];

interface IssueManagementProps {
  eventId: string;
  isOrganizer?: boolean;
}

export function IssueManagement({ eventId, isOrganizer = false }: IssueManagementProps) {
  const { toast } = useToast();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [reportForm, setReportForm] = useState({
    category: '',
    severity: 'medium',
    title: '',
    description: '',
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadIssues();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadIssues = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getEventIssues(eventId);
      setIssues(data);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportForm.category || !reportForm.title || !reportForm.description) {
      toast({ title: 'Missing fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const result = await createIssue({
        eventId,
        ...reportForm,
      });
      if (result.success) {
        toast({ title: 'Issue reported successfully' });
        setShowReportDialog(false);
        setReportForm({ category: '', severity: 'medium', title: '', description: '' });
        loadIssues();
      } else {
        toast({ title: result.error || 'Failed to report issue', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Failed to report issue', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (issueId: string, status: string) => {
    try {
      const result = await updateIssueStatus(issueId, status);
      if (result.success) {
        toast({ title: 'Status updated' });
        loadIssues();
      }
    } catch (e) {
      toast({ title: 'Failed to update status', variant: 'destructive' });
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch = searchQuery === '' ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || issue.severity === filterSeverity;
    const matchesCategory = filterCategory === 'all' || issue.category === filterCategory;
    return matchesSearch && matchesStatus && matchesSeverity && matchesCategory;
  });

  const getStatusColor = (status: string) => STATUSES.find(s => s.value === status)?.color || '';
  const getSeverityColor = (severity: string) => SEVERITIES.find(s => s.value === severity)?.color || '';
  const getCategoryLabel = (category: string) => CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Issue Tracking</h2>
          <p className="text-muted-foreground text-sm">Report and manage event issues</p>
        </div>
        <Button onClick={() => setShowReportDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> Report Issue
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severity</SelectItem>
            {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : loadError ? (
        <LoadError what="issues" onRetry={loadIssues} />
      ) : filteredIssues.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12">
            <Bug className="h-12 w-12 text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground">No issues found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredIssues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedIssue(issue)}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{issue.title}</h3>
                    <Badge className={getStatusColor(issue.status)}>{issue.status}</Badge>
                    <Badge className={getSeverityColor(issue.severity)}>{issue.severity}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{issue.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{getCategoryLabel(issue.category)}</span>
                    <span>•</span>
                    <span>{issue.reporterName}</span>
                    <span>•</span>
                    <span>{format(new Date(issue.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Category</Label>
              <Select value={reportForm.category} onValueChange={(v) => setReportForm({ ...reportForm, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severity</Label>
              <Select value={reportForm.severity} onValueChange={(v) => setReportForm({ ...reportForm, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input placeholder="Brief description of the issue" value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea placeholder="Detailed description..." rows={4} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Attachments (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setAttachments(Array.from(e.target.files || []))}
              />
              <Button variant="outline" className="w-full mt-1" onClick={() => fileInputRef.current?.click()}>
                {attachments.length > 0 ? `${attachments.length} file(s) selected` : 'Add Files'}
              </Button>
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {attachments.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{f.name}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitReport} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <DialogContent className="max-w-lg">
          {selectedIssue && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedIssue.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Badge className={getStatusColor(selectedIssue.status)}>{selectedIssue.status}</Badge>
                  <Badge className={getSeverityColor(selectedIssue.severity)}>{selectedIssue.severity}</Badge>
                  <Badge variant="outline">{getCategoryLabel(selectedIssue.category)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{selectedIssue.description}</p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Reported by: <strong>{selectedIssue.reporterName}</strong> ({selectedIssue.reporterEmail})</p>
                  <p>Date: {format(new Date(selectedIssue.createdAt), 'PPpp')}</p>
                </div>
                {selectedIssue.adminNotes && (
                  <div className="bg-muted/50 p-3 rounded-lg text-sm">
                    <p className="font-semibold mb-1">Admin Notes:</p>
                    <p>{selectedIssue.adminNotes}</p>
                  </div>
                )}
                {isOrganizer && (
                  <div className="flex gap-2 flex-wrap pt-2 border-t">
                    {selectedIssue.status !== 'in-progress' && (
                      <Button size="sm" variant="outline" onClick={() => { handleUpdateStatus(selectedIssue.id, 'in-progress'); setSelectedIssue(null); }}>
                        <Clock className="h-3 w-3 mr-1" /> Start Progress
                      </Button>
                    )}
                    {selectedIssue.status !== 'resolved' && (
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => { handleUpdateStatus(selectedIssue.id, 'resolved'); setSelectedIssue(null); }}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Resolve
                      </Button>
                    )}
                    {selectedIssue.status !== 'closed' && (
                      <Button size="sm" variant="outline" className="text-gray-600" onClick={() => { handleUpdateStatus(selectedIssue.id, 'closed'); setSelectedIssue(null); }}>
                        <XCircle className="h-3 w-3 mr-1" /> Close
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
