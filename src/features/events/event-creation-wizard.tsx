'use client';
// 
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Loader2,
  Sparkles,
  Wand2
} from 'lucide-react';
import { cn } from '@/core/utils/utils';
import { format } from 'date-fns';
import { eventWizardSchema, defaultEventValues, EventWizardData } from './wizard/types';
import { Step1BasicInfo } from './wizard/step-1-basic-info';
import { Step2DateLocation } from './wizard/step-2-date-location';
import { getAIEventPlan } from '@/app/actions/event-planning';

export default function EventCreationWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const createEventMutation = async (_args: any) => Promise.resolve();

  const form = useForm<EventWizardData>({
    resolver: zodResolver(eventWizardSchema),
    defaultValues: defaultEventValues,
    mode: 'onChange',
  });

  const { handleSubmit, trigger, watch, setValue } = form;
  const formData = watch();

  const handleNext = async () => {
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) fieldsToValidate = ['title', 'description', 'category'];
    if (currentStep === 2) fieldsToValidate = ['startDate', 'startTime', 'endTime', 'locationType'];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleAIAssist = async () => {
    if (!formData.title || !formData.category) {
      toast({ 
        title: 'Missing Info', 
        description: 'Please provide a title and category first.', 
        variant: 'destructive' 
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result: any = await getAIEventPlan(`Plan a ${formData.category} event: ${formData.title}`);
      if (result.success) {
        setValue('description', result.agenda.description || `This ${formData.category} event focuses on ${formData.title}.`);
        setValue('agenda', result.agenda.agenda);
        toast({ title: 'AI Plan Generated!', description: 'We\'ve updated the description and agenda.' });
      }
    } catch (error) {
      toast({ title: 'AI Assist Failed', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (values: EventWizardData) => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Parse dates and times
      const startDateTime = new Date(values.startDate);
      const [sh, sm] = values.startTime.split(':').map(Number);
      startDateTime.setHours(sh, sm);

      let endDateTime = values.endDate ? new Date(values.endDate) : new Date(values.startDate);
      const [eh, em] = values.endTime.split(':').map(Number);
      endDateTime.setHours(eh, em);

      await createEventMutation({
        title: values.title,
        description: values.description,
        category: values.category,
        startDate: startDateTime.getTime(),
        endDate: endDateTime.getTime(),
        location: values.locationType === 'physical' 
          ? { venue: values.venue, address: values.address }
          : { venue: 'Virtual', virtualLink: values.virtualLink },
        capacity: values.capacity,
        status: 'published',
        organizerId: user.id as any,
        registeredCount: 0,
        type: values.locationType,
        agenda: values.agenda,
        tags: values.tags,
      });

      toast({ title: 'Event Created Successfully!' });
      router.push('/events');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create event', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-20 premium-bg">
      <div className="max-w-4xl mx-auto space-y-16 mesh-glow pt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="space-y-6">
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary rounded-full px-5 py-1 text-[10px] font-black uppercase tracking-[0.3em]">
              Mission_Initialization
            </Badge>
            <h1 className="text-4xl md:text-7xl font-display font-bold tracking-tighter leading-none">
              Deploy <span className="text-primary italic">Node.</span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium max-w-xl opacity-80">
              Initialize a new experience node within the Eventra mesh. Unified deployment protocol active.
            </p>
          </div>
          <div className="flex flex-col items-end gap-6">
            <div className="flex items-center gap-3">
              {[1, 2, 3].map(step => (
                <div 
                  key={step} 
                  className={cn(
                    "h-2 w-16 rounded-full transition-all duration-700",
                    currentStep === step ? "bg-primary shadow-notion-soft w-24" : currentStep > step ? "bg-primary/40" : "bg-muted"
                  )} 
                />
              ))}
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-60">Sequence_Protocol_{currentStep}/03</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-16">
            <Card className="border-none shadow-3xl overflow-hidden">
              <div className="p-10 md:p-16">
                {currentStep === 1 && <Step1BasicInfo />}
                {currentStep === 2 && <Step2DateLocation />}
                {currentStep === 3 && (
                  <div className="space-y-12 animate-in fade-in slide-in-from-right-10 duration-700">
                    <div className="space-y-4">
                      <h2 className="text-4xl font-display font-bold tracking-tight">Final Verification.</h2>
                      <p className="text-lg text-muted-foreground font-medium">Review your experience parameters before finalizing deployment.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="p-8 rounded-[2rem] bg-muted/20 border border-border/40 shadow-inner group hover:bg-muted/30 transition-all duration-500">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Mission Title</p>
                        <p className="text-2xl font-display font-bold tracking-tight">{formData.title}</p>
                      </div>
                      <div className="p-8 rounded-[2rem] bg-muted/20 border border-border/40 shadow-inner group hover:bg-muted/30 transition-all duration-500">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Node Category</p>
                        <p className="text-2xl font-display font-bold tracking-tight">{formData.category}</p>
                      </div>
                      <div className="p-8 rounded-[2rem] bg-muted/20 border border-border/40 shadow-inner group hover:bg-muted/30 transition-all duration-500">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Launch Timeline</p>
                        <p className="text-2xl font-display font-bold tracking-tight">
                          {formData.startDate ? format(formData.startDate, 'PPP') : 'Not set'} @ {formData.startTime}
                        </p>
                      </div>
                      <div className="p-8 rounded-[2rem] bg-muted/20 border border-border/40 shadow-inner group hover:bg-muted/30 transition-all duration-500">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-4">Operational Coordinate</p>
                        <p className="text-2xl font-display font-bold tracking-tight capitalize">{formData.locationType}: {formData.venue || formData.virtualLink || 'TBD'}</p>
                      </div>
                    </div>

                    <div className="p-10 rounded-[2.5rem] bg-background border border-border/60 shadow-xl space-y-8">
                      <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-foreground uppercase tracking-[0.4em]">Integrated Agenda Intel</p>
                          {formData.agenda && <Badge variant="outline" className="px-4 py-1 rounded-full text-[9px] font-black text-emerald-500 border-emerald-500/20 bg-emerald-500/5 uppercase tracking-widest animate-pulse">Sync Ready</Badge>}
                      </div>
                      {formData.agenda ? (
                          <div className="space-y-6">
                              {formData.agenda.slice(0, 3).map((item: any, i: number) => (
                                  <div key={i} className="flex gap-6 items-center">
                                      <div className="w-16 h-10 rounded-xl bg-muted flex items-center justify-center text-[10px] font-black font-mono text-primary border border-border/40">{item.time}</div>
                                      <span className="text-lg font-bold text-foreground/80 tracking-tight">{item.title}</span>
                                  </div>
                              ))}
                              {formData.agenda.length > 3 && <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 ml-2">+ {formData.agenda.length - 3} Additional Sync Nodes</p>}
                          </div>
                      ) : (
                          <p className="text-sm text-muted-foreground font-medium italic opacity-60">Agenda stream not yet initialized.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-muted/30 p-8 border-t border-border/40 text-center">
                 <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground/30">Deployment_Module v0.1 • Authorized_Session_{user?.id?.slice(0, 8)}</p>
              </div>
            </Card>

            <div className="flex items-center justify-between gap-10">
              {currentStep > 1 ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="xl"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  disabled={isSaving}
                  className="rounded-2xl px-12 border-2 hover:bg-muted font-black uppercase tracking-widest text-[11px]"
                >
                  <ChevronLeft className="mr-3 h-5 w-5 text-primary" /> Previous_Step
                </Button>
              ) : <div />}

              <div className="flex gap-6">
                {currentStep === 1 && (
                    <Button 
                        type="button" 
                        variant="soft" 
                        size="xl"
                        onClick={handleAIAssist}
                        disabled={isGenerating || !formData.title}
                        className="rounded-2xl px-12 font-black uppercase tracking-widest text-[11px]"
                    >
                        {isGenerating ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <Wand2 className="mr-3 h-5 w-5" />}
                        Neural_Assist
                    </Button>
                )}
                
                {currentStep < 3 ? (
                  <Button type="button" size="xl" onClick={handleNext} className="rounded-2xl px-16 font-black uppercase tracking-widest text-[11px]">
                    Proceed <ChevronRight className="ml-3 h-5 w-5" />
                  </Button>
                ) : (
                  <Button type="submit" size="xl" className="rounded-2xl px-20 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] border-none" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <CheckCircle className="mr-3 h-5 w-5" />}
                    Initialize Deployment
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
