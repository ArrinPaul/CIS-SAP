'use client';
import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useStorage } from '@/lib/storage';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { ImagePlus, Loader2, X } from 'lucide-react';
import type { EventraEvent } from '@/types';

const formSchema = z.object({
  title: z.string().min(3),
  date: z.string().min(1),
  time: z.string().min(1),
  location: z.string().min(2),
  category: z.enum(['Workshop', 'Talk', 'Panel', 'Tech', 'Networking', 'Social', 'Career']),
  targetAudience: z.enum(['Student', 'Professional', 'Both']),
  description: z.string().min(10),
  capacity: z.coerce.number().min(1).max(100000),
  status: z.enum(['draft', 'published']),
  type: z.enum(['physical', 'virtual', 'hybrid']),
});

type EventFormProps = {
  onSave: (event: Omit<EventraEvent, 'id'>) => Promise<void> | void;
  event: EventraEvent | null;
};

function getDateString(event: EventraEvent): string {
  if (event.startDate) {
    const date = event.startDate instanceof Date ? event.startDate : new Date(event.startDate);
    return date.toISOString().split('T')[0];
  }
  return '';
}

function getLocationString(event: EventraEvent): string {
  if (typeof event.location === 'string') return event.location;
  if (typeof event.location?.venue === 'string') return event.location.venue;
  if (event.location?.venue?.name) return event.location.venue.name;
  return '';
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function EventForm({ onSave, event }: EventFormProps) {
  const { user } = useAuth();
  const { uploadFile } = useStorage();
  const [imageUrl, setImageUrl] = useState<string | null>(event?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploading(true);
    try {
      const storageId = await uploadFile(file);
      setImageUrl(`/api/storage/${storageId}`);
    } catch (err) {
      console.error('Upload failed:', err);
      setImageUrl(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  };

  // ... (resizeImage remains the same)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: event ? {
        title: event.title,
        date: getDateString(event),
        time: event.time || '',
        location: getLocationString(event),
        category: (event.category as z.infer<typeof formSchema>['category']) || 'Workshop',
        targetAudience: (event.targetAudience as 'Student' | 'Professional' | 'Both') || 'Both',
        description: event.description,
        capacity: event.capacity ?? 100,
        status: (event.status as 'draft' | 'published') ?? 'draft',
        type: (event.type as 'physical' | 'virtual' | 'hybrid') ?? 'physical',
    } : {
      title: '',
      date: '',
      time: '',
      location: '',
      category: 'Workshop',
      targetAudience: 'Both',
      description: '',
      capacity: 50,
      status: 'draft',
      type: 'physical',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const startDate = new Date(values.date + 'T' + values.time);
    const eventData: Omit<EventraEvent, 'id'> = {
      title: values.title,
      description: values.description,
      startDate: startDate.getTime(),
      endDate: startDate.getTime() + 3600000,
      location: { venue: values.location },
      type: values.type,
      category: values.category,
      capacity: values.capacity,
      status: values.status,
      organizerId: '' as any,
      registeredCount: 0,
      date: values.date,
      time: values.time,
      targetAudience: values.targetAudience,
    };
    if (imageUrl) (eventData as any).imageUrl = imageUrl;
    onSave(eventData);
  }

  return (
    <Card className="max-w-4xl mx-auto border-none shadow-2xl">
      <CardHeader className="p-10 pb-0 space-y-4">
        <Badge variant="outline" className="w-fit">Event Setup</Badge>
        <CardTitle className="text-4xl md:text-5xl tracking-tighter">
          Event <span className="text-primary italic">Configuration.</span>
        </CardTitle>
        <CardDescription className="text-lg font-medium">
          Define the details for your next event.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
            {/* Image Upload */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Event Image</label>
              <div className="relative group">
                {imageUrl ? (
                  <div className="relative w-full h-80 rounded-[2rem] overflow-hidden border-2 border-border/60 bg-muted/20 group-hover:border-primary/30 transition-all duration-500 shadow-xl">
                    <Image src={imageUrl} alt="Event" fill className="object-cover group-hover:scale-105 transition-transform duration-700" unoptimized={imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                       <Button type="button" variant="outline" className="bg-background/20 text-white border-white/20 hover:bg-background/40" onClick={() => { setImageUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                         Change Image
                       </Button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="w-full h-80 rounded-[2rem] border-2 border-dashed border-border/60 hover:border-primary/40 bg-muted/20 flex flex-col items-center justify-center gap-6 transition-all duration-500 group-hover:bg-muted/30 shadow-inner">
                    <div className="w-20 h-20 rounded-3xl bg-background border border-border/60 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                      {uploading ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <ImagePlus className="h-8 w-8 text-muted-foreground" />}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-foreground">Upload Event Image</p>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Supports JPG, PNG, WEBP • Max 5MB</p>
                    </div>
                  </button>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </div>
            </div>

            <div className="space-y-8">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Event Title</FormLabel>
                  <FormControl><Input placeholder="Enter event name..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="time" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Location</FormLabel>
                  <FormControl><Input placeholder="Venue name or virtual link..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Workshop">Workshop</SelectItem>
                        <SelectItem value="Talk">Talk</SelectItem>
                        <SelectItem value="Panel">Panel</SelectItem>
                        <SelectItem value="Tech">Tech</SelectItem>
                        <SelectItem value="Networking">Networking</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Career">Career</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Target Audience</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Student">Student</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FormField control={form.control} name="capacity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Capacity</FormLabel>
                    <FormControl><Input type="number" min={1} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Publish Live</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="virtual">Virtual</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}/>
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Description</FormLabel>
                  <FormControl><Textarea placeholder="Describe your event..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>

            <Button type="submit" size="xl" className="w-full">Create Event</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

