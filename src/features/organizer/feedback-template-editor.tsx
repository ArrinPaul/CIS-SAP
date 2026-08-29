'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, 
  Trash2, 
  ChevronRight, 
  Save, 
  Settings, 
  ListTodo, 
  MessageSquare, 
  Star,
  GripVertical,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { upsertFeedbackTemplate } from '@/app/actions/feedback';
import { cn } from '@/core/utils/utils';

interface Question {
  id: string;
  type: 'rating' | 'text' | 'choice' | 'boolean';
  label: string;
  required: boolean;
  options?: string[]; // For 'choice' type
}

interface FeedbackTemplateEditorProps {
  eventId: string;
  initialTemplate?: any;
}

export function FeedbackTemplateEditor({ eventId, initialTemplate }: FeedbackTemplateEditorProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState(initialTemplate?.title || 'Event Feedback Form');
  const [description, setDescription] = useState(initialTemplate?.description || 'We value your opinion. Please take a moment to provide feedback about the event.');
  const [questions, setQuestions] = useState<Question[]>(initialTemplate?.questions || [
    { id: 'q1', type: 'rating', label: 'Overall, how would you rate the event?', required: true },
    { id: 'q2', type: 'text', label: 'What was your favorite part of the event?', required: false },
    { id: 'q3', type: 'text', label: 'How can we improve for next time?', required: false }
  ]);
  
  const [isSaving, setIsSaving] = useState(false);

  const handleAddQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type,
      label: 'New Question',
      required: false,
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertFeedbackTemplate({
        id: initialTemplate?.id,
        eventId,
        title,
        description,
        questions,
        isDefault: false
      });
      toast({ title: "Template Saved", description: "Your custom feedback form is now live." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 text-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ChevronRight className="rotate-180" /></Button>
          <div>
            <h2 className="text-2xl font-bold">Feedback Form Builder</h2>
            <p className="text-sm text-muted-foreground">Design a custom questionnaire for your attendees</p>
          </div>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Publish Form
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card border-border text-foreground">
            <CardHeader>
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Form Header</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Form Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="bg-card border-border h-12" />
              </div>
              <div className="space-y-2">
                <Label>Introduction / Description</Label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  className="w-full min-h-[100px] bg-card border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Questions</h3>
            {questions.map((question, index) => (
              <Card key={question.id} className="bg-card border-border text-foreground group overflow-hidden">
                <div className="flex">
                  <div className="w-10 bg-card flex items-center justify-center cursor-move text-gray-600">
                    <GripVertical size={16} />
                  </div>
                  <div className="flex-1 p-5 space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-2">
                        <Label className="text-[10px] text-primary font-bold uppercase">Question {index + 1} ({question.type})</Label>
                        <Input 
                          value={question.label} 
                          onChange={e => updateQuestion(question.id, { label: e.target.value })}
                          className="bg-transparent border-0 border-b border-border rounded-none px-0 h-8 focus-visible:ring-0 focus-visible:border-cyan-500 text-lg font-medium"
                          placeholder="Enter your question here..."
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive hover:bg-red-400/10"
                        onClick={() => removeQuestion(question.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    {question.type === 'choice' && (
                      <div className="pl-4 border-l-2 border-cyan-500/20 space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase">Options</Label>
                        {(question.options || []).map((opt, i) => (
                          <div key={i} className="flex gap-2">
                            <Input 
                              value={opt} 
                              onChange={e => {
                                const newOpts = [...(question.options || [])];
                                newOpts[i] = e.target.value;
                                updateQuestion(question.id, { options: newOpts });
                              }}
                              className="bg-card border-border h-8 text-xs"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => {
                              const newOpts = (question.options || []).filter((_, idx) => idx !== i);
                              updateQuestion(question.id, { options: newOpts });
                            }}><Trash2 size={12} /></Button>
                          </div>
                        ))}
                        <Button variant="link" size="sm" className="text-primary p-0 h-auto" onClick={() => {
                          updateQuestion(question.id, { options: [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`] });
                        }}>+ Add Option</Button>
                      </div>
                    )}

                    <div className="flex items-center gap-4 pt-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={question.required} 
                          onChange={e => updateQuestion(question.id, { required: e.target.checked })}
                          className="rounded border-border bg-card text-primary focus:ring-cyan-500"
                        />
                        Required field
                      </label>
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex flex-wrap gap-2 pt-4">
              <Button variant="outline" size="sm" className="border-border hover:bg-card" onClick={() => handleAddQuestion('rating')}>
                <Star size={14} className="mr-2 text-amber-400" /> Star Rating
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-card" onClick={() => handleAddQuestion('text')}>
                <MessageSquare size={14} className="mr-2 text-blue-400" /> Open Text
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-card" onClick={() => handleAddQuestion('choice')}>
                <ListTodo size={14} className="mr-2 text-purple-400" /> Multiple Choice
              </Button>
              <Button variant="outline" size="sm" className="border-border hover:bg-card" onClick={() => handleAddQuestion('boolean')}>
                <HelpCircle size={14} className="mr-2 text-emerald-400" /> Yes/No
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border text-foreground sticky top-24">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Eye size={16} className="text-primary" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h4 className="font-bold text-lg">{title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
              </div>
              <div className="space-y-4 border-t border-border/50 pt-4">
                {questions.map(q => (
                  <div key={q.id} className="space-y-2 opacity-60 grayscale pointer-events-none">
                    <p className="text-xs font-medium">{q.label} {q.required && <span className="text-destructive">*</span>}</p>
                    {q.type === 'rating' && <div className="flex gap-1"><Star size={14} /><Star size={14} /><Star size={14} /><Star size={14} /><Star size={14} /></div>}
                    {q.type === 'text' && <div className="h-8 w-full bg-card border border-border rounded" />}
                    {q.type === 'choice' && <div className="space-y-1">{(q.options || []).map((o, i) => <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border border-border" /><span className="text-[10px]">{o}</span></div>)}</div>}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary/50 cursor-not-allowed text-xs h-8" disabled>Submit Feedback</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
