'use client';
// 
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useStorage } from '@/lib/storage';
import { 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Check, 
  User, 
  GraduationCap, 
  Building2,
  Sparkles,
  X,
  Loader2
} from 'lucide-react';
import { cn, getErrorMessage } from '@/core/utils/utils';

// Available interests for selection
const AVAILABLE_INTERESTS = [
  'Technology', 'Design', 'Business', 'Marketing', 'AI/ML',
  'Web Development', 'Mobile Development', 'Data Science', 'Cybersecurity',
  'Cloud Computing', 'DevOps', 'Blockchain', 'Gaming', 'IoT',
  'Entrepreneurship', 'Finance', 'Healthcare', 'Education', 'Social Impact',
  'Music', 'Art', 'Photography', 'Writing', 'Public Speaking'
];

// Step 1: Profile Details Schema
const profileSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().max(200, 'Bio must be less than 200 characters').optional(),
  phone: z.string().optional(),
});

// Step 2: Student Specific Schema
const studentSchema = z.object({
  college: z.string().min(2, 'College name is required'),
  degree: z.enum(['ug', 'pg'], { required_error: 'Please select your degree' }),
  year: z.number().min(1).max(5),
});

// Step 2: Professional Specific Schema
const professionalSchema = z.object({
  company: z.string().min(2, 'Company name is required'),
  designation: z.string().min(2, 'Designation is required'),
  country: z.string().min(2, 'Country is required'),
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say'], { required_error: 'Please select your gender' }),
  bloodGroup: z.string().min(1, 'Blood group is required'),
});

