'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Award, 
  Download, 
  ExternalLink, 
  Search, 
  Loader2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { CertificateViewer } from '@/features/certificates/certificate-card';
import { generateCertificateHtml } from '@/core/utils/certificate-generator';
import { getUserCertificates, verifyCertificate } from '@/app/actions/certificates';
import { useToast } from '@/hooks/use-toast';

// Re-defining icons since they were mapped earlier, but we can use direct imports now
const AwardIcon = Award;
const SpinnerIcon = Loader2;
const SearchIcon = Search;
const ShieldIcon = ShieldCheck;
const CheckIcon = CheckCircle2;
const XIcon = XCircle;
const CalendarIcon = Calendar;
const LinkIcon = ExternalLink;

export function CertificatesClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [verifyNumber, setVerifyNumber] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  
  const [selectedCert, setSelectedCert] = useState<any>(null);

  const fetchCertificates = useCallback(async () => {
    try {
      const data = await getUserCertificates();
      setCertificates(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch your certificates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchCertificates();
    }
  }, [user, authLoading, fetchCertificates]);

  const filteredCertificates = certificates.filter((cert: any) => 
    cert.event?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleVerify = async () => {
    if (!verifyNumber.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await verifyCertificate(verifyNumber.trim());
      setVerifyResult(result);
    } catch (error) {
      setVerifyResult({ valid: false });
    } finally {
      setVerifying(false);
    }
  };

  if (authLoading || (loading && certificates.length === 0)) {
    return (
      <div className="container py-20 flex flex-col items-center justify-center text-foreground">
        <SpinnerIcon className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your achievements...</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8 text-foreground">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight">My Certificates</h1>
          <p className="text-muted-foreground mt-2 text-lg">Verified proof of your professional achievements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full md:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Search by event or ID..." 
              className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-border hover:bg-muted bg-card">
                <ShieldIcon className="w-4 h-4 mr-2" /> Verify
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card text-foreground border-border shadow-2xl">
              <DialogHeader>
                <DialogTitle>Verify Certificate Authenticity</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">Enter the unique certificate number to verify its validity on the Eventra platform.</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter ID (e.g. TKT-XJ8K2L)"
                    value={verifyNumber}
                    onChange={(e) => setVerifyNumber(e.target.value)}
                    className="bg-card border-border h-11 font-mono uppercase"
                  />
                  <Button onClick={handleVerify} disabled={verifying} className="bg-primary hover:bg-cyan-700 h-11 px-6">
                    {verifying ? <SpinnerIcon className="h-4 w-4 animate-spin" /> : 'Verify'}
                  </Button>
                </div>
                {verifyResult && (
                  <div className={`p-5 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${verifyResult.valid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-destructive/10 border-red-500/30'}`}>
                    {verifyResult.valid ? (
                      <div className="flex items-start gap-4">
                        <CheckIcon className="h-6 w-6 text-emerald-500 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-bold text-emerald-400">Certificate Verified</p>
                          <div className="text-sm space-y-1">
                            <p><span className="text-muted-foreground">Recipient:</span> <span className="text-foreground font-medium">{verifyResult.userName}</span></p>
                            <p><span className="text-muted-foreground">Event:</span> <span className="text-foreground font-medium">{verifyResult.eventTitle}</span></p>
                            <p><span className="text-muted-foreground">Issued:</span> <span className="text-foreground font-medium">{verifyResult.issueDate ? format(new Date(verifyResult.issueDate), 'MMMM dd, yyyy') : 'N/A'}</span></p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <XIcon className="h-6 w-6 text-destructive" />
                        <div>
                          <p className="font-bold text-destructive">Verification Failed</p>
                          <p className="text-sm text-red-200/60">No valid certificate found with this ID.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filteredCertificates.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border rounded-3xl bg-card backdrop-blur-sm">
          <AwardIcon size={64} className="mx-auto mb-6 text-gray-700 opacity-50" />
          <h3 className="text-xl font-bold mb-2">No certificates found</h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">Attend events and complete your journey to earn verified achievements that showcase your skills.</p>
          <Button asChild variant="outline" className="border-border hover:bg-muted">
            <a href="/explore">Explore Upcoming Events</a>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert: any) => (
            <Card key={cert.id} className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-lg hover:shadow-cyan-500/10">
              <div className="h-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-primary/10 p-3 rounded-2xl border border-cyan-500/10">
                    <AwardIcon className="w-8 h-8 text-primary" />
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-widest border-border text-muted-foreground bg-card">
                    ID: {cert.certificateNumber}
                  </Badge>
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="text-xl font-bold line-clamp-2 leading-tight group-hover:text-primary transition-colors h-14">
                    {cert.event?.title}
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarIcon size={14} className="text-gray-600" />
                      <span>Issued on {cert.issueDate ? format(new Date(cert.issueDate), 'MMMM dd, yyyy') : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldIcon size={14} className="text-emerald-500" />
                      <span className="text-emerald-500/80 font-medium">Verified Completion</span>
                    </div>
                  </div>

                  {cert.personalizedMessage && (
                    <div className="bg-card p-4 rounded-xl border border-border/50 relative group-hover:bg-muted transition-colors">
                      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AwardIcon size={32} />
                      </div>
                      <p className="text-xs text-foreground/80 italic leading-relaxed">&quot;{cert.personalizedMessage}&quot;</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-notion-surface text-black hover:bg-gray-200 font-bold" 
                    onClick={() => setSelectedCert(cert)}
                  >
                    <LinkIcon className="w-4 h-4 mr-2" />
                    View & Print
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-border aspect-square p-0 w-11 hover:bg-card" 
                    title="Quick Download Info"
                  >
                    <ShieldIcon className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCert && (
        <CertificateViewer 
          certificateId={selectedCert.certificateNumber}
          onClose={() => setSelectedCert(null)}
          html={generateCertificateHtml({
            recipientName: user?.name || 'Attendee',
            eventTitle: selectedCert.event?.title || 'Event',
            issueDate: selectedCert.issueDate ? format(new Date(selectedCert.issueDate), 'MMMM dd, yyyy') : format(new Date(), 'MMMM dd, yyyy'),
            certificateNumber: selectedCert.certificateNumber,
            personalizedMessage: selectedCert.personalizedMessage
          })}
        />
      )}

      {/* Verification Badge */}
      <div className="flex justify-center pt-8">
        <div className="inline-flex items-center gap-3 px-8 py-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl backdrop-blur-md">
          <CheckIcon className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-400">Secure & Verifiable Proof of Achievement</span>
        </div>
      </div>
    </div>
  );
}
