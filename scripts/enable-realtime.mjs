import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  prepare: false,
});

async function enableRealtime() {
  console.log('Enabling Supabase Realtime for core tables...');
  
  try {
    // 1. Create the publication if it doesn't exist
    await sql`DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
          CREATE PUBLICATION supabase_realtime;
        END IF;
      END
    $$;`;

    // 2. Add tables to the publication
    const tables = ['chat_messages', 'notifications', 'activity_feed'];
    
    for (const table of tables) {
      await sql.unsafe(`ALTER PUBLICATION supabase_realtime ADD TABLE ${table};`).catch(e => {
        if (e.message.includes('already exists') || e.message.includes('already member')) {
          console.log(`Table ${table} is already in realtime publication.`);
        } else {
          throw e;
        }
      });
    }

    console.log('Supabase Realtime enabled successfully.');
  } catch (error) {
    console.error('Error enabling Realtime:', error.message);
  } finally {
    await sql.end();
  }
}

enableRealtime();
