import { NextResponse } from "next/server";
import { getSql, ensureTable } from "@/lib/db";
import { TEAM_NAMES } from "@/lib/schedule";

export async function GET() {
  try {
    await ensureTable();
    const sql = getSql();

    const rows = await sql`SELECT name FROM team_members ORDER BY created_at`;

    if (rows.length === 0) {
      for (const name of TEAM_NAMES) {
        await sql`
          INSERT INTO team_members (name) VALUES (${name})
          ON CONFLICT DO NOTHING
        `;
      }
      const seeded = await sql`SELECT name FROM team_members ORDER BY created_at`;
      return NextResponse.json({ names: seeded.map((r) => r.name as string) });
    }

    return NextResponse.json({ names: rows.map((r) => r.name as string) });
  } catch (err) {
    console.error("[GET /api/team]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name } = (await req.json()) as { name: string };
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    await ensureTable();
    const sql = getSql();
    await sql`
      INSERT INTO team_members (name) VALUES (${name.trim()})
      ON CONFLICT DO NOTHING
    `;
    const rows = await sql`SELECT name FROM team_members ORDER BY created_at`;
    return NextResponse.json({ names: rows.map((r) => r.name as string) });
  } catch (err) {
    console.error("[POST /api/team]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { name } = (await req.json()) as { name: string };
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }

    await ensureTable();
    const sql = getSql();
    await sql`DELETE FROM team_members WHERE name = ${name}`;
    const rows = await sql`SELECT name FROM team_members ORDER BY created_at`;
    return NextResponse.json({ names: rows.map((r) => r.name as string) });
  } catch (err) {
    console.error("[DELETE /api/team]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
