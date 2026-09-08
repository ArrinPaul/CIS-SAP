import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Database connection for Server Components and Server Actions
 * Configured specifically for Supabase Transaction Pooler compatibility
 */
const poolerUrl = process.env.DATABASE_POOLER_URL;
const databaseUrl = process.env.DATABASE_URL;

// `next build` also runs with NODE_ENV=production while it statically
// collects page data — which imports this module for any route that
// touches `db` at module scope, with no real environment configured yet.
// NEXT_PHASE distinguishes that build-time evaluation ('phase-production-build')
// from an actual running server ('phase-production-server'), so the fail-fast
// below only fires when the app is really about to serve traffic.
const isProductionRuntime = process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build';

if (!databaseUrl && !poolerUrl) {
  if (isProductionRuntime) {
    // Fail fast at boot instead of every DB-backed request hitting a
    // confusing connection error deep inside postgres-js against the
    // placeholder connection string below.
    throw new Error('DATABASE_URL (or DATABASE_POOLER_URL) is not set. It is required in production.');
  }
  console.warn('DATABASE_URL is not set. DB-backed routes may be unavailable.');
}

const connectionString = poolerUrl ?? databaseUrl ?? 'postgresql://invalid:invalid@localhost:5432/eventra';

if (poolerUrl && !poolerUrl.includes(':6543')) {
  console.warn('DATABASE_POOLER_URL should use Supabase transaction pooler port 6543.');
}

// Use a singleton to prevent multiple connections in development (Next.js Hot Reloading)
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(connectionString, { 
  prepare: false, // REQUIRED for Supabase Transaction Pooler
  ssl: 'require',
  connect_timeout: 30, // Increase to 30 seconds
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
