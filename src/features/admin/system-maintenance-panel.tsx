'use client';

import React, { useState, useEffect } from 'react';
import { LoadError } from '@/components/shared/load-error';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  ShieldAlert, 
  Activity, 
  Database, 
  BrainCircuit, 
  Mail, 
  HardDrive, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { getSystemHealth, type SystemHealth } from '@/app/actions/health';
import { getSystemSettings, updateSystemSettings, type SystemSettings } from '@/app/actions/admin';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';

export function SystemMaintenancePanel() {
  const { toast } = useToast();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [healthData, settingsData] = await Promise.all([
        getSystemHealth(),
        getSystemSettings()
      ]);
      setHealth(healthData);
      setSettings(settingsData);
    } catch (e) {
      setLoadError(true);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMaintenance = async (val: boolean) => {
    setUpdating(true);
    try {
      const result = await updateSystemSettings({ 
        maintenanceMode: val,
        lastMaintenanceAt: val ? null : new Date().toISOString()
      });
      if (result.success) {
        setSettings(result.settings as SystemSettings);
        toast({ 
          title: val ? "Maintenance Mode Active" : "Maintenance Mode Disabled",
          variant: val ? "destructive" : "default"
        });
      }
    } catch (e) {
      toast({ title: "Failed to update settings", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'operational': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'unconfigured': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'down': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {loadError && <LoadError what="system settings" onRetry={loadData} compact />}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Control */}
        <Card className={cn(
          "border-2 transition-all",
          settings?.maintenanceMode ? "border-red-500/50 bg-red-500/5 shadow-lg shadow-red-500/10" : "border-border bg-card"
        )}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className={cn(settings?.maintenanceMode ? "text-red-500" : "text-primary")} />
              Maintenance Protocol
            </CardTitle>
            <CardDescription>
              Toggle global maintenance mode to restrict user access during updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border">
               <div className="space-y-0.5">
                  <Label className="text-base font-bold">Active Mode</Label>
                  <p className="text-xs text-muted-foreground">Redirects all non-admin traffic to maintenance page.</p>
               </div>
               <Switch 
                 checked={settings?.maintenanceMode || false} 
                 onCheckedChange={handleToggleMaintenance}
                 disabled={updating || loading}
               />
            </div>
            
            {settings?.lastMaintenanceAt && !settings.maintenanceMode && (
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest text-center">
                Last Maintenance Window: {new Date(settings.lastMaintenanceAt).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="text-primary" />
                System Health
              </CardTitle>
              <CardDescription>Real-time status of Eventra infrastructure.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={loadData} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
             <div className="divide-y divide-border/50">
                {[
                  { name: 'Primary Database', id: 'database', icon: <Database className="w-4 h-4" />, status: health?.database.status, detail: health?.database.latency ? `${health.database.latency}ms` : 'N/A' },
                  { name: 'Neural Engine', id: 'ai', icon: <BrainCircuit className="w-4 h-4" />, status: health?.ai.status, detail: health?.ai.model },
                  { name: 'Broadcast Layer', id: 'email', icon: <Mail className="w-4 h-4" />, status: health?.email.status, detail: health?.email.provider },
                  { name: 'Asset Storage', id: 'storage', icon: <HardDrive className="w-4 h-4" />, status: health?.storage.status, detail: 'Base64/Local' },
                ].map((service) => (
                  <div key={service.id} className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted/50 rounded-lg text-muted-foreground">{service.icon}</div>
                        <div>
                           <p className="text-sm font-bold">{service.name}</p>
                           <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">{service.detail}</p>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-full border border-border/50">
                        <StatusIcon status={service.status || 'unknown'} />
                        <span className="text-[10px] font-black uppercase tracking-tight">{service.status || 'Checking...'}</span>
                     </div>
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
