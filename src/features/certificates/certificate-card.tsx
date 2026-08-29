'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Share2, 
  Award, 
  Calendar, 
  CheckCircle,
  Loader2,
  ExternalLink,
  Copy,
  Printer
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { useToast } from '@/hooks/use-toast';
import DOMPurify from 'isomorphic-dompurify';

interface CertificateData {
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  verificationCode: string;
  sessionTitle?: string;
}

interface CertificateCardProps {
  id: string;
  templateName: string;
  category: 'attendance' | 'completion' | 'achievement' | 'speaker' | 'organizer';
  data: CertificateData;
  issuedAt: Date;
  downloadUrl?: string;
  onDownload?: () => void;
  onShare?: () => void;
  className?: string;
}

const categoryConfig = {
  attendance: { label: 'Attendance', color: 'bg-blue-500', icon: CheckCircle },
  completion: { label: 'Completion', color: 'bg-green-500', icon: Award },
  achievement: { label: 'Achievement', color: 'bg-purple-500', icon: Award },
  speaker: { label: 'Speaker', color: 'bg-amber-500', icon: Award },
  organizer: { label: 'Organizer', color: 'bg-rose-500', icon: Award },
};

export function CertificateCard({
  id,
  templateName,
  category,
  data,
  issuedAt,
  downloadUrl,
  onDownload,
  onShare,
  className,
}: CertificateCardProps) {
  const { toast } = useToast();
  const config = categoryConfig[category];
  const Icon = config.icon;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.verificationCode);
    toast({
      title: 'Copied!',
      description: 'Verification code copied to clipboard',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Certificate Preview Header */}
      <div className={cn('h-2', config.color)} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', `${config.color}/10`)}>
              <Icon className={cn('h-5 w-5', config.color.replace('bg-', 'text-'))} />
            </div>
            <div>
              <CardTitle className="text-lg">{templateName}</CardTitle>
              <CardDescription>{data.eventTitle}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary">{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Certificate Details */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Recipient</span>
            <span className="font-medium">{data.recipientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Event Date</span>
            <span className="text-sm">{data.eventDate}</span>
          </div>
          {data.sessionTitle && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Session</span>
              <span className="text-sm">{data.sessionTitle}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Issued</span>
            <span className="text-sm">{issuedAt.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Verification Code */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/10">
          <div>
            <p className="text-xs text-muted-foreground">Verification Code</p>
            <p className="font-mono font-medium">{data.verificationCode}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleCopyCode}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="icon" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onShare}>
          <Share2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// Certificate Preview Component
interface CertificatePreviewProps {
  html: string;
  className?: string;
}

export function CertificatePreview({ html, className }: CertificatePreviewProps) {
  const sanitized = DOMPurify.sanitize(html, { ADD_TAGS: ['style'] });
  return (
    <div 
      className={cn(
        'bg-notion-surface rounded-lg shadow-lg overflow-hidden',
        'transform scale-[0.5] origin-top-left',
        className
      )}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: sanitized }}
        className="certificate-preview"
      />
    </div>
  );
}

// Certificate Download/Print Component
interface CertificateViewerProps {
  html: string;
  certificateId: string;
  onClose?: () => void;
}

export function CertificateViewer({ html, certificateId, onClose }: CertificateViewerProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    
    setIsGenerating(true);
    toast({
      title: 'Generating PDF...',
      description: 'Please wait while we prepare your certificate.',
    });

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Force high resolution for the capture
      const canvas = await html2canvas(printRef.current, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      
      // A4 Landscape dimensions in mm
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
      pdf.save(`certificate-${certificateId}.pdf`);

      toast({
        title: 'Success!',
        description: 'Certificate downloaded successfully.',
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/certificates/verify/${certificateId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Certificate',
          text: 'Check out my certificate!',
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link Copied',
        description: 'Certificate link copied to clipboard',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 flex items-center justify-center p-4">
      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Certificate Preview</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDownloadPDF} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-8 flex justify-center" ref={printRef}>
          <div 
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html, { ADD_TAGS: ['style'] }) }}
            className="shadow-xl"
          />
        </div>
      </div>
    </div>
  );
}

export default CertificateCard;

