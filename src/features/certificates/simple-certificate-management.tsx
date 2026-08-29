'use client';

import React, { useState, useEffect } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Award,
  Users,
  Shield,
  Mic,
  Download,
  Mail,
  Loader2,
  Eye,
  Palette,
  FileText,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  getCertificateTemplates,
  bulkIssueCertificates,
  getCheckedInAttendees,
} from '@/app/actions/certificates';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

const COLOR_SCHEMES = [
  { id: 'blue', name: 'Professional Blue', primary: '#1e40af', secondary: '#3b82f6', bg: '#eff6ff' },
  { id: 'green', name: 'Achievement Green', primary: '#166534', secondary: '#22c55e', bg: '#f0fdf4' },
  { id: 'purple', name: 'Excellence Purple', primary: '#6b21a8', secondary: '#a855f7', bg: '#faf5ff' },
  { id: 'gold', name: 'Gold Prestige', primary: '#92400e', secondary: '#f59e0b', bg: '#fffbeb' },
  { id: 'red', name: 'Crimson Honor', primary: '#991b1b', secondary: '#ef4444', bg: '#fef2f2' },
];

const ROLES = [
  { value: 'participant', label: 'Participant', icon: Users },
  { value: 'volunteer', label: 'Volunteer', icon: Shield },
  { value: 'speaker', label: 'Speaker', icon: Mic },
];

interface SimpleCertificateManagementProps {
  eventId: string;
  eventTitle: string;
}

