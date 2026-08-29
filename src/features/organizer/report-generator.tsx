'use client';

import React, { useState, useEffect } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Download, Sparkles, BarChart3, TrendingUp, MessageSquare, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateAndSaveReport, getEventReports } from '@/app/actions/reports';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

interface ReportGeneratorProps {
  eventId: string;
}

export function ReportGenerator({ eventId }: ReportGeneratorProps) {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [highlights, setHighlights] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    loadReports();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadReports = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getEventReports(eventId);
      setReports(data);
      if (data.length > 0 && data[0].generatedContent) {
        try {
          setReport(JSON.parse(data[0].generatedContent as string));
        } catch (e) {
          setLoadError(true);
          setReport(null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const highlightsList = highlights.split('\n').filter(h => h.trim());
      const result = await generateAndSaveReport(eventId, highlightsList.length > 0 ? highlightsList : undefined);
      if (result.success && result.report) {
        setReport(result.report);
        toast({ title: 'Report generated' });
        loadReports();
      } else {
        const errMsg = 'error' in result ? result.error : 'Generation failed';
        toast({ title: errMsg || 'Generation failed', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Report generation failed', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportJSON = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!report) return;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(report.eventTitle || 'Event Report', 105, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${format(new Date(report.generatedAt), 'PPpp')}`, 105, y, { align: 'center' });
    y += 10;
    doc.text(`Attendees: ${report.totalAttendees} | Revenue: $${report.totalRevenue} | Rating: ${report.averageRating?.toFixed(1) || 'N/A'}/5`, 105, y, { align: 'center' });
    y += 15;

    const sections = [
      { key: 'executiveSummary', title: 'Executive Summary' },
      { key: 'performanceAnalysis', title: 'Performance Analysis' },
      { key: 'financialSummary', title: 'Financial Summary' },
      { key: 'feedbackAnalysis', title: 'Feedback Analysis' },
      { key: 'keyAchievements', title: 'Key Achievements' },
      { key: 'recommendations', title: 'Recommendations' },
    ];

    for (const section of sections) {
      if (!report[section.key]) continue;
      if (y > 260) { doc.addPage(); y = 20; }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(section.title, 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(report[section.key], 170);
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 5;
      }
      y += 10;
    }

    doc.save(`event-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  const sections = [
    { key: 'executiveSummary', title: 'Executive Summary', icon: FileText },
    { key: 'performanceAnalysis', title: 'Performance Analysis', icon: BarChart3 },
    { key: 'financialSummary', title: 'Financial Summary', icon: TrendingUp },
    { key: 'feedbackAnalysis', title: 'Feedback Analysis', icon: MessageSquare },
    { key: 'keyAchievements', title: 'Key Achievements', icon: Sparkles },
    { key: 'recommendations', title: 'Recommendations', icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      {loadError && <LoadError what="previous reports" onRetry={loadReports} compact />}
        <div>
          <h2 className="text-2xl font-bold">Event Report</h2>
          <p className="text-muted-foreground text-sm">AI-generated post-event analysis</p>
        </div>
        {report && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportJSON}>
              <Download className="h-4 w-4 mr-2" /> JSON
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileImage className="h-4 w-4 mr-2" /> PDF
            </Button>
          </div>
        )}
      </div>

      {!report && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Generate Report
            </CardTitle>
            <CardDescription>
              Provide key highlights for a better report, or generate with just event data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Key Highlights (one per line, optional)</Label>
              <Textarea
                placeholder="e.g. Record attendance&#10;Great speaker lineup&#10;Positive feedback"
                rows={4}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
              />
            </div>
            <Button onClick={handleGenerate} disabled={generating} className="w-full">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {generating ? 'Generating Report...' : 'Generate AI Report'}
            </Button>
          </CardContent>
        </Card>
      )}

      {report && (
        <div className="space-y-4">
          {report.eventTitle && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span><strong>Event:</strong> {report.eventTitle}</span>
              <span><strong>Attendees:</strong> {report.totalAttendees}</span>
              <span><strong>Revenue:</strong> ${report.totalRevenue}</span>
              {report.averageRating > 0 && <span><strong>Rating:</strong> {report.averageRating.toFixed(1)}/5</span>}
            </div>
          )}

          {sections.map(({ key, title, icon: Icon }) => (
            report[key] ? (
              <Card key={key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" /> {title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{report[key]}</p>
                </CardContent>
              </Card>
            ) : null
          ))}

          <Button variant="ghost" onClick={() => setReport(null)} className="w-full">
            Generate New Report
          </Button>
        </div>
      )}

      {!loading && reports.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Previous Reports</h3>
          {reports.slice(1).map((r) => (
            <Card key={r.id} className="cursor-pointer hover:shadow-md" onClick={() => {
              try { setReport(JSON.parse(r.generatedContent)); } catch (e) {}
            }}>
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{r.preparedBy || 'Event Report'}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(r.createdAt), 'PPpp')}</p>
                </div>
                <Badge variant="outline">View</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
