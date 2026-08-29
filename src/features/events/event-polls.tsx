'use client';
// 
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Plus, Trash2, CheckCircle2, Circle, Loader2, Play, Pause } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/core/utils/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Id } from '@/types';
import { createEventPoll, deleteEventPoll, getEventPolls, toggleEventPoll, voteEventPoll } from '@/app/actions/event-engagement';

interface EventPollsProps {
  eventId: Id<"events">;
  isOrganizer: boolean;
}

export function EventPolls({ eventId, isOrganizer }: EventPollsProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [polls, setPolls] = useState<any[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const rows = await getEventPolls(eventId as any);
      if (!mounted) return;
      setPolls(
        (rows as any[]).map((row) => {
          const options = Array.isArray(row.options) ? row.options : [];
          const votesByUser = row.votes || {};
          const results = options.map((_: unknown, idx: number) =>
            Object.values(votesByUser).filter((v) => Number(v) === idx).length
          );
          return {
            ...row,
            results,
            totalVotes: Object.keys(votesByUser).length,
            myVote: null,
          };
        })
      );
    }

    load();
    return () => {
      mounted = false;
    };
  }, [eventId]);

  const handleAddOption = () => setNewOptions([...newOptions, '']);
  
  const handleCreate = async () => {
    if (!newQuestion.trim() || newOptions.some(o => !o.trim())) return;
    setLoading(true);
    try {
      const cleanOptions = newOptions.map((o) => o.trim());
      const result = await createEventPoll({ eventId: eventId as any, question: newQuestion.trim(), options: cleanOptions });
      if (!result.success || !result.id) throw new Error('Failed to create poll');
      setPolls((prev) => [
        {
          id: result.id,
          eventId,
          question: newQuestion.trim(),
          options: cleanOptions,
          results: cleanOptions.map(() => 0),
          totalVotes: 0,
          myVote: null,
          isActive: true,
          createdAt: new Date(),
        },
        ...prev,
      ]);
      setShowCreate(false);
      setNewQuestion('');
      setNewOptions(['', '']);
      toast({ title: "Poll published!" });
    } catch (e) {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Live Polling</h2>
          <p className="text-sm text-muted-foreground">Participate in real-time surveys.</p>
        </div>
        {isOrganizer && (
          <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
            <Plus className="w-4 h-4 mr-2" />
            New Poll
          </Button>
        )}
      </div>

      {showCreate && (
        <Card className="bg-card border-primary/30 text-foreground overflow-hidden animate-in slide-in-from-top-4">
          <CardHeader><CardTitle className="text-lg">Create a Poll</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Input value={newQuestion} onChange={e => setNewQuestion(e.target.value)} placeholder="What's your favorite track?" className="bg-card border-border" />
            </div>
            <div className="space-y-3">
              <Label>Options</Label>
              {newOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={opt} onChange={e => {
                    const next = [...newOptions];
                    next[i] = e.target.value;
                    setNewOptions(next);
                  }} placeholder={`Option ${i+1}`} className="bg-card border-border" />
                  {newOptions.length > 2 && (
                    <Button variant="ghost" size="icon" onClick={() => setNewOptions(newOptions.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4" /></Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddOption} className="w-full border-border text-xs">Add another option</Button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleCreate} disabled={loading || !newQuestion} className="flex-1 bg-primary">Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {polls.length === 0 ? (
        <div className="py-32 text-center border border-dashed border-border rounded-3xl bg-card">
          <BarChart3 size={48} className="mx-auto mb-4 text-gray-700 opacity-20" />
          <h3 className="text-lg font-bold text-muted-foreground">No active polls</h3>
          <p className="text-sm text-gray-600">Waiting for organizers to start a poll.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {polls.map((poll) => {
            const pollId = poll.id;
            return (
            <Card key={pollId} className={cn(
              "bg-card border-border text-foreground transition-all",
              !poll.isActive && "opacity-60"
            )}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{poll.question}</CardTitle>
                  {isOrganizer && (
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={async () => {
                          const result = await toggleEventPoll(pollId);
                          if (result.success) {
                            setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, isActive: !poll.isActive } : p)));
                          }
                        }}
                        className="text-xs h-8"
                      >
                        {poll.isActive ? <Pause size={14} className="mr-1" /> : <Play size={14} className="mr-1" />}
                        {poll.isActive ? "End Poll" : "Restart"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-destructive hover:text-red-300"
                        onClick={async () => {
                          const result = await deleteEventPoll(pollId);
                          if (result.success) {
                            setPolls((prev) => prev.filter((p) => p.id !== pollId));
                          }
                        }}
                      >
                        <Trash2 size={14} className="mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </div>
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary/70">
                  {poll.totalVotes} total votes • {poll.isActive ? "Accepting votes" : "Poll ended"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {poll.options.map((opt: string, i: number) => {
                  const voteCount = poll.results[i] || 0;
                  const percent = poll.totalVotes > 0 ? Math.round((voteCount / poll.totalVotes) * 100) : 0;
                  const isVoted = poll.myVote === i;

                  return (
                    <div key={i} className="space-y-2">
                      <button
                        disabled={!poll.isActive || loading}
                        onClick={async () => {
                          const result = await voteEventPoll({ id: pollId, optionIndex: i });
                          if (!result.success) return;
                          setPolls((prev) =>
                            prev.map((p) => {
                              if (p.id !== pollId) return p;
                              const results = Array.isArray(p.results) ? [...p.results] : [];
                              results[i] = Number(results[i] || 0) + 1;
                              return { ...p, results, totalVotes: Number(p.totalVotes || 0) + 1, myVote: i };
                            })
                          );
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-sm",
                          isVoted 
                            ? "bg-primary/10 border-primary/50 text-foreground" 
                            : "bg-card border-border/50 hover:bg-white/[0.08]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isVoted ? <CheckCircle2 size={16} className="text-primary" /> : <Circle size={16} className="text-gray-600" />}
                          <span>{opt}</span>
                        </div>
                        <span className="font-bold">{percent}%</span>
                      </button>
                      <Progress value={percent} className="h-1 bg-card" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )})}
        </div>
      )}
    </div>
  );
}


