'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileArchive,
  Users,
  Mail,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { sendCertificateEmail } from '@/app/actions/certificates';

interface Attendee {
  id: string;
  name: string;
  email: string;
  ticketNumber: string;
  personalizedMessage?: string;
  status: 'pending' | 'sent' | 'failed' | 'downloading';
}

interface BulkDistributionProps {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  initialAttendees: Attendee[];
  templateHtml: string;
}

export function BulkDistributionClient({ eventId, eventTitle, eventDate, initialAttendees, templateHtml }: BulkDistributionProps) {
  const { toast } = useToast();
  const [attendees, setAttendees] = useState<Attendee[]>(initialAttendees);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentAction, setCurrentAction] = useState<'email' | 'zip' | null>(null);

  const stats = {
    total: attendees.length,
    ready: attendees.filter(a => !!a.personalizedMessage).length,
    sent: attendees.filter(a => a.status === 'sent').length,
    pending: attendees.filter(a => !a.personalizedMessage).length
  };

  const handleBulkEmail = async () => {
    setCurrentAction('email');
    setIsProcessing(true);
    setProgress(0);

    const readyAttendees = attendees.filter(a => !!a.personalizedMessage && a.status !== 'sent');
    
    for (let i = 0; i < readyAttendees.length; i++) {
      const attendee = readyAttendees[i];
      try {
        await sendCertificateEmail(attendee.id);
        setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, status: 'sent' } : a));
      } catch (error) {
        setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, status: 'failed' } : a));
      }
      setProgress(Math.round(((i + 1) / readyAttendees.length) * 100));
    }

    toast({ title: "Distribution Complete", description: `Processed ${readyAttendees.length} emails.` });
    setIsProcessing(false);
    setCurrentAction(null);
  };

  const handleBulkDownload = async () => {
    setCurrentAction('zip');
    setIsProcessing(true);
    setProgress(0);

    const zip = new JSZip();
    const readyAttendees = attendees.filter(a => !!a.personalizedMessage);
    
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1123px'; // A4 Landscape
    document.body.appendChild(container);

    for (let i = 0; i < readyAttendees.length; i++) {
      const attendee = readyAttendees[i];
      
      let renderedHtml = templateHtml
        .replace(/{attendee_name}/g, attendee.name)
        .replace(/{ticket_number}/g, attendee.ticketNumber)
        .replace(/{custom_message}/g, attendee.personalizedMessage || '')
        .replace(/{event_title}/g, eventTitle)
        .replace(/{event_date}/g, eventDate);
      
      container.innerHTML = renderedHtml;

      try {
        const canvas = await html2canvas(container, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
        const pdfBlob = pdf.output('blob');
        
        zip.file(`certificate-${attendee.ticketNumber}.pdf`, pdfBlob);
      } catch (e) {
        console.error(`Failed to generate PDF for ${attendee.name}`, e);
      }
      
      setProgress(Math.round(((i + 1) / readyAttendees.length) * 100));
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `certificates-${eventId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    document.body.removeChild(container);

    toast({ title: "Download Ready", description: "ZIP archive generated." });
    setIsProcessing(false);
    setCurrentAction(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full"><Users className="text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Total Checked-in</p>
              <p className="text-2xl font-black">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full"><CheckCircle2 className="text-emerald-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Ready to Issue</p>
              <p className="text-2xl font-black">{stats.ready}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-full"><Mail className="text-blue-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Emails Sent</p>
              <p className="text-2xl font-black">{stats.sent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-full"><AlertCircle className="text-amber-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground font-bold uppercase">Pending AI</p>
              <p className="text-2xl font-black">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border text-foreground">
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
          <CardDescription>Distribute certificates to all verified attendees at once.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentAction === 'email' ? 'Sending Emails...' : 'Generating ZIP Archive...'}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-card" />
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground" 
              onClick={handleBulkEmail}
              disabled={isProcessing || stats.ready === 0}
            >
              {currentAction === 'email' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Certificates to All ({stats.ready})
            </Button>
            
            <Button 
              variant="outline" 
              className="border-border hover:bg-card"
              onClick={handleBulkDownload}
              disabled={isProcessing || stats.ready === 0}
            >
              {currentAction === 'zip' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileArchive className="w-4 h-4 mr-2" />}
              Download All as ZIP
            </Button>

            <Button variant="ghost" className="text-muted-foreground" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh List
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-card text-muted-foreground font-bold uppercase text-[10px] tracking-widest">
            <tr>
              <th className="px-6 py-4">Attendee</th>
              <th className="px-6 py-4">Ticket</th>
              <th className="px-6 py-4">AI Message</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {attendees.map(attendee => (
              <tr key={attendee.id} className="hover:bg-card transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold">{attendee.name}</p>
                  <p className="text-xs text-muted-foreground">{attendee.email}</p>
                </td>
                <td className="px-6 py-4 font-mono text-primary">{attendee.ticketNumber}</td>
                <td className="px-6 py-4">
                  {attendee.personalizedMessage ? (
                    <p className="max-w-xs truncate text-muted-foreground italic">"{attendee.personalizedMessage}"</p>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">Processing AI...</Badge>
                  )}
                </td>
                <td className="px-6 py-4">
                  {attendee.status === 'sent' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Sent</Badge>
                  ) : attendee.status === 'failed' ? (
                    <Badge className="bg-destructive/10 text-destructive border-red-500/20">Failed</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-gray-500/20">Pending</Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={async () => {
                       try {
                         await sendCertificateEmail(attendee.id);
                         toast({ title: "Sent", description: `Email sent to ${attendee.name}` });
                         setAttendees(prev => prev.map(a => a.id === attendee.id ? { ...a, status: 'sent' } : a));
                       } catch (e) {
                         toast({ title: "Error", description: "Failed to send", variant: "destructive" });
                       }
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
