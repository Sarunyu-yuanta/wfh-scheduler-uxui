import { NextResponse } from "next/server";
import { getSql, ensureTable } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const monthKey = new URL(req.url).searchParams.get("monthKey");
    if (!monthKey) {
      return NextResponse.json({ error: "monthKey required" }, { status: 400 });
    }

    await ensureTable();
    const sql = getSql();
    const rows = await sql`
      SELECT 1 FROM schedule_undo WHERE month_key = ${monthKey}
    `;
    return NextResponse.json({ available: rows.length > 0 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { monthKey } = (await req.json()) as { monthKey: string };
    if (!monthKey) {
      return NextResponse.json({ error: "monthKey required" }, { status: 400 });
    }

    await ensureTable();
    const sql = getSql();

    const rows = await sql`
      SELECT schedule FROM schedule_undo WHERE month_key = ${monthKey}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "No undo available" }, { status: 404 });
    }

    const schedule = rows[0].schedule;
    const monthStart = `${monthKey}-01`;

    await sql`
      UPDATE schedule_weeks
      SET schedule = ${JSON.stringify(schedule)}, saved_at = now()
      WHERE week_start >= ${monthStart}::date
        AND week_start < ${monthStart}::date + INTERVAL '1 month'
    `;

    await sql`DELETE FROM schedule_undo WHERE month_key = ${monthKey}`;

    return NextResponse.json({ ok: true, schedule });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