export function SimpleCertificateManagement({ eventId, eventTitle }: SimpleCertificateManagementProps) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState('participant');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedColorScheme, setSelectedColorScheme] = useState('blue');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [tpls, atts] = await Promise.all([
        getCertificateTemplates(eventId),
        getCheckedInAttendees(eventId),
      ]);
      setTemplates(tpls);
      setAttendees(atts);
      if (tpls.length > 0) setSelectedTemplate(tpls[0].id);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getColorScheme = () => COLOR_SCHEMES.find(c => c.id === selectedColorScheme) || COLOR_SCHEMES[0];

  const generatePreviewHtml = () => {
    const scheme = getColorScheme();
    const roleLabel = ROLES.find(r => r.value === selectedRole)?.label || 'Participant';
    return `
      <!DOCTYPE html>
      <html>
      <head><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f3f4f6;font-family:Georgia,serif}</style></head>
      <body>
        <div style="width:800px;height:565px;background:${scheme.bg};border:8px solid ${scheme.primary};position:relative;padding:60px;text-align:center">
          <div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,${scheme.primary},${scheme.secondary})"></div>
          <div style="font-size:14px;color:${scheme.secondary};text-transform:uppercase;letter-spacing:6px;margin-bottom:8px">Certificate of ${roleLabel === 'Speaker' ? 'Appreciation' : 'Participation'}</div>
          <div style="font-size:11px;color:#888;margin-bottom:30px">This is to certify that</div>
          <div style="font-size:36px;color:${scheme.primary};font-weight:bold;font-style:italic;margin-bottom:12px">[Attendee Name]</div>
          <div style="font-size:13px;color:#666;margin-bottom:8px">has successfully participated as</div>
          <div style="font-size:20px;color:${scheme.secondary};font-weight:bold;margin-bottom:30px">${roleLabel}</div>
          <div style="font-size:14px;color:#555;margin-bottom:4px">in the event</div>
          <div style="font-size:22px;color:${scheme.primary};font-weight:bold;margin-bottom:30px">${eventTitle}</div>
          <div style="position:absolute;bottom:60px;left:60px;right:60px;display:flex;justify-content:space-between;padding-top:20px;border-top:2px solid ${scheme.primary}30">
            <div style="text-align:center"><div style="font-size:12px;color:${scheme.primary};font-weight:bold">[Organizer]</div><div style="font-size:10px;color:#888">Organizer</div></div>
            <div style="text-align:center"><div style="font-size:12px;color:${scheme.primary};font-weight:bold">[Date]</div><div style="font-size:10px;color:#888">Date</div></div>
            <div style="text-align:center"><div style="font-size:12px;color:${scheme.primary};font-weight:bold">[Certificate ID]</div><div style="font-size:10px;color:#888">Certificate ID</div></div>
          </div>
        </div>
      </body>
      </html>`;
  };

  const handleBulkDownload = async () => {
    if (attendees.length === 0) {
      toast({ title: 'No attendees to generate certificates for', variant: 'destructive' });
      return;
    }
    setGenerating(true);
    try {
      const zip = new JSZip();
      const scheme = getColorScheme();
      const roleLabel = ROLES.find(r => r.value === selectedRole)?.label || 'Participant';

      for (const attendee of attendees) {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        doc.setFillColor(scheme.bg);
        doc.rect(0, 0, 297, 210, 'F');
        doc.setDrawColor(scheme.primary);
        doc.setLineWidth(3);
        doc.rect(10, 10, 277, 190);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(scheme.secondary);
        doc.text(`CERTIFICATE OF ${roleLabel === 'Speaker' ? 'APPRECIATION' : 'PARTICIPATION'}`, 148.5, 40, { align: 'center' });

        doc.setFontSize(11);
        doc.setTextColor(120, 120, 120);
        doc.text('This is to certify that', 148.5, 60, { align: 'center' });

        doc.setFontSize(28);
        doc.setTextColor(scheme.primary);
        doc.text(attendee.name || attendee.email, 148.5, 80, { align: 'center' });

        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(`has successfully participated as ${roleLabel}`, 148.5, 95, { align: 'center' });

        doc.setFontSize(18);
        doc.setTextColor(scheme.secondary);
        doc.text(eventTitle, 148.5, 115, { align: 'center' });

        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(new Date().toLocaleDateString(), 148.5, 185, { align: 'center' });

        const fileName = `${roleLabel}-${(attendee.name || attendee.email).replace(/\s+/g, '_')}.pdf`;
        zip.file(fileName, doc.output('arraybuffer'));
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${eventTitle}-${selectedRole}-certificates.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: `Downloaded ${attendees.length} certificates` });
    } catch (e) {
      toast({ title: 'Download failed', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleBulkEmail = async () => {
    if (attendees.length === 0) {
      toast({ title: 'No attendees to email', variant: 'destructive' });
      return;
    }
    setDistributing(true);
    try {
      const result = await bulkIssueCertificates(eventId);
      toast({ title: `Certificates distributed to ${result?.count || 0} attendees` });
    } catch (e) {
      toast({ title: 'Distribution failed', variant: 'destructive' });
    } finally {
      setDistributing(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (loadError) {
    return <LoadError what="certificates" onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Certificate Management</h2>
        <p className="text-muted-foreground text-sm">Generate and distribute certificates for {eventTitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ROLES.map((role) => {
          const Icon = role.icon;
          const roleAttendees = attendees.length;
          return (
            <Card
              key={role.value}
              className={`cursor-pointer transition-all ${selectedRole === role.value ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => setSelectedRole(role.value)}
            >
              <CardContent className="p-6 text-center">
                <Icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-bold">{role.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{roleAttendees} attendees</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                  <SelectItem value="default">Default Template</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="flex items-center gap-2"><Palette className="h-4 w-4" /> Color Scheme</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {COLOR_SCHEMES.map((scheme) => (
                  <button
                    key={scheme.id}
                    onClick={() => setSelectedColorScheme(scheme.id)}
                    className={`h-10 rounded-lg border-2 transition-all ${selectedColorScheme === scheme.id ? 'border-primary scale-110' : 'border-transparent'}`}
                    style={{ background: `linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary})` }}
                    title={scheme.name}
                  />
                ))}
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowPreview(true)}>
              <Eye className="h-4 w-4 mr-2" /> Preview Certificate
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" /> Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={handleBulkDownload} disabled={generating || attendees.length === 0}>
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download All ({attendees.length})
            </Button>
            <Button variant="outline" className="w-full" onClick={handleBulkEmail} disabled={distributing || attendees.length === 0}>
              {distributing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Email All ({attendees.length})
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            <iframe
              srcDoc={generatePreviewHtml()}
              className="w-full h-[500px] border rounded-lg"
              title="Certificate Preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
