import { defineConfig } from 'drizzle-kit';

// Load environment variables from .env.local if available
if (process.env.NODE_ENV !== 'production') {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line: string) => {
        const [key, ...valueParts] = line.split('=');
        const trimmedKey = key?.trim();
        const trimmedValue = valueParts.join('=').trim();
        if (trimmedKey && trimmedValue && !process.env[trimmedKey]) {
          process.env[trimmedKey] = trimmedValue.replace(/^["']|["']$/g, '');
        }
      });
    }
  } catch (e) {
    // Silently fail if env loading fails
  }
}

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public'],
  entities: {
    roles: {
      provider: 'supabase',
    },
  },
  tablesFilter: [
    'users',
    'events',
    'ticket_tiers',
    'tickets',
    'waitlist',
    'communities',
    'community_members',
    'posts',
    'comments',
    'badges',
    'user_badges',
    'notifications',
    'follows',
    'chat_rooms',
    'chat_participants',
    'chat_messages',
    'ai_chat_sessions',
    'ai_chat_messages',
    'ai_recommendation_cache',
    'rate_limits',
    'feedback_templates',
    'certificate_templates',
    'event_feedback',
    'event_staff',
    'sponsors',
    'event_sponsors',
    'sponsor_leads',
    'activity_feed',
    'event_media',
    'issues',
    'event_updates',
    'orders',
    'kanban_tasks',
    'reports',
    'stakeholders',
    'feedback_responses',
    'tags',
    'event_tags',
    'event_maps',
    'event_map_nodes',
    'ingestion_sources',
    'agenda_sessions',
    'agenda_bookmarks',
    'networking_meetings',
    'promo_codes',
  ],
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://invalid:invalid@localhost:5432/eventra',
  },
});
