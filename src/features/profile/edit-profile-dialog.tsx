'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Edit } from 'lucide-react';
import { cn } from '@/core/utils/utils';

const AVAILABLE_INTERESTS = [
  'Technology', 'Design', 'Business', 'Marketing', 'AI/ML',
  'Web Development', 'Mobile Development', 'Data Science', 'Cybersecurity',
  'Cloud Computing', 'DevOps', 'Blockchain', 'Gaming', 'IoT',
  'Entrepreneurship', 'Finance', 'Healthcare', 'Education', 'Social Impact',
  'Music', 'Art', 'Photography', 'Writing', 'Public Speaking'
];

export function EditProfileDialog({ children }: { children?: React.ReactNode }) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  
  // Parse existing interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    if (!user?.interests) return [];
    if (Array.isArray(user.interests)) return user.interests;
    if (typeof user.interests === 'string') return user.interests.split(',').map(i => i.trim()).filter(Boolean);
    return [];
  });

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => 
      prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      await updateUser({
        name,
        bio,
        phone,
        interests: selectedInterests.join(', ')
      } as any);
      toast({ title: 'Profile updated successfully' });
      setOpen(false);
    } catch (error) {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="border-border/60 hover:bg-muted font-bold text-xs uppercase tracking-widest h-10 px-6 rounded-xl">
            <Edit className="w-4 h-4 mr-2" /> Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-background border-border/80 shadow-2xl p-0 overflow-hidden rounded-[2.5rem]">
        <div className="p-8 border-b border-border/60 bg-muted/10">
          <DialogTitle className="text-2xl font-display font-bold tracking-tight text-foreground">Update Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground font-medium mt-2">
            Modify your public information and interests.
          </DialogDescription>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <form id="edit-profile-form" onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Full Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="bg-background border-border/60 h-12 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Bio</Label>
              <Textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                className="bg-background border-border/60 min-h-[100px] rounded-xl resize-none"
                placeholder="Tell us about yourself..."
              />
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Phone (Optional)</Label>
              <Input 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="bg-background border-border/60 h-12 rounded-xl"
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-border/60">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Interests</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_INTERESTS.map(interest => (
                  <Badge 
                    key={interest} 
                    variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                    className={cn(
                      "px-4 py-2 text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border-border/60 rounded-lg",
                      selectedInterests.includes(interest) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                    )}
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                    {selectedInterests.includes(interest) && <Check className="ml-1.5 w-3 h-3 inline" />}
                  </Badge>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t border-border/60 bg-muted/10 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold uppercase tracking-widest text-xs px-6">Cancel</Button>
          <Button type="submit" form="edit-profile-form" disabled={loading} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs px-8 shadow-notion-soft border-none">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
