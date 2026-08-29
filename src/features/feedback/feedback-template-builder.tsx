'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  Settings2, 
  Save, 
  Type, 
  Star,
  ListTodo,
  ChevronDown,
  Loader2,
  Settings,
  MoreVertical,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upsertFeedbackTemplate } from '@/app/actions/feedback';
import { cn } from '@/core/utils/utils';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface Question {
  id: string;
  type: 'rating' | 'text' | 'choice';
  label: string;
  options?: string[];
  required: boolean;
}

interface FeedbackTemplateBuilderProps {
  eventId: string;
  initialTemplate?: any;
}

export function FeedbackTemplateBuilder({ eventId, initialTemplate }: FeedbackTemplateBuilderProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTemplate?.title || 'Event Feedback Questionnaire');
  const [description, setDescription] = useState(initialTemplate?.description || 'Please let us know your thoughts about the event.');
  const [questions, setQuestions] = useState<Question[]>(initialTemplate?.questions || [
    { id: 'q1', type: 'rating', label: 'Overall, how would you rate the event?', required: true }
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const addQuestion = (type: 'rating' | 'text' | 'choice') => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type,
      label: type === 'rating' ? 'Rate your experience' : type === 'text' ? 'Share your comments' : 'Choose an option',
      required: true,
      options: type === 'choice' ? ['Option 1', 'Option 2'] : undefined
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const q = questions.find(q => q.id === questionId);
    if (q && q.options) {
      updateQuestion(questionId, { options: [...q.options, `Option ${q.options.length + 1}`] });
    }
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const q = questions.find(q => q.id === questionId);
    if (q && q.options) {
      const newOptions = [...q.options];
      newOptions[index] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const removeOption = (questionId: string, index: number) => {
    const q = questions.find(q => q.id === questionId);
    if (q && q.options) {
      updateQuestion(questionId, { options: q.options.filter((_, i) => i !== index) });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertFeedbackTemplate({
        id: initialTemplate?.id,
        eventId,
        title,
        description,
        questions,
      });
      toast({ title: "Template Saved", description: "Your custom questionnaire is ready." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Settings & Question List */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Basic information about this feedback form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Form Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Post-Event Feedback" className="bg-card border-border" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Tell attendees why their feedback matters" className="bg-card border-border" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Questions</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-border" onClick={() => addQuestion('rating')}>
                <Star className="w-4 h-4 mr-2" /> Rating
              </Button>
              <Button size="sm" variant="outline" className="border-border" onClick={() => addQuestion('text')}>
                <Type className="w-4 h-4 mr-2" /> Text
              </Button>
              <Button size="sm" variant="outline" className="border-border" onClick={() => addQuestion('choice')}>
                <ListTodo className="w-4 h-4 mr-2" /> Multiple Choice
              </Button>
            </div>
          </div>

          {questions.map((q, index) => (
            <Card key={q.id} className="bg-card border-border text-foreground group relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-red-300" onClick={() => removeQuestion(q.id)}>
                    <Trash2 size={16} />
                 </Button>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="flex-none pt-2 font-mono text-muted-foreground">Q{index + 1}</div>
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Question Label</Label>
                      <Input value={q.label} onChange={e => updateQuestion(q.id, { label: e.target.value })} className="bg-card border-border font-bold" />
                    </div>

                    {q.type === 'choice' && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-xs uppercase font-bold text-muted-foreground">Options</Label>
                        <div className="space-y-2">
                          {q.options?.map((opt, i) => (
                            <div key={i} className="flex gap-2">
                              <Input value={opt} onChange={e => updateOption(q.id, i, e.target.value)} className="bg-card border-border h-8" />
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => removeOption(q.id, i)} disabled={q.options!.length <= 2}>
                                <Plus size={14} className="rotate-45" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="ghost" size="sm" className="text-primary p-0 h-6" onClick={() => addOption(q.id)}>
                            <Plus size={14} className="mr-1" /> Add Option
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-6 pt-2 border-t border-border/50">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id={`req-${q.id}`} 
                            checked={q.required} 
                            onCheckedChange={(checked) => updateQuestion(q.id, { required: !!checked })}
                          />
                          <label htmlFor={`req-${q.id}`} className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Required Field
                          </label>
                        </div>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold bg-card">{q.type}</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {questions.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-border/50 rounded-2xl">
              <Plus className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p className="text-muted-foreground">Add your first question to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Preview & Save */}
      <div className="space-y-6">
        <Card className="bg-cyan-900/20 border-cyan-500/20 text-foreground">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="text-primary w-5 h-5" /> Live Preview
            </CardTitle>
            <CardDescription>How attendees will see the form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <div className="text-center pb-4 border-b border-cyan-500/10">
                <h4 className="font-bold text-xl">{title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
             </div>

             <div className="space-y-8">
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-3">
                    <Label className="text-sm font-semibold">
                      {i + 1}. {q.label} {q.required && <span className="text-destructive">*</span>}
                    </Label>
                    
                    {q.type === 'rating' && (
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map(v => (
                          <div key={v} className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-xs font-bold bg-card">
                            {v}
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'text' && (
                      <div className="h-20 w-full rounded-lg border border-border bg-card" />
                    )}

                    {q.type === 'choice' && (
                      <div className="space-y-2">
                        {q.options?.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                             <div className="w-4 h-4 rounded-full border border-border" />
                             <span className="text-xs text-foreground/80">{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
             </div>
          </CardContent>
          <CardFooter className="pt-6 border-t border-cyan-500/10">
             <Button className="w-full bg-primary hover:bg-primary/90 text-foreground" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Publish Questionnaire
             </Button>
          </CardFooter>
        </Card>

        <Card className="bg-card border-border text-foreground">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings className="w-4 h-4" /> Automations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                <div className="space-y-0.5">
                   <p className="text-xs font-bold">Post-Event Email</p>
                   <p className="text-[10px] text-muted-foreground">Auto-send 1h after event ends</p>
                </div>
                <div className="w-8 h-4 bg-primary rounded-full flex items-center px-1">
                   <div className="w-2.5 h-2.5 bg-notion-surface rounded-full ml-auto" />
                </div>
             </div>
             <div className="flex items-center justify-between p-3 rounded-lg bg-card">
                <div className="space-y-0.5">
                   <p className="text-xs font-bold">NPS Tracking</p>
                   <p className="text-[10px] text-muted-foreground">Track score in dashboard</p>
                </div>
                <div className="w-8 h-4 bg-primary rounded-full flex items-center px-1">
                   <div className="w-2.5 h-2.5 bg-notion-surface rounded-full ml-auto" />
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'outline' }) => (
  <span className={cn(
    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
    variant === 'default' ? "bg-cyan-500 text-foreground" : "border border-border text-muted-foreground",
    className
  )}>
    {children}
  </span>
);
