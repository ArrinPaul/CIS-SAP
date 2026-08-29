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

  console.log('Database synced successfully.');
  process.exit(0);
} catch (error) {
  console.error('Sync failed:', error);
  process.exit(1);
}
