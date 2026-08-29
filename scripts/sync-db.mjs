import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined');
  process.exit(1);
}
const directUrl = connectionString;

console.log('Connecting to database...');

const sql = postgres(directUrl, { ssl: 'require' });

try {
  console.log('Executing DB synchronization queries...');
  
  // 1. Add missing event columns if they don't exist
  await sql`
    ALTER TABLE events 
    ADD COLUMN IF NOT EXISTS source_type text DEFAULT 'native' NOT NULL,
    ADD COLUMN IF NOT EXISTS source_platform text,
    ADD COLUMN IF NOT EXISTS external_id text;
  `;
  console.log('✓ events table columns synced successfully');

  // 2. Remove deprecated NextAuth tables
  await sql`DROP TABLE IF EXISTS "account" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "session" CASCADE;`;
  await sql`DROP TABLE IF EXISTS "verificationToken" CASCADE;`;
  console.log('✓ deprecated NextAuth tables dropped successfully');

  // 4. Create promo_codes table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid REFERENCES events(id) ON DELETE CASCADE,
      code text NOT NULL,
      discount_type text DEFAULT 'percentage' NOT NULL,
      discount_value numeric(10, 2) NOT NULL,
      max_uses integer,
      used_count integer DEFAULT 0 NOT NULL,
      min_order_amount numeric(10, 2) DEFAULT '0' NOT NULL,
      expires_at timestamp with time zone,
      is_active boolean DEFAULT true NOT NULL,
      created_by text REFERENCES users(id),
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS promo_codes_event_code_idx ON promo_codes(event_id, code);`;
  await sql`CREATE INDEX IF NOT EXISTS promo_codes_code_idx ON promo_codes(code);`;
  console.log('✓ promo_codes table synced successfully');

  // 5. Create networking_meetings table if it doesn't exist
  await sql`
    CREATE TABLE IF NOT EXISTS networking_meetings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
      requester_id text REFERENCES users(id) NOT NULL,
      recipient_id text REFERENCES users(id) NOT NULL,
      title text NOT NULL,
      message text,
      start_time timestamp with time zone NOT NULL,
      end_time timestamp with time zone NOT NULL,
      duration_minutes integer DEFAULT 15 NOT NULL,
      status text DEFAULT 'pending' NOT NULL,
      meeting_type text DEFAULT 'virtual' NOT NULL,
      location_details text,
      room_id text,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS meetings_requester_idx ON networking_meetings(requester_id);`;
  await sql`CREATE INDEX IF NOT EXISTS meetings_recipient_idx ON networking_meetings(recipient_id);`;
  await sql`CREATE INDEX IF NOT EXISTS meetings_event_idx ON networking_meetings(event_id);`;
  await sql`CREATE INDEX IF NOT EXISTS meetings_status_idx ON networking_meetings(status);`;
  console.log('✓ networking_meetings table synced successfully');

  // 6. Create event_sponsors and sponsor_leads tables if they don't exist
  await sql`
    CREATE TABLE IF NOT EXISTS event_sponsors (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
      name text NOT NULL,
      tier text DEFAULT 'gold' NOT NULL,
      logo_url text,
      banner_url text,
      website_url text,
      careers_url text,
      description text,
      demo_video_url text,
      promo_offer text,
      booth_number text,
      lead_count integer DEFAULT 0 NOT NULL,
      order_index integer DEFAULT 0 NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS sponsors_event_tier_idx ON event_sponsors(event_id, tier);`;
  console.log('✓ event_sponsors table synced successfully');

  await sql`
    CREATE TABLE IF NOT EXISTS sponsor_leads (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      sponsor_id uuid REFERENCES event_sponsors(id) ON DELETE CASCADE NOT NULL,
      user_id text REFERENCES users(id) NOT NULL,
      notes text,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS sponsor_leads_sponsor_user_idx ON sponsor_leads(sponsor_id, user_id);`;
  console.log('✓ sponsor_leads table synced successfully');

  // 7. Create agenda_sessions and agenda_bookmarks tables if they don't exist
  await sql`
    CREATE TABLE IF NOT EXISTS agenda_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
      title text NOT NULL,
      description text,
      track text DEFAULT 'Main Stage' NOT NULL,
      start_time timestamp with time zone NOT NULL,
      end_time timestamp with time zone NOT NULL,
      speaker_name text,
      speaker_title text,
      speaker_avatar text,
      room_location text,
      session_type text DEFAULT 'talk' NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL,
      updated_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS agenda_event_track_idx ON agenda_sessions(event_id, track);`;
  await sql`CREATE INDEX IF NOT EXISTS agenda_event_time_idx ON agenda_sessions(event_id, start_time);`;
  console.log('✓ agenda_sessions table synced successfully');

  await sql`
    CREATE TABLE IF NOT EXISTS agenda_bookmarks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid REFERENCES agenda_sessions(id) ON DELETE CASCADE NOT NULL,
      user_id text REFERENCES users(id) NOT NULL,
      created_at timestamp with time zone DEFAULT now() NOT NULL
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS agenda_bookmarks_session_user_idx ON agenda_bookmarks(session_id, user_id);`;
  console.log('✓ agenda_bookmarks table synced successfully');

  // 8. Add NPS & category rating columns to event_feedback
  await sql`
    ALTER TABLE event_feedback
    ADD COLUMN IF NOT EXISTS nps_score integer,
    ADD COLUMN IF NOT EXISTS venue_rating integer,
    ADD COLUMN IF NOT EXISTS content_rating integer,
    ADD COLUMN IF NOT EXISTS organization_rating integer,
    ADD COLUMN IF NOT EXISTS highlight text,
    ADD COLUMN IF NOT EXISTS improvement text,
    ADD COLUMN IF NOT EXISTS allow_testimonial boolean DEFAULT false NOT NULL;
  `;
  console.log('✓ event_feedback table NPS columns synced successfully');

  console.log('Database synced successfully.');
  process.exit(0);
} catch (error) {
  console.error('Sync failed:', error);
  process.exit(1);
}
