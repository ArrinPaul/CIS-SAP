'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Star, CheckCircle2, Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitEventFeedback } from '@/app/actions/feedback';
import { cn } from '@/core/utils/utils';

interface Question {
  id: string;
  type: 'rating' | 'text' | 'choice' | 'boolean';
  label: string;
  required: boolean;
  options?: string[];
}

interface DynamicFeedbackFormProps {
  eventId: string;
  template: {
    title: string;
    description: string;
    questions: Question[];
  };
  onSuccess?: () => void;
}

export function DynamicFeedbackForm({ eventId, template, onSuccess }: DynamicFeedbackFormProps) {
  const { toast } = useToast();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRatingClick = (val: number) => setRating(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please provide an overall rating.", variant: "destructive" });
      return;
    }

    // Check required questions
    for (const q of template.questions) {
      if (q.required && !responses[q.id]) {
        toast({ title: "Required Field", description: `Please answer: ${q.label}`, variant: "destructive" });
        return;
      }
    }

    setIsSaving(true);
    try {
      await submitEventFeedback({
        eventId,
        rating,
        comment,
        responses
      });
      setIsSubmitted(true);
      toast({ title: "Feedback Submitted", description: "Thank you for your valuable input!" });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="bg-card border-border text-foreground text-center py-12">
        <CardContent className="space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
            <CheckCircle2 className="h-20 w-20 text-emerald-500 relative z-10 mx-auto" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-emerald-500">Thank You!</h2>
            <p className="text-muted-foreground mt-2">Your feedback helps us make future events even better.</p>
          </div>
          <Button variant="outline" className="mt-4 border-border" onClick={() => window.history.back()}>
            Back to Event
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto py-8">
      <Card className="bg-card border-border text-foreground shadow-2xl">
        <CardHeader className="text-center border-b border-border/50 bg-card pb-8">
          <CardTitle className="text-3xl font-black tracking-tight">{template.title}</CardTitle>
          <CardDescription className="text-muted-foreground mt-2 max-w-md mx-auto">{template.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          {/* Overall Rating (Standard) */}
          <div className="space-y-4 text-center">
            <Label className="text-lg font-bold">Overall Experience</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  className="transition-transform active:scale-95"
                >
                  <Star 
                    size={40} 
                    className={cn(
                      "transition-colors",
                      star <= rating ? "fill-amber-400 text-amber-400" : "text-gray-600"
                    )} 
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">How would you rate the event overall? (Required)</p>
          </div>

          <div className="space-y-8">
            {template.questions.map((q) => (
              <div key={q.id} className="space-y-3">
                <Label className="text-base font-semibold flex items-start gap-1">
                  {q.label}
                  {q.required && <span className="text-destructive text-xs">*</span>}
                </Label>

                {q.type === 'rating' && (
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setResponses({ ...responses, [q.id]: s })}
                        className="p-1"
                      >
                        <Star 
                          size={24} 
                          className={cn(
                            responses[q.id] >= s ? "fill-cyan-500 text-primary" : "text-gray-700"
                          )} 
                        />
                      </button>
                    ))}
                  </div>
                )}

                {q.type === 'text' && (
                  <textarea
                    placeholder="Type your answer here..."
                    className="w-full min-h-[80px] bg-card border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-all"
                    value={responses[q.id] || ''}
                    onChange={(e) => setResponses({ ...responses, [q.id]: e.target.value })}
                  />
                )}

                {q.type === 'choice' && (
                  <RadioGroup 
                    value={responses[q.id]} 
                    onValueChange={(val) => setResponses({ ...responses, [q.id]: val })}
                    className="space-y-2"
                  >
                    {(q.options || []).map((opt) => (
                      <div key={opt} className="flex items-center space-x-3 bg-card p-3 rounded-lg border border-border/50 hover:border-border transition-colors">
                        <RadioGroupItem value={opt} id={`${q.id}-${opt}`} className="border-gray-600 text-primary" />
                        <Label htmlFor={`${q.id}-${opt}`} className="flex-1 cursor-pointer text-sm">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {q.type === 'boolean' && (
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant={responses[q.id] === true ? 'default' : 'outline'}
                      className={cn("flex-1", responses[q.id] === true && "bg-emerald-600")}
                      onClick={() => setResponses({ ...responses, [q.id]: true })}
                    >
                      Yes
                    </Button>
                    <Button
                      type="button"
                      variant={responses[q.id] === false ? 'default' : 'outline'}
                      className={cn("flex-1", responses[q.id] === false && "bg-red-600")}
                      onClick={() => setResponses({ ...responses, [q.id]: false })}
                    >
                      No
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-6 border-t border-border/50">
            <Label className="text-base font-semibold">Additional Comments (Optional)</Label>
            <textarea
              placeholder="Any other thoughts you'd like to share?"
              className="w-full min-h-[100px] bg-card border border-border rounded-lg p-3 text-sm focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="p-8 bg-card border-t border-border/50">
          <Button 
            type="submit" 
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Submit Feedback
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
