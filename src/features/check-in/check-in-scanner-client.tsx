'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  QrCode,
  Search,
  CheckCircle2,
  XCircle,
  ScanLine,
  UserCheck,
  Volume2,
  VolumeX,
  Activity,
  TrendingUp,
  Clock,
  User,
  Download,
  CheckSquare
} from 'lucide-react';
import { cn, getErrorMessage } from '@/core/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { getScannerEvents, checkInTicket, getAttendeeList, finalizeEvent } from '@/app/actions/check-in';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useRealtimeTable } from '@/hooks/use-realtime-subscription';
import { verifyTicketOffline, OfflineStorage } from '@/core/utils/offline-ticket-verifier';

type ScanResult = {
  success: boolean;
  message: string;
  timestamp: Date;
  ticket?: {
    ticketNumber: string;
    entryCode?: string | null;
    userName: string | null;
    userImage: string | null;
  };
};

export default function CheckInScannerClient() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualSearch, setManualSearch] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const scannerRef = useRef<any>(null);

  // Offline Support State
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<{ payload: string, timestamp: Date }[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [localAttendeeList, setLocalAttendeeList] = useState<any[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoadError(false);
    try {
      const data = await getScannerEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (e) {
      // Otherwise a failed load just leaves an empty event picker.
      setLoadError(true);
      console.error(e);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (user && (user.role === 'organizer' || user.role === 'admin' || user.role === 'professional' || user.role === 'attendee')) {
      // For now, let everyone load, the server action will protect it.
      fetchEvents().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, fetchEvents]);

  // Real-time synchronization for check-ins across multiple scanners
  useRealtimeTable(
    `scanner-tickets-${selectedEventId}`,
    {
      table: 'tickets',
      filter: selectedEventId ? `event_id=eq.${selectedEventId}` : undefined,
      onChange: () => {
        fetchEvents();
      },
    },
    !!selectedEventId
  );

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const checkInCount = selectedEvent?.checkInCount || 0;
  const totalRegistrations = selectedEvent?.registeredCount || 0;
  const checkInRate = totalRegistrations > 0 ? Math.round((checkInCount / totalRegistrations) * 100) : 0;

  const syncOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || isSyncing) return;
    
    setIsSyncing(true);
    const queue = [...offlineQueue];
    setOfflineQueue([]); 
    localStorage.removeItem(`offline_queue_${user?.id}`);
    
    let successCount = 0;
    let failCount = 0;

    for (const item of queue) {
      try {
        await checkInTicket(item.payload, selectedEventId);
        successCount++;
      } catch (e) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast({ title: "Sync Complete", description: `Successfully synced ${successCount} check-ins.` });
      fetchEvents(); 
    }
    if (failCount > 0) {
      toast({ title: "Sync Warning", description: `${failCount} check-ins failed during sync.`, variant: "destructive" });
    }
    setIsSyncing(false);
  }, [offlineQueue, isSyncing, selectedEventId, user?.id, toast, fetchEvents]);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      toast({ title: "Back Online", description: "Connection restored. Syncing pending check-ins..." });
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast({ title: "Offline Mode", description: "You are offline. Checking against local list.", variant: "default" });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const savedQueue = localStorage.getItem(`offline_queue_${user?.id}`);
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue);
        setOfflineQueue(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
      } catch (e) {}
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineQueue, toast, user?.id]);

  useEffect(() => {
    if (selectedEventId) {
      const savedList = localStorage.getItem(`attendees_${selectedEventId}`);
      if (savedList) {
        setLocalAttendeeList(JSON.parse(savedList));
      } else {
        setLocalAttendeeList([]);
      }
    }
  }, [selectedEventId]);

  const downloadAttendeeList = async () => {
    if (!selectedEventId) return;
    setIsDownloading(true);
    try {
      const list = await getAttendeeList(selectedEventId);
      setLocalAttendeeList(list);
      localStorage.setItem(`attendees_${selectedEventId}`, JSON.stringify(list));
      toast({ title: "List Downloaded", description: `Cached ${list.length} attendees for offline use.` });
    } catch (e) {
      toast({ title: "Download Failed", description: "Could not fetch attendee list.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleFinalizeEvent = async () => {
    if (!selectedEventId) return;
    if (!confirm("Are you sure you want to finalize this event? All un-scanned tickets will be marked as expired.")) return;
    
    setProcessing(true);
    try {
      const res = await finalizeEvent(selectedEventId);
      toast({ title: "Event Finalized", description: `Marked ${res.expiredCount} tickets as expired.` });
      fetchEvents();
    } catch (e) {
      toast({ title: "Error", description: "Failed to finalize event", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessCheckIn = useCallback(async (payload: string) => {
    if (!selectedEventId) {
      toast({ title: 'Error', description: 'Please select an event first', variant: 'destructive' });
      return;
    }

    setProcessing(true);
    
    if (isOffline) {
      const offlineResult = verifyTicketOffline(payload, localAttendeeList);
      if (offlineResult.success && offlineResult.ticket) {
        const item = {
          payload,
          eventId: selectedEventId,
          timestamp: new Date().toISOString(),
          ticketNumber: offlineResult.ticket.ticketNumber,
        };
        const updatedQueue = OfflineStorage.enqueue(item as any, user?.id);
        setOfflineQueue(updatedQueue as any);

        const updatedList = localAttendeeList.map(t =>
          t.ticketNumber.toLowerCase() === offlineResult.ticket!.ticketNumber.toLowerCase()
            ? { ...t, status: 'checked-in' }
            : t
        );
        setLocalAttendeeList(updatedList);
        OfflineStorage.saveCachedAttendees(selectedEventId, updatedList);

        setScanResult({
          success: true,
          message: offlineResult.message,
          timestamp: new Date(),
          ticket: offlineResult.ticket,
        });

        if (soundEnabled) {
          const audio = new Audio('/sounds/success.mp3');
          audio.play().catch(() => {});
        }
      } else {
        setScanResult({
          success: false,
          message: offlineResult.message,
          timestamp: new Date(),
          ticket: offlineResult.ticket,
        });

        if (soundEnabled) {
          const audio = new Audio('/sounds/error.mp3');
          audio.play().catch(() => {});
        }
      }

      setProcessing(false);
      setManualSearch('');
      return;
    }

    try {
      const response = await checkInTicket(payload, selectedEventId);
      
      if (response.success) {
        setScanResult({
          success: true,
          ticket: response.ticket,
          message: 'Successfully checked in!',
          timestamp: new Date()
        });
        
        fetchEvents();
        
        if (soundEnabled) {
          const audio = new Audio('/sounds/success.mp3');
          audio.play().catch(() => {});
        }
      }
    } catch (error: any) {
      const errorMsg = getErrorMessage(error);
      const isNetworkErr = !navigator.onLine || errorMsg.toLowerCase().includes('failed to fetch') || errorMsg.toLowerCase().includes('network');

      // Auto-fallback to offline verification if network unexpectedly failed
      if (isNetworkErr && localAttendeeList.length > 0) {
        const offlineResult = verifyTicketOffline(payload, localAttendeeList);
        if (offlineResult.success && offlineResult.ticket) {
          const item = {
            payload,
            eventId: selectedEventId,
            timestamp: new Date().toISOString(),
            ticketNumber: offlineResult.ticket.ticketNumber,
          };
          const updatedQueue = OfflineStorage.enqueue(item as any, user?.id);
          setOfflineQueue(updatedQueue as any);

          const updatedList = localAttendeeList.map(t =>
            t.ticketNumber.toLowerCase() === offlineResult.ticket!.ticketNumber.toLowerCase()
              ? { ...t, status: 'checked-in' }
              : t
          );
          setLocalAttendeeList(updatedList);
          OfflineStorage.saveCachedAttendees(selectedEventId, updatedList);

          setScanResult({
            success: true,
            message: 'Network offline. Verified locally and queued for sync.',
            timestamp: new Date(),
            ticket: offlineResult.ticket,
          });

          if (soundEnabled) {
            const audio = new Audio('/sounds/success.mp3');
            audio.play().catch(() => {});
          }
          setProcessing(false);
          setManualSearch('');
          return;
        }
      }

      setScanResult({ 
        success: false, 
        message: errorMsg, 
        timestamp: new Date() 
      });
      
      if (soundEnabled) {
        const audio = new Audio('/sounds/error.mp3');
        audio.play().catch(() => {});
      }
    } finally {
      setProcessing(false);
      setManualSearch('');
    }
  }, [
    fetchEvents,
    isOffline,
    localAttendeeList,
    offlineQueue,
    selectedEventId,
    soundEnabled,
    toast,
    user?.id,
  ]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (e) {}
      scannerRef.current = null;
      setScanning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 10, qrbox: 250 }, 
        (decodedText) => {
            stopScanner();
            handleProcessCheckIn(decodedText);
        }, 
        () => {}
      );
      setScanning(true);
    } catch (err) {
      console.error(err);
      toast({ title: 'Camera Error', description: 'Could not access camera', variant: 'destructive' });
    }
  }, [handleProcessCheckIn, stopScanner, toast]); 

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopScanner();
      }
    };
  }, [stopScanner]);

  if (authLoading || loading) {
    return (
      <div className="container py-32 text-center text-foreground">
        <Activity className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading scanner...</p>
      </div>
    );
  }

  if (!user || (user.role !== 'organizer' && user.role !== 'admin' && user.role !== 'professional' && user.role !== 'attendee')) {
    return (
      <div className="container py-16 text-center text-foreground">
        <ScanLine className="h-16 w-16 mx-auto mb-6 text-muted-foreground opacity-20" />
        <h1 className="text-2xl font-bold">Organizer Access Required</h1>
        <p className="text-muted-foreground mt-2">Only organizers and admins can access the check-in scanner.</p>
        <Button asChild className="mt-6" variant="outline"><a href="/explore">Back to Explore</a></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl text-foreground">
      {loadError && (
        <LoadError what="your events" onRetry={fetchEvents} compact className="mb-6" />
      )}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">Check-in Scanner</h1>
          {isOffline && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
              <Clock className="h-3 w-3 mr-1" /> Offline
            </Badge>
          )}
          {offlineQueue.length > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-cyan-500/20">
              {offlineQueue.length} pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="border-border hover:bg-card h-9" 
            onClick={downloadAttendeeList}
            disabled={isDownloading || !selectedEventId}
          >
            {isDownloading ? <Activity className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-2" />}
            Download List
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-500/20 text-destructive hover:bg-destructive/10 h-9" 
            onClick={handleFinalizeEvent}
            disabled={processing || !selectedEventId}
          >
            <CheckSquare className="h-3.5 w-3.5 mr-2" />
            Finalize Event
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="border-border hover:bg-card h-9 w-9" 
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Card className="mb-6 bg-card border-border text-foreground shadow-xl backdrop-blur-sm">
        <CardContent className="p-6">
          <Label className="mb-3 block text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Event to Scan For</Label>
          <Select value={selectedEventId} onValueChange={setSelectedEventId}>
            <SelectTrigger className="bg-card border-border h-12 text-lg">
              <SelectValue placeholder="Choose an event" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              {events.map(event => (
                <SelectItem key={event.id} value={event.id} className="focus:bg-muted py-3">
                  {event.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border text-foreground overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Checked In</p>
              <UserCheck size={14} className="text-emerald-400" />
            </div>
            <p className="text-3xl font-black">{checkInCount} / {totalRegistrations}</p>
            <div className="mt-4 h-1.5 w-full bg-card rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${checkInRate}%` }} 
              />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card border-border text-foreground group hover:border-primary/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Check-in Rate</p>
              <TrendingUp size={14} className="text-primary" />
            </div>
            <p className="text-3xl font-black">{checkInRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Activity size={10} className="text-primary animate-pulse" /> Live activity tracking
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground group hover:border-amber-500/30 transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Pending</p>
              <Clock size={14} className="text-amber-400" />
            </div>
            <p className="text-3xl font-black">{Math.max(0, totalRegistrations - checkInCount)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Attendees remaining</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border text-foreground shadow-2xl overflow-hidden">
          <CardHeader className="border-b border-border/50 bg-card">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <QrCode className="h-4 w-4" /> QR Code Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div id="qr-reader" className="relative w-full aspect-square rounded-xl bg-background/40 flex items-center justify-center border border-border overflow-hidden backdrop-blur-md">
              {!scanning && (
                <div className="text-center p-8">
                  <ScanLine className="h-16 w-16 text-gray-700 mx-auto mb-4 opacity-50" />
                  <p className="text-sm text-muted-foreground">Camera stream will appear here</p>
                </div>
              )}
              {processing && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                  <Activity className="h-8 w-8 text-primary animate-spin" />
                </div>
              )}
            </div>
            <Button 
              onClick={scanning ? stopScanner : startScanner} 
              className={cn(
                "w-full mt-6 h-12 text-lg font-bold transition-all",
                scanning ? "bg-destructive/10 text-destructive border-red-500/20 hover:bg-destructive/20" : "bg-primary hover:bg-cyan-700 text-primary-foreground"
              )}
              variant={scanning ? "outline" : "default"}
              disabled={processing}
            >
              {scanning ? "Stop Scanner" : "Start QR Scanner"}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card border-border text-foreground shadow-2xl">
          <CardHeader className="border-b border-border/50 bg-card">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Search className="h-4 w-4" /> Manual Check-in
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket-id" className="text-xs text-muted-foreground">Ticket Number or 6-Digit Entry Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="ticket-id"
                    placeholder="TKT-... or 123456"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    className="bg-card border-border h-12 font-mono uppercase"
                    onKeyDown={(e) => e.key === 'Enter' && handleProcessCheckIn(manualSearch)}
                    maxLength={20}
                  />
                  <Button 
                    disabled={!manualSearch || processing} 
                    onClick={() => handleProcessCheckIn(manualSearch)}
                    className="h-12 w-12 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {processing ? <Activity className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="pt-8 text-center text-muted-foreground border border-dashed border-border rounded-xl py-12">
                  <div className="relative inline-block mb-4">
                    <Search size={48} className="mx-auto opacity-10" />
                    <ScanLine className="absolute top-1/2 left-0 w-full h-0.5 bg-primary/20 animate-pulse" />
                  </div>
                  <p className="text-sm font-medium">Use for manual verification</p>
                  <p className="text-xs text-gray-600 mt-1">Check the ID of the attendee and cross-reference</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!scanResult} onOpenChange={() => setScanResult(null)}>
        <DialogContent className="sm:max-w-md text-center py-10 bg-card text-foreground border-border shadow-2xl">
          {scanResult?.success ? (
            <div className="space-y-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
                  <CheckCircle2 className="h-24 w-24 text-emerald-500 relative z-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-emerald-500">Access Granted</h2>
                  <p className="text-muted-foreground mt-1">Attendee verified successfully</p>
                </div>
                
                <div className="p-6 bg-card rounded-xl border border-border text-left space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-muted overflow-hidden border border-border flex items-center justify-center">
                        {scanResult.ticket?.userImage ? (
                          <Image src={scanResult.ticket.userImage} alt="User" width={48} height={48} className="object-cover" />
                        ) : (
                          <User className="text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{scanResult.ticket?.userName || 'Attendee'}</p>
                        <p className="text-xs text-emerald-400 font-medium">Verified Registration</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-border/50 space-y-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Ticket ID</p>
                        <p className="font-mono text-primary text-lg">{scanResult.ticket?.ticketNumber}</p>
                      </div>
                      {scanResult.ticket?.entryCode && (
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-1">Entry Code</p>
                          <p className="font-mono text-lg font-bold tracking-[0.3em]">{scanResult.ticket.entryCode}</p>
                        </div>
                      )}
                    </div>
                </div>
            </div>
          ) : (
            <div className="space-y-6">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
                  <XCircle className="h-24 w-24 text-destructive relative z-10" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-destructive">Access Denied</h2>
                  <p className="text-muted-foreground mt-1">Verification failed</p>
                </div>
                <div className="p-4 bg-destructive/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm font-medium text-red-200">{scanResult?.message}</p>
                </div>
                <p className="text-xs text-gray-600">Please check the ticket details and try again or refer to the help desk.</p>
            </div>
          )}
          <Button onClick={() => setScanResult(null)} className="mt-8 w-full h-12 text-lg font-bold bg-muted hover:bg-white/20 text-foreground border border-border">
            Continue Scanning
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}