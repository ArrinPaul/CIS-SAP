'use client';

import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  Sparkles, 
  MessageSquare, 
  UserPlus, 
  Loader2, 
  Coffee 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { requestMeeting } from '@/app/actions/meetings';

interface MeetingRequestDialogProps {
  attendee: {
    userId: string;
    name: string;
    role?: string;
    company?: string;
    image?: string;
  };
  eventId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function MeetingRequestDialog({
  attendee,
  eventId = 'f0016a0d-9dec-4f3e-b709-a40597f3887d',
  trigger,
  onSuccess,
}: MeetingRequestDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [meetingType, setMeetingType] = useState<'virtual' | 'in_person'>('virtual');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [date, setDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [time, setTime] = useState('14:00');
  const [locationDetails, setLocationDetails] = useState('Networking Lounge • Table 2');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({ title: 'Topic Required', description: 'Please enter a discussion topic.', variant: 'destructive' });
      return;
    }

    const startDateTime = new Date(`${date}T${time}:00`);
    if (isNaN(startDateTime.getTime())) {
      toast({ title: 'Invalid Date/Time', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await requestMeeting({
        eventId,
        recipientId: attendee.userId,
        title: title.trim(),
        message: message.trim() || undefined,
        startTime: startDateTime.toISOString(),
        durationMinutes: parseInt(durationMinutes),
        meetingType,
        locationDetails: meetingType === 'in_person' ? locationDetails : undefined,
      });

      if (res.success) {
        toast({
          title: 'Meeting Request Sent! 🤝',
          description: `Invitation sent to ${attendee.name}. You'll be notified when they accept.`,
        });
        setOpen(false);
        onSuccess?.();
      } else {
        toast({
          title: 'Request Failed',
          description: res.error || 'Could not schedule meeting.',
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 rounded-xl text-xs font-semibold">
            <Coffee className="w-3.5 h-3.5 text-amber-500" /> Book 1-on-1
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Avatar className="w-12 h-12 border-2 border-primary/20">
                <AvatarImage src={attendee.image} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {attendee.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Request 1-on-1 with {attendee.name}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {attendee.role} {attendee.company ? `• ${attendee.company}` : ''}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* TOPIC / TITLE */}
            <div className="space-y-1.5">
              <Label htmlFor="meet-title">Discussion Topic</Label>
              <Input
                id="meet-title"
                placeholder="e.g. Discussing AI infrastructure collaboration"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* MEETING FORMAT & DURATION */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Format</Label>
                <RadioGroup
                  value={meetingType}
                  onValueChange={(val: any) => setMeetingType(val)}
                  className="flex gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="virtual" id="m-virtual" />
                    <Label htmlFor="m-virtual" className="text-xs flex items-center gap-1">
                      <Video className="w-3 h-3 text-cyan-500" /> Virtual Call
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_person" id="m-inperson" />
                    <Label htmlFor="m-inperson" className="text-xs flex items-center gap-1">
                      <Coffee className="w-3 h-3 text-amber-500" /> In-Person
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label>Duration</Label>
                <RadioGroup
                  value={durationMinutes}
                  onValueChange={setDurationMinutes}
                  className="flex gap-4 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="15" id="d-15" />
                    <Label htmlFor="d-15" className="text-xs">15 mins</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30" id="d-30" />
                    <Label htmlFor="d-30" className="text-xs">30 mins</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* DATE & TIME */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="meet-date">Date</Label>
                <Input
                  id="meet-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meet-time">Time</Label>
                <Input
                  id="meet-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* IN PERSON LOCATION */}
            {meetingType === 'in_person' && (
              <div className="space-y-1.5">
                <Label htmlFor="location">Meetup Location</Label>
                <Input
                  id="location"
                  placeholder="e.g. Hall A Coffee Booth #4"
                  value={locationDetails}
                  onChange={(e) => setLocationDetails(e.target.value)}
                />
              </div>
            )}

            {/* OPTIONAL MESSAGE */}
            <div className="space-y-1.5">
              <Label htmlFor="message">Introductory Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Hi! Would love to connect and share thoughts on your talk..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Send Meeting Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