// Step 2: Organizer Specific Schema
const organizerSchema = z.object({
  organizationName: z.string().min(2, 'Organization name is required'),
  designation: z.string().min(2, 'Your role/designation is required'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type StudentFormData = z.infer<typeof studentSchema>;
type ProfessionalFormData = z.infer<typeof professionalSchema>;
type OrganizerFormData = z.infer<typeof organizerSchema>;

interface OnboardingData {
  profile: ProfileFormData;
  student?: StudentFormData;
  professional?: ProfessionalFormData;
  organizer?: OrganizerFormData;
  photoURL?: string;
}

export function OnboardingWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, updateUser } = useAuth();
  const { uploadFile } = useStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [userType, setUserType] = useState<'student' | 'professional' | 'organizer'>('student');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    profile: { displayName: '', bio: '', phone: '' },
  });

  const totalSteps = 3;
  const progress = (currentStep / totalSteps) * 100;

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: onboardingData.profile,
  });

  const studentForm = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: { college: '', degree: 'ug', year: 1 },
  });

  const professionalForm = useForm<ProfessionalFormData>({
    resolver: zodResolver(professionalSchema),
    defaultValues: { company: '', designation: '', country: '', gender: 'male', bloodGroup: '' },
  });

  const organizerForm = useForm<OrganizerFormData>({
    resolver: zodResolver(organizerSchema),
    defaultValues: { organizationName: '', designation: '', website: '' },
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const storageId = await uploadFile(file);
      // We'll get the URL in the next turn or just use the storageId
      // For now, let's assume we store the preview for immediate display
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);

      setOnboardingData(prev => ({ ...prev, photoURL: storageId }));
      toast({ title: 'Photo uploaded' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Upload failed' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev => {
      const newInterests = prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest];
      return newInterests;
    });
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      if (await profileForm.trigger()) {
        setOnboardingData(prev => ({ ...prev, profile: profileForm.getValues() }));
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      if (userType === 'student') {
        if (await studentForm.trigger()) {
          setOnboardingData(prev => ({ ...prev, student: studentForm.getValues() }));
          setCurrentStep(3);
        }
      } else if (userType === 'professional') {
        if (await professionalForm.trigger()) {
          setOnboardingData(prev => ({ ...prev, professional: professionalForm.getValues() }));
          setCurrentStep(3);
        }
      } else {
        if (await organizerForm.trigger()) {
          setOnboardingData(prev => ({ ...prev, organizer: organizerForm.getValues() }));
          setCurrentStep(3);
        }
      }
    }
  };

  const handleComplete = async () => {
    if (selectedInterests.length === 0) {
      toast({ variant: 'destructive', title: 'Interests required', description: 'Please select at least one interest.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const userData: any = {
        name: onboardingData.profile.displayName,
        bio: onboardingData.profile.bio || '',
        phone: onboardingData.profile.phone || '',
        image: onboardingData.photoURL || null,
        role: userType,
        onboardingCompleted: true,
        interests: selectedInterests.join(', '),
      };

      if (userType === 'student' && onboardingData.student) {
        Object.assign(userData, onboardingData.student);
      } else if (userType === 'professional' && onboardingData.professional) {
        Object.assign(userData, onboardingData.professional);
      } else if (userType === 'organizer' && onboardingData.organizer) {
        userData.organizationName = onboardingData.organizer.organizationName;
        userData.designation = onboardingData.organizer.designation;
        userData.website = onboardingData.organizer.website || '';
      }

      await updateUser(userData);
      toast({ title: 'Welcome to Eventra!' });
      router.push(userType === 'organizer' ? '/organizer' : '/explore');
    } catch (error: unknown) {
      toast({ variant: 'destructive', title: 'Setup failed', description: getErrorMessage(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader className="text-center pb-2">
        <div className="flex items-center justify-center gap-2 mb-2"><CardTitle className="text-2xl">Complete Your Profile</CardTitle></div>
        <CardDescription>Let&apos;s personalize your Eventra experience</CardDescription>
        <Progress value={progress} className="mt-4 h-2" />
      </CardHeader>

      <CardContent className="pt-4">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 cursor-pointer ring-2 ring-offset-2 ring-primary/20 hover:ring-primary/50" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback>{uploadingPhoto ? <Loader2 className="animate-spin" /> : <Upload />}</AvatarFallback>
              </Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <Form {...profileForm}>
              <form className="space-y-4">
                <FormField control={profileForm.control} name="displayName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={profileForm.control} name="bio" render={({ field }) => (
                  <FormItem><FormLabel>Bio</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </form>
            </Form>
            <div className="grid grid-cols-3 gap-4">
                <Button variant={userType === 'student' ? 'default' : 'outline'} onClick={() => setUserType('student')}>Student</Button>
                <Button variant={userType === 'professional' ? 'default' : 'outline'} onClick={() => setUserType('professional')}>Professional</Button>
                <Button variant={userType === 'organizer' ? 'default' : 'outline'} onClick={() => setUserType('organizer')}>Organizer</Button>
            </div>
          </div>
        )}

        {currentStep === 2 && userType === 'student' && (
          <Form {...studentForm}>
            <form className="space-y-4">
              <FormField control={studentForm.control} name="college" render={({ field }) => (
                <FormItem>
                  <FormLabel>College / University *</FormLabel>
                  <FormControl><Input placeholder="e.g. Stanford University" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={studentForm.control} name="degree" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Degree Level *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="ug">Undergraduate</SelectItem>
                        <SelectItem value="pg">Postgraduate</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={studentForm.control} name="year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of Study *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} defaultValue={field.value.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map(y => <SelectItem key={y} value={y.toString()}>{y} Year</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </form>
          </Form>
        )}

        {currentStep === 2 && userType === 'professional' && (
          <Form {...professionalForm}>
            <form className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={professionalForm.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company *</FormLabel>
                    <FormControl><Input placeholder="e.g. Google" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={professionalForm.control} name="designation" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation *</FormLabel>
                    <FormControl><Input placeholder="e.g. Senior Engineer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={professionalForm.control} name="country" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl><Input placeholder="e.g. USA" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={professionalForm.control} name="gender" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={professionalForm.control} name="bloodGroup" render={({ field }) => (
                <FormItem>
                  <FormLabel>Blood Group *</FormLabel>
                  <FormControl><Input placeholder="e.g. O+" {...field} /></FormControl>
                  <FormDescription>Required for event safety protocols.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}

        {currentStep === 2 && userType === 'organizer' && (
          <Form {...organizerForm}>
            <form className="space-y-4">
              <FormField control={organizerForm.control} name="organizationName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name *</FormLabel>
                  <FormControl><Input placeholder="e.g. Tech Events Inc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={organizerForm.control} name="designation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Role *</FormLabel>
                  <FormControl><Input placeholder="e.g. Founder & CEO" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={organizerForm.control} name="website" render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </form>
          </Form>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold">Pick Your Interests</h3>
              <p className="text-sm text-muted-foreground">This helps us personalize your event recommendations.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {AVAILABLE_INTERESTS.map(interest => (
                <Badge 
                  key={interest} 
                  variant={selectedInterests.includes(interest) ? 'default' : 'outline'}
                  className={cn(
                    "px-4 py-2 text-xs cursor-pointer transition-all",
                    selectedInterests.includes(interest) ? "scale-110" : "hover:bg-muted"
                  )}
                  onClick={() => toggleInterest(interest)}
                >
                  {interest}
                  {selectedInterests.includes(interest) && <Check className="ml-2 w-3 h-3" />}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-4 border-t">
          <Button variant="outline" onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)} disabled={currentStep === 1}>Back</Button>
          {currentStep < totalSteps ? <Button onClick={handleNext}>Next</Button> : <Button onClick={handleComplete} disabled={isSubmitting}>Complete</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

