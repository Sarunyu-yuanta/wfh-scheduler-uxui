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
}
