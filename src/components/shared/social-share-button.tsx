'use client';

import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  Twitter,
  Linkedin,
  MessageCircle,
  Facebook,
  Send,
  Mail,
  QrCode as QrIcon,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  getTwitterShareUrl,
  getLinkedInShareUrl,
  getWhatsAppShareUrl,
  getFacebookShareUrl,
  getTelegramShareUrl,
  getEmailShareUrl,
  triggerNativeShare,
  ShareEventData,
} from '@/core/utils/social-share';

interface SocialShareButtonProps {
  event: ShareEventData;
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function SocialShareButton({
  event,
  className,
  variant = 'outline',
  size = 'default',
}: SocialShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const getFullUrl = () => {
    if (typeof window !== 'undefined') {
      return event.url.startsWith('http') ? event.url : `${window.location.origin}${event.url}`;
    }
    return event.url;
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullUrl = getFullUrl();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({ title: 'Link Copied', description: 'Event link copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Copy Failed', description: fullUrl, variant: 'destructive' });
    }
  };

  const handleNativeShare = async () => {
    const fullUrl = getFullUrl();
    const result = await triggerNativeShare({
      title: event.title,
      text: `Join me at ${event.title}!`,
      url: fullUrl,
    });

    if (result === 'clipboard') {
      setCopied(true);
      toast({ title: 'Link Copied', description: 'Event URL copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareEventData: ShareEventData = {
    ...event,
    url: getFullUrl(),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Share2 className="w-4 h-4 mr-2 text-muted-foreground" /> Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl rounded-2xl border-border">
        <DropdownMenuLabel className="text-xs font-semibold px-2 py-1.5 text-muted-foreground">
          Share this Event
        </DropdownMenuLabel>

        {/* Copy Link Option */}
        <DropdownMenuItem
          onClick={handleCopyLink}
          className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Event Link'}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        {/* Social Platforms */}
        <DropdownMenuItem asChild>
          <a
            href={getTwitterShareUrl(shareEventData)}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary flex items-center"
          >
            <Twitter className="w-4 h-4 text-sky-500" />
            <span>X (Twitter)</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={getLinkedInShareUrl(shareEventData)}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary flex items-center"
          >
            <Linkedin className="w-4 h-4 text-blue-600" />
            <span>LinkedIn</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={getWhatsAppShareUrl(shareEventData)}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary flex items-center"
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>WhatsApp</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={getFacebookShareUrl(shareEventData)}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary flex items-center"
          >
            <Facebook className="w-4 h-4 text-blue-500" />
            <span>Facebook</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={getTelegramShareUrl(shareEventData)}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary flex items-center"
          >
            <Send className="w-4 h-4 text-sky-400" />
            <span>Telegram</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <a
            href={getEmailShareUrl(shareEventData)}
            className="cursor-pointer gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium focus:bg-primary/10 focus:text-primary flex items-center"
          >
            <Mail className="w-4 h-4 text-muted-foreground" />
            <span>Email Invite</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
