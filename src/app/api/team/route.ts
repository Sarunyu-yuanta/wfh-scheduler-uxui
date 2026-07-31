import { NextResponse } from "next/server";
import { getSql, ensureTable } from "@/lib/db";
import { TEAM_NAMES } from "@/lib/schedule";

function toResponse(rows: { name: string; photo_key: string | null }[]) {
  return NextResponse.json({
    names: rows.map((r) => r.name),
    photoKeys: Object.fromEntries(rows.map((r) => [r.name, r.photo_key ?? r.name])),
  });
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getSql();

    const rows = await sql`
      SELECT name, photo_key FROM team_members ORDER BY created_at
    `;

    if (rows.length === 0) {
      for (const name of TEAM_NAMES) {
        await sql`
          INSERT INTO team_members (name, photo_key) VALUES (${name}, ${name})
          ON CONFLICT DO NOTHING
        `;
      }
      const seeded = await sql`
        SELECT name, photo_key FROM team_members ORDER BY created_at
      `;
      return toResponse(seeded as { name: string; photo_key: string | null }[]);
    }

    return toResponse(rows as { name: string; photo_key: string | null }[]);
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
    const trimmed = name.trim();

    await ensureTable();
    const sql = getSql();
    await sql`
      INSERT INTO team_members (name, photo_key) VALUES (${trimmed}, ${trimmed})
      ON CONFLICT DO NOTHING
    `;
    const rows = await sql`
      SELECT name, photo_key FROM team_members ORDER BY created_at
    `;
    return toResponse(rows as { name: string; photo_key: string | null }[]);
  } catch (err) {
    console.error("[POST /api/team]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { oldName, newName } = (await req.json()) as {
      oldName: string;
      newName: string;
    };
    if (!oldName || !newName || !newName.trim()) {
      return NextResponse.json({ error: "oldName and newName required" }, { status: 400 });
    }
    const trimmed = newName.trim();

    await ensureTable();
    const sql = getSql();

    if (trimmed !== oldName) {
      const existing = await sql`SELECT 1 FROM team_members WHERE name = ${trimmed}`;
      if (existing.length > 0) {
        return NextResponse.json({ error: "มีชื่อนี้อยู่ในทีมแล้ว" }, { status: 409 });
      }
    }

    // Only the display name changes — photo_key is left untouched, so a
    // renamed member keeps whatever photo they already had.
    await sql`UPDATE team_members SET name = ${trimmed} WHERE name = ${oldName}`;

    // Carry the rename into existing schedule data too — otherwise the old
    // name lingers as its own JSON key and shows up as a second, duplicate
    // row (e.g. in history) next to the newly-renamed person.
    if (trimmed !== oldName) {
      await sql`
        UPDATE schedule_weeks
        SET schedule = (schedule - ${oldName}::text) || jsonb_build_object(${trimmed}::text, schedule->${oldName}::text)
        WHERE schedule ? ${oldName}::text
      `;
      await sql`
        UPDATE schedule_undo
        SET schedule = (schedule - ${oldName}::text) || jsonb_build_object(${trimmed}::text, schedule->${oldName}::text)
        WHERE schedule ? ${oldName}::text
      `;
    }

    const rows = await sql`
      SELECT name, photo_key FROM team_members ORDER BY created_at
    `;
    return toResponse(rows as { name: string; photo_key: string | null }[]);
  } catch (err) {
    console.error("[PATCH /api/team]", err);
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
    const rows = await sql`
      SELECT name, photo_key FROM team_members ORDER BY created_at
    `;
    return toResponse(rows as { name: string; photo_key: string | null }[]);
  } catch (err) {
    console.error("[DELETE /api/team]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
