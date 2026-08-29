'use client';

import { Suspense } from 'react';
import AiRecommendationDashboard from '@/features/ai/recommendation-dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, Users, Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

function RecommendationsLoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-40 bg-card rounded-[2rem] border border-border/50" />
        ))}
      </div>
      <div className="animate-pulse h-[600px] bg-card rounded-[2.5rem] border border-border/50" />
    </div>
  );
}

export default function AiRecommendationsPage() {
  const t = useTranslations('AI');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black font-headline tracking-tighter flex items-center gap-3">
            <Sparkles className="h-10 w-10 text-primary rounded-full p-2 bg-primary/10" />
            {t('recommendations')}
          </h1>
          <p className="text-xl text-muted-foreground mt-3 font-medium max-w-2xl">
            Personalized suggestions powered by artificial intelligence to enhance your event experience and professional growth.
          </p>
        </div>
      </div>

      {/* AI Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Smart Event Matching', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'AI analyzes your preferences and behavior to suggest the most relevant events.' },
          { title: 'Intelligent Networking', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Connect with like-minded professionals based on skills, goals, and compatibility.' },
          { title: 'Personalized Learning', icon: Target, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', desc: 'Curated content and learning paths tailored to your career development goals.' }
        ].map((feature, i) => (
            <Card key={i} className="bg-card border-border/50 rounded-[2rem] shadow-xl overflow-hidden group hover:border-primary/30 transition-all duration-300">
                <CardHeader className="p-8 pb-4">
                    <div className={`w-12 h-12 rounded-2xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <CardTitle className="text-xl font-black font-headline">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                        {feature.desc}
                    </p>
                </CardContent>
            </Card>
        ))}
      </div>

      <div className="bg-card border border-border/50 rounded-[3rem] shadow-2xl p-1 overflow-hidden">
        <Suspense fallback={<RecommendationsLoadingSkeleton />}>
            <AiRecommendationDashboard />
        </Suspense>
      </div>
    </div>
  );
}
