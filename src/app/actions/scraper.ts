'use server';

import { db } from '@/lib/db';
import { events } from '@/lib/db/schema';
import { auth } from '@clerk/nextjs/server';
import { validateRole } from '@/lib/auth-utils';
import { generateEmbedding } from '@/lib/ai';
import { revalidatePath } from 'next/cache';
import { slugify } from '@/core/utils/slugify';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * Extract Metadata from a URL (Proof of Concept Scraper)
 */
export async function scrapeEventMetadata(url: string) {
  const admin = await validateRole(['admin']);
  // This fetches a caller-supplied URL from the server, so keep it slow.
  // Throws rather than returning a result: the success path returns bare
  // metadata and the caller already handles thrown errors.
  await enforceRateLimit({ userId: admin.id, scope: 'scrape:url', limit: 10 });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    const html = await response.text();

    // Enhanced extraction logic
    const getMeta = (props: string[]) => {
      for (const prop of props) {
        const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
          || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'));
        if (match) return match[1];
      }
      return null;
    };

    // Try to find JSON-LD
    let jsonLdData: any = null;
    try {
      const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
      if (jsonLdMatch) {
        const parsed = JSON.parse(jsonLdMatch[1].trim());
        jsonLdData = Array.isArray(parsed) ? parsed.find(item => item['@type'] === 'Event') : parsed;
      }
    } catch (e) {
      console.warn('JSON-LD parse error:', e);
    }

    const title = jsonLdData?.name 
      || getMeta(['og:title', 'twitter:title']) 
      || html.match(/<title>([^<]+)<\/title>/i)?.[1] 
      || 'External Event';

    const description = jsonLdData?.description 
      || getMeta(['og:description', 'description', 'twitter:description']) 
      || 'No description available.';

    const imageUrl = jsonLdData?.image 
      || getMeta(['og:image', 'twitter:image', 'image']);

    const startDate = jsonLdData?.startDate;
    const endDate = jsonLdData?.endDate;
    const location = jsonLdData?.location?.name || jsonLdData?.location?.address?.streetAddress;

    return {
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      externalUrl: url,
      startDate,
      endDate,
      location,
    };
  } catch (error) {
    console.error('Scraper Error:', error);
    throw new Error('Failed to scrape URL');
  }
}

/**
 * Ingest an external event into the database
 */
export async function ingestExternalEvent(data: {
  title: string;
  description: string;
  imageUrl?: string;
  externalUrl: string;
  category: string;
  startDate: string;
  endDate: string;
}) {
  const user = await validateRole(['admin']);
  
  try {
    const slug = `${slugify(data.title)}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Generate embedding for recommendation support
    const embeddingContent = `${data.title} ${data.category} ${data.description}`;
    const embeddingResult = await generateEmbedding(embeddingContent);
    const embedding = (embeddingResult as any)?.embedding?.values;

    const [newEvent] = await db.insert(events).values({
      slug,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      externalUrl: data.externalUrl,
      category: data.category,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: 'published',
      type: 'physical',
      location: { venue: 'External Source', address: data.externalUrl },
      capacity: 1000,
      organizerId: user.id,
      embedding: embedding,
    }).returning();

    revalidatePath('/explore');
    return { success: true, event: newEvent };
  } catch (error) {
    console.error('Ingestion Error:', error);
    return { success: false, error: 'Failed to ingest event' };
  }
}
