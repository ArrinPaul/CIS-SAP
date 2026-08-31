'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, Check, MessageSquare, Briefcase, Camera, Share2, Send } from 'lucide-react';
import { generateSocialMediaPosts, distributeSocialPost } from '@/app/actions/event-insights';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SocialPostGenerator({ eventId }: { eventId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState<number | null>(null);
  const [posts, setPosts] = useState<any[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await generateSocialMediaPosts(eventId);
      setPosts(result.map((content: string, i: number) => {
        const platforms = ['X (Twitter)', 'LinkedIn', 'Instagram'];
        const icons = [MessageSquare, Briefcase, Camera];
        return { 
          platform: platforms[i] || 'Social', 
          content,
          icon: icons[i] || Share2,
          hashtags: ['#Eventra', '#Networking', '#TechEvent']
        };
      }));
      toast({ title: 'Social posts generated!' });
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (content: string, platform: string, index: number) => {
    setSharing(index);
    try {
      const pLower = platform.toLowerCase();
      if (pLower.includes('x') || pLower.includes('twitter')) {
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`, '_blank');
      } else if (pLower.includes('linkedin')) {
        window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(content)}`, '_blank');
      } else if (pLower.includes('whatsapp')) {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(content)}`, '_blank');
      }

      const result = await distributeSocialPost(eventId, platform.toLowerCase(), content);
      if (result.success) {
        toast({ title: `Shared to ${platform}!`, description: 'Your update has been launched.' });
      }
    } catch (e: any) {
      toast({ title: 'Distribution failed', description: e.message, variant: 'destructive' });
    } finally {
      setSharing(null);
    }
  };

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <Card className="bg-card border-border text-foreground">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-purple-400" />
          AI Social Promo
        </CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          Generate platform-ready posts to promote your event.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!posts ? (
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-500"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate Promo Posts
          </Button>
        ) : (
          <Tabs defaultValue={posts[0].platform} className="w-full">
            <TabsList className="bg-card border-border w-full justify-start overflow-x-auto h-auto p-1">
              {posts.map((p) => (
                <TabsTrigger key={p.platform} value={p.platform} className="text-[10px] data-[state=active]:bg-purple-600 py-1 px-3">
                  <p.icon className="h-3 w-3 mr-1" />
                  {p.platform.split(' ')[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            {posts.map((p, i) => (
              <TabsContent key={p.platform} value={p.platform} className="mt-4 space-y-4">
                <div className="bg-card rounded-xl p-4 border border-border relative group">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{p.content}</p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.hashtags.map((h: string) => (
                      <span key={h} className="text-[10px] text-purple-400 font-medium">{h}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1 bg-purple-600 hover:bg-purple-500 h-8 text-[10px]"
                      onClick={() => handleShare(p.content, p.platform, i)}
                      disabled={sharing === i}
                    >
                      {sharing === i ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                      Share Now
                    </Button>
                    <Button 
                      variant="outline"
                      size="sm" 
                      className="h-8 border-border text-[10px]"
                      onClick={() => handleCopy(p.content + '\n\n' + p.hashtags.join(' '), i)}
                    >
                      {copiedIndex === i ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
            <Button 
              variant="link" 
              size="sm" 
              className="text-muted-foreground text-[10px] w-full mt-2"
              onClick={() => setPosts(null)}
            >
              Regenerate
            </Button>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

