import { NextResponse } from "next/server";
import { getSql, ensureTable } from "@/lib/db";

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getSql();
    const monthKey = currentMonthKey();
    const rows = await sql`
      SELECT 1 FROM schedule_undo WHERE month_key = ${monthKey}
    `;
    return NextResponse.json({ available: rows.length > 0 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST() {
  try {
    await ensureTable();
    const sql = getSql();
    const monthKey = currentMonthKey();

    const rows = await sql`
      SELECT schedule FROM schedule_undo WHERE month_key = ${monthKey}
    `;
    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "No undo available" }, { status: 404 });
    }

    const schedule = rows[0].schedule;

    await sql`
      UPDATE schedule_weeks
      SET schedule = ${JSON.stringify(schedule)}, saved_at = now()
      WHERE week_start >= date_trunc('month', CURRENT_DATE)
        AND week_start < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    `;

    await sql`DELETE FROM schedule_undo WHERE month_key = ${monthKey}`;

    return NextResponse.json({ ok: true, schedule });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
