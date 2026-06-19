import { NextResponse } from "next/server";
import { getSql, ensureTable } from "@/lib/db";
import { SEED_WEEK_STARTS, SEED_SCHEDULE } from "@/lib/schedule";

function toMap(rows: Record<string, unknown>[]) {
  return Object.fromEntries(
    rows.map((r) => [r.week_start as string, r.schedule])
  );
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getSql();

    const rows = await sql`
      SELECT week_start::text, schedule
      FROM schedule_weeks
      ORDER BY week_start
    `;

    if (rows.length === 0) {
      for (const ws of SEED_WEEK_STARTS) {
        await sql`
          INSERT INTO schedule_weeks (week_start, schedule)
          VALUES (${ws}, ${JSON.stringify(SEED_SCHEDULE)})
          ON CONFLICT DO NOTHING
        `;
      }
      const seeded = await sql`
        SELECT week_start::text, schedule
        FROM schedule_weeks
        ORDER BY week_start
      `;
      return NextResponse.json(toMap(seeded));
    }

    return NextResponse.json(toMap(rows));
  } catch (err) {
    console.error("[GET /api/schedules]", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { weekStart, schedule } = (await req.json()) as {
      weekStart: string;
      schedule: Record<string, string[]>;
    };

    await ensureTable();
    const sql = getSql();

    // Update all weeks in the same month
    await sql`
      UPDATE schedule_weeks
      SET schedule = ${JSON.stringify(schedule)}, saved_at = now()
      WHERE week_start >= date_trunc('month', ${weekStart}::date)
        AND week_start < date_trunc('month', ${weekStart}::date) + INTERVAL '1 month'
    `;

    // Ensure current week exists (if not seeded yet)
    await sql`
      INSERT INTO schedule_weeks (week_start, schedule)
      VALUES (${weekStart}, ${JSON.stringify(schedule)})
      ON CONFLICT (week_start) DO NOTHING
    `;

    // Keep current month + previous month only
    await sql`
      DELETE FROM schedule_weeks
      WHERE week_start < date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/schedules]", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
