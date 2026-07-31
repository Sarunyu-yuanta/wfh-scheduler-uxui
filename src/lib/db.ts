import { neon } from "@neondatabase/serverless";

// Lazy — only creates the connection when a handler is actually invoked,
// not at module evaluation time (which would break Next.js build).
export function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export async function ensureTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_weeks (
      week_start  DATE         PRIMARY KEY,
      schedule    JSONB        NOT NULL,
      saved_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_undo (
      month_key  TEXT         PRIMARY KEY,
      schedule   JSONB        NOT NULL,
      saved_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS team_members (
      name        TEXT         PRIMARY KEY,
      photo_key   TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `;
  // Stable photo identity, independent of the (renameable) display name —
  // added after the initial release, so existing tables need this migrated in.
  await sql`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo_key TEXT`;
  // Backfill rows created before photo_key existed — must happen before any
  // rename touches them, or the original name (and its photo) is lost for good.
  await sql`UPDATE team_members SET photo_key = name WHERE photo_key IS NULL`;
}
