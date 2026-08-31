/**
 * Social Media Share Link Generator & Web Share API Engine
 */

export interface ShareEventData {
  title: string;
  url: string;
  description?: string;
  hashtags?: string[];
  via?: string;
}

export function getTwitterShareUrl({ title, url, hashtags = ['Eventra', 'Events'], via = 'EventraLive' }: ShareEventData): string {
  const params = new URLSearchParams();
  params.set('text', `Join me at ${title}! 🎟️`);
  params.set('url', url);
  if (hashtags.length > 0) {
    params.set('hashtags', hashtags.map(h => h.replace(/^#/, '')).join(','));
  }
  if (via) {
    params.set('via', via);
  }
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

export function getLinkedInShareUrl({ url }: ShareEventData): string {
  const params = new URLSearchParams();
  params.set('url', url);
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
}

export function getWhatsAppShareUrl({ title, url }: ShareEventData): string {
  const text = `Hey! Check out this event: *${title}*\n${url}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function getFacebookShareUrl({ url }: ShareEventData): string {
  const params = new URLSearchParams();
  params.set('u', url);
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
}

export function getTelegramShareUrl({ title, url }: ShareEventData): string {
  const params = new URLSearchParams();
  params.set('url', url);
  params.set('text', `Check out ${title}!`);
  return `https://t.me/share/url?${params.toString()}`;
}

export function getRedditShareUrl({ title, url }: ShareEventData): string {
  const params = new URLSearchParams();
  params.set('url', url);
  params.set('title', title);
  return `https://www.reddit.com/submit?${params.toString()}`;
}

export function getEmailShareUrl({ title, url, description }: ShareEventData): string {
  const subject = encodeURIComponent(`Invitation: ${title}`);
  const body = encodeURIComponent(
    `Hi,\n\nI thought you might be interested in attending ${title}.\n\n${description ? `${description}\n\n` : ''}Event Link: ${url}\n\nSee you there!`
  );
  return `mailto:?subject=${subject}&body=${body}`;
}

/**
 * Triggers native mobile share sheet if available, otherwise falls back to clipboard.
 */
export async function triggerNativeShare(data: {
  title: string;
  text: string;
  url: string;
}): Promise<'native' | 'clipboard' | 'failed'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'native';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return 'failed';
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(data.url);
      return 'clipboard';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
