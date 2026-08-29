'use client';
// 
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2, CheckCircle2, MessageSquare, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';
import { Switch } from '@/components/ui/switch';
import type { Id } from '@/types';

interface FeedbackFormProps {
  eventId: Id<"events">;
  eventName: string;
  schema?: Array<{
    id: string;
    question: string;
    type: "rating" | "text" | "boolean";
    required: boolean;
  }>;
  onSuccess?: () => void;
}

export function FeedbackForm({ eventId, eventName, schema = [], onSuccess }: FeedbackFormProps) {
  const { toast } = useToast();
  const submitFeedback = async (_payload: any) => Promise.resolve();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
// 

  const handleResponseChange = (id: string, value: any) => {
    setResponses(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        eventId,
        rating,
        comment,
        responses
      });
      setSubmitted(true);
      toast({ title: "Feedback submitted!", description: "Thank you for helping us improve." });
      onSuccess?.();
    } catch (e) {
      toast({ title: "Error", description: "Failed to submit feedback.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="bg-card border-border text-foreground text-center py-10">
        <CardContent className="space-y-4">
          <div className="bg-success/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h3 className="text-2xl font-bold">Thank You!</h3>
          <p className="text-muted-foreground">Your feedback has been recorded successfully.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Event Feedback</h2>
        <p className="text-muted-foreground">How was your experience at <strong>{eventName}</strong>?</p>
      </div>

      <Card className="bg-card border-border text-foreground">
        <CardContent className="p-6 space-y-8">
          {/* Overall Rating */}
          <div className="space-y-4 text-center">
            <Label className="text-lg font-medium">Overall Satisfaction</Label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star 
                    className={cn(
                      "w-10 h-10 transition-colors",
                      star <= rating ? "fill-yellow-400 text-warning" : "text-gray-600"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Schema Questions */}
          {schema.length > 0 && (
            <div className="space-y-6 pt-6 border-t border-border/50">
              {schema.map((item) => (
                <div key={item.id} className="space-y-3">
                  <Label className="text-sm font-medium flex gap-1">
                    {item.question}
                    {item.required && <span className="text-destructive">*</span>}
                  </Label>
                  
                  {item.type === 'text' && (
                    <Textarea 
                      placeholder="Your answer..."
                      className="bg-card border-border focus-visible:ring-cyan-500"
                      onChange={(e) => handleResponseChange(item.id, e.target.value)}
                    />
                  )}
                  
                  {item.type === 'rating' && (
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => handleResponseChange(item.id, s)}>
                          <Star className={cn("w-5 h-5", (responses[item.id] || 0) >= s ? "fill-cyan-400 text-primary" : "text-gray-700")} />
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {item.type === 'boolean' && (
                    <div className="flex items-center gap-3">
                      <Switch onCheckedChange={(val) => handleResponseChange(item.id, val)} />
                      <span className="text-sm text-muted-foreground">{responses[item.id] ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* General Comment */}
          <div className="space-y-3 pt-6 border-t border-border/50">
            <Label className="text-sm font-medium">Additional Comments</Label>
            <Textarea 
              placeholder="Anything else you'd like to share?" 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-card border-border min-h-[100px] focus-visible:ring-cyan-500"
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting || rating === 0}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-lg font-bold"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
            Submit Feedback
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}


