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
    const { weekStarts, schedule } = (await req.json()) as {
      weekStarts: string[];
      schedule: Record<string, string[]>;
    };

    if (!Array.isArray(weekStarts) || weekStarts.length === 0) {
      return NextResponse.json({ error: "weekStarts required" }, { status: 400 });
    }

    await ensureTable();
    const sql = getSql();

    // Snapshot current schedule before overwriting (enables 1-level undo)
    const monthKey = weekStarts[0].slice(0, 7);
    const current = await sql`
      SELECT schedule FROM schedule_weeks WHERE week_start = ${weekStarts[0]}
    `;
    if (current.length > 0) {
      await sql`
        INSERT INTO schedule_undo (month_key, schedule)
        VALUES (${monthKey}, ${JSON.stringify(current[0].schedule)})
        ON CONFLICT (month_key) DO UPDATE SET schedule = EXCLUDED.schedule, saved_at = now()
      `;
    }

    // Upsert every week of the target month — covers months (e.g. next month)
    // that don't have rows yet, not just ones already seeded.
    for (const ws of weekStarts) {
      await sql`
        INSERT INTO schedule_weeks (week_start, schedule)
        VALUES (${ws}, ${JSON.stringify(schedule)})
        ON CONFLICT (week_start) DO UPDATE SET schedule = ${JSON.stringify(schedule)}, saved_at = now()
      `;
    }

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
