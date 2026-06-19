import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS schedule_weeks (
      week_start  DATE         PRIMARY KEY,
      schedule    JSONB        NOT NULL,
      saved_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
    )
  `;
}
