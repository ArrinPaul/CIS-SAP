'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/core/utils/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  Bell, 
  Mail, 
  Settings,
  Save,
  Globe,
  Loader2,
  Megaphone,
  CalendarCheck,
  Users
} from 'lucide-react';

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  eventReminders: boolean;
  communityUpdates: boolean;
  marketingEmails: boolean;
}

const defaultPrefs: NotificationPreferences = {
  email: true,
  push: true,
  eventReminders: true,
  communityUpdates: true,
  marketingEmails: false,
};

export default function UserPreferencesPanel() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy'>('notifications');
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferences>(defaultPrefs);

  useEffect(() => {
    if (user?.notificationPreferences) {
      const np = user.notificationPreferences as Partial<NotificationPreferences>;
      setPrefs({
        email: np.email ?? defaultPrefs.email,
        push: np.push ?? defaultPrefs.push,
        eventReminders: np.eventReminders ?? defaultPrefs.eventReminders,
        communityUpdates: np.communityUpdates ?? defaultPrefs.communityUpdates,
        marketingEmails: np.marketingEmails ?? defaultPrefs.marketingEmails,
      });
    }
  }, [user?.notificationPreferences]);

  const togglePref = (key: keyof NotificationPreferences) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ notificationPreferences: prefs as unknown as Record<string, boolean> });
      toast({ title: 'Preferences saved successfully' });
    } catch (e) {
      toast({ title: 'Failed to save preferences', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const prefItems = [
    { key: 'email' as const, label: 'Email Notifications', description: 'Receive updates via email', icon: Mail },
    { key: 'push' as const, label: 'Push Notifications', description: 'Browser push notifications', icon: Bell },
    { key: 'eventReminders' as const, label: 'Event Reminders', description: 'Get reminded before events start', icon: CalendarCheck },
    { key: 'communityUpdates' as const, label: 'Community Updates', description: 'Posts and activity in your communities', icon: Users },
    { key: 'marketingEmails' as const, label: 'Marketing Emails', description: 'Platform news and promotions', icon: Megaphone },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
           <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-[0.3em]">
             System Configuration
           </Badge>
           <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tighter leading-none">
             Preferences <span className="text-primary italic">Panel.</span>
           </h1>
           <p className="text-lg text-muted-foreground font-medium max-w-xl">
             Configure your experience nodes, notification streams, and privacy protocols.
           </p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg" className="rounded-2xl h-14 px-10 bg-primary text-primary-foreground shadow-notion-soft font-black uppercase tracking-widest text-[11px] border-none">
          {saving ? <Loader2 className="w-4 h-4 mr-3 animate-spin" /> : <Save className="w-4 h-4 mr-3" />}
          Save Changes
        </Button>
      </div>

      <div className="grid md:grid-cols-12 gap-16">
        {/* Sidebar Nav */}
        <div className="md:col-span-3">
           <div className="rounded-[2.5rem] bg-background border border-border/80 shadow-2xl p-4 space-y-2 sticky top-32">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] px-6 transition-all",
                  activeTab === 'notifications' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-muted-foreground hover:bg-muted"
                )} 
                onClick={() => setActiveTab('notifications')}
              >
                <Bell className="w-4 h-4 mr-4" /> Notifications
              </Button>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] px-6 transition-all",
                  activeTab === 'privacy' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" : "text-muted-foreground hover:bg-muted"
                )} 
                onClick={() => setActiveTab('privacy')}
              >
                <Settings className="w-4 h-4 mr-4" /> Privacy Node
              </Button>
           </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'notifications' && (
              <div className="rounded-[3rem] bg-background border border-border/80 shadow-2xl overflow-hidden">
                <div className="p-10 border-b border-border/60">
                   <h3 className="text-3xl font-display font-bold flex items-center gap-4">
                     <Bell className="w-8 h-8 text-primary" />
                     Notification Streams
                   </h3>
                </div>
                <div className="p-10 space-y-4">
                  {prefItems.map((item, i) => (
                    <div key={item.key} className="group">
                      <div className="flex items-center justify-between p-6 rounded-3xl bg-muted/20 border border-transparent hover:border-border/60 hover:bg-background transition-all">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-background border border-border/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{item.label}</p>
                            <p className="text-xs font-medium text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <Switch
                          checked={prefs[item.key]}
                          onCheckedChange={() => togglePref(item.key)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="rounded-[3rem] bg-background border border-border/80 shadow-2xl overflow-hidden">
                <div className="p-10 border-b border-border/60">
                   <h3 className="text-3xl font-display font-bold flex items-center gap-4">
                     <Globe className="w-8 h-8 text-primary" />
                     Privacy Protocols
                   </h3>
                </div>
                <div className="p-10 space-y-6">
                  {[
                    { label: 'Public Profile', desc: 'Allow others to view your profile and achievements.' },
                    { label: 'Activity Status', desc: 'Broadcast your current online status to connections.' },
                    { label: 'Neural Connection Requests', desc: 'Accept synchronization requests from other nodes.' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-8 rounded-[2rem] bg-muted/20 border border-transparent hover:border-border/60 hover:bg-background transition-all">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground text-lg">{item.label}</p>
                        <p className="text-sm font-medium text-muted-foreground">{item.desc}</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-primary" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

