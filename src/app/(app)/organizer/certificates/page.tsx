'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { 
  Award, 
  Plus, 
  Settings, 
  Send, 
  Eye, 
  Layout, 
  Loader2,
  ChevronRight,
  Search,
  FileText
} from 'lucide-react';
import { getEvents } from '@/app/actions/events';
import { getCertificateTemplates, getCheckedInAttendees } from '@/app/actions/certificates';
import { CertificateTemplateBuilder } from '@/features/certificates/certificate-template-builder';
import { BulkDistributionClient } from '@/features/certificates/bulk-distribution-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function OrganizerCertificatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'builder' | 'distribute'>('list');
  const [activeTemplate, setActiveTemplate] = useState<any>(null);

  // Distribution State
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getEvents({ organizerId: user.id });
        setEvents(data as any);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleStartDistribute = async (eventId: string) => {
    setSelectedEventId(eventId);
    setDistributeLoading(true);
    setView('distribute');
    try {
      const [attendeeData, templates] = await Promise.all([
        getCheckedInAttendees(eventId),
        getCertificateTemplates(eventId)
      ]);
      setAttendees(attendeeData);
      // Use event-specific template or first default
      const activeT = templates.find(t => t.eventId === eventId) || templates[0];
      setTemplate(activeT);
    } catch (e) {
      toast({ title: "Error", description: "Failed to load distribution data", variant: "destructive" });
      setView('list');
    } finally {
      setDistributeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-20 text-center text-foreground">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your certificate workspace...</p>
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (view === 'builder' && selectedEventId) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <CertificateTemplateBuilder 
          eventId={selectedEventId} 
          initialTemplate={activeTemplate} 
        />
      </div>
    );
  }

  if (view === 'distribute' && selectedEventId) {
    if (distributeLoading) {
      return (
        <div className="container py-32 text-center text-foreground">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Preparing attendee certificates...</p>
        </div>
      );
    }

    return (
      <div className="container py-8 space-y-6 text-foreground">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => setView('list')} className="hover:bg-card">
            <ChevronRight className="rotate-180" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Distribute Certificates</h1>
            <p className="text-muted-foreground">Event: <span className="text-foreground font-semibold">{selectedEvent?.title}</span></p>
          </div>
        </div>
        <BulkDistributionClient 
          eventId={selectedEventId} 
          eventTitle={selectedEvent?.title || ''}
          eventDate={selectedEvent?.startDate ? new Date(selectedEvent.startDate).toLocaleDateString() : ''}
          initialAttendees={attendees} 
          templateHtml={template?.html || "<div style='padding: 50px; text-align: center;'><h1>Certificate</h1><p>{attendee_name}</p></div>"} 
        />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8 text-foreground">
      <div>
        <h1 className="text-3xl font-bold">Certificate Manager</h1>
        <p className="text-muted-foreground">Create, design, and distribute certificates for your events.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <div className="p-2 w-fit bg-primary/10 rounded-lg mb-2"><Award className="text-primary" /></div>
            <CardTitle>AI Personalization</CardTitle>
            <CardDescription className="text-muted-foreground">Every certificate includes a unique AI-generated message based on the event theme.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <div className="p-2 w-fit bg-purple-500/10 rounded-lg mb-2"><Layout className="text-purple-400" /></div>
            <CardTitle>Drag-and-Drop</CardTitle>
            <CardDescription className="text-muted-foreground">Custom designer for your certificate layouts with real-time preview.</CardDescription>
          </CardHeader>
        </Card>
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <div className="p-2 w-fit bg-emerald-500/10 rounded-lg mb-2"><Send className="text-emerald-400" /></div>
            <CardTitle>Bulk Distribution</CardTitle>
            <CardDescription className="text-muted-foreground">Send thousands of certificates via email or download as ZIP in seconds.</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card className="bg-card border-border text-foreground">
        <CardHeader>
          <CardTitle>Your Events</CardTitle>
          <CardDescription>Select an event to manage its certificates.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.id} className="flex items-center justify-between p-4 bg-card rounded-lg border border-border group hover:border-primary/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-cyan-900/20 flex items-center justify-center text-primary border border-cyan-500/20">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold">{event.title}</h3>
                    <p className="text-xs text-muted-foreground">{event.registeredCount || 0} Registrations • {event.status}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-border" onClick={() => { setSelectedEventId(event.id); setView('builder'); }}>
                    <Settings className="w-4 h-4 mr-2" /> Design Template
                  </Button>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => handleStartDistribute(event.id)}>
                    <Send className="w-4 h-4 mr-2" /> Distribute
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
