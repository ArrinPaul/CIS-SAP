'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sparkles, MessageSquare, UserPlus, Info } from 'lucide-react';
import { cn } from '@/core/utils/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MatchmakingCardProps {
  match: {
    userId: string;
    name: string;
    role: string;
    company: string;
    connectionValue: number;
    rationale: string;
    conversationStarters: string[];
    image?: string;
  };
  onConnect?: (userId: string) => void;
}

export function MatchmakingCard({ match, onConnect }: MatchmakingCardProps) {
  return (
    <Card className="bg-card border-border hover:border-primary/50 transition-all duration-300 group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16 border-2 border-cyan-500/20">
                <AvatarImage src={match.image} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">
                  {match.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
                <div className="bg-cyan-500 rounded-full h-3 w-3" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">{match.name}</h3>
              <p className="text-sm text-muted-foreground">{match.role}</p>
              <p className="text-xs text-muted-foreground">{match.company}</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <Badge className="bg-primary/20 text-primary border-0 mb-1">
              <Sparkles className="w-3 h-3 mr-1" />
              {match.connectionValue}% Match
            </Badge>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 mb-4 border border-border/50">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground/80 leading-relaxed italic">
              "{match.rationale}"
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Try saying:</p>
          <div className="space-y-2">
            {match.conversationStarters.slice(0, 2).map((starter, i) => (
              <div key={i} className="text-xs bg-card p-2 rounded-lg border border-border/50 text-muted-foreground line-clamp-1">
                "{starter}"
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button 
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground" 
            onClick={() => onConnect?.(match.userId)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Connect
          </Button>
          <Button variant="outline" className="border-border hover:bg-card text-foreground">
            <MessageSquare className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

