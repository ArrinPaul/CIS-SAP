import { describe, it, expect } from 'vitest';
import {
  getTwitterShareUrl,
  getLinkedInShareUrl,
  getWhatsAppShareUrl,
  getFacebookShareUrl,
  getTelegramShareUrl,
  getRedditShareUrl,
  getEmailShareUrl,
} from './social-share';

describe('Social Media Sharing Utilities', () => {
  const event = {
    title: 'AI Dev Summit 2026',
    url: 'https://eventra.live/events/ai-summit-2026',
    description: 'The premier AI conference of the year.',
    hashtags: ['Tech', 'AI'],
  };

  it('generates valid Twitter / X intent share link', () => {
    const url = getTwitterShareUrl(event);
    expect(url).toContain('https://twitter.com/intent/tweet?');
    expect(url).toContain('AI+Dev+Summit+2026');
    expect(url).toContain('hashtags=Tech%2CAI');
  });

  it('generates valid LinkedIn share link', () => {
    const url = getLinkedInShareUrl(event);
    expect(url).toContain('https://www.linkedin.com/sharing/share-offsite/?');
    expect(url).toContain(encodeURIComponent(event.url));
  });

  it('generates valid WhatsApp share link', () => {
    const url = getWhatsAppShareUrl(event);
    expect(url).toContain('https://api.whatsapp.com/send?text=');
    expect(url).toContain(encodeURIComponent('AI Dev Summit 2026'));
  });

  it('generates valid Facebook share link', () => {
    const url = getFacebookShareUrl(event);
    expect(url).toContain('https://www.facebook.com/sharer/sharer.php?');
    expect(url).toContain(encodeURIComponent(event.url));
  });

  it('generates valid Telegram share link', () => {
    const url = getTelegramShareUrl(event);
    expect(url).toContain('https://t.me/share/url?');
    expect(url).toContain(encodeURIComponent(event.url));
  });

  it('generates valid Reddit submit link', () => {
    const url = getRedditShareUrl(event);
    expect(url).toContain('https://www.reddit.com/submit?');
  });

  it('generates valid Mailto email invitation link', () => {
    const url = getEmailShareUrl(event);
    expect(url).toContain('mailto:?subject=');
    expect(url).toContain('AI%20Dev%20Summit%202026');
  });
});
