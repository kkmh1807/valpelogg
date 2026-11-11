import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey, toDayKey, toSecondIso } from "@/lib/dates";
import { ensureSchema } from "@/lib/db";


type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: Ctx) {
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Ugyldig id." }, { status: 400 });
  }

  let body: { fed_at?: string; day?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON." }, { status: 400 });
  }

  const db = await ensureSchema();
  const existing = await db.execute({
    sql: `SELECT * FROM meals WHERE id = ?`,
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Fant ikke måltid." }, { status: 404 });
  }

  const row = existing.rows[0];
  let fedAt = String(row.fed_at);
  let day = String(row.day);

  if (body.fed_at !== undefined) {
    const d = new Date(body.fed_at);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Ugyldig tid." }, { status: 400 });
    }
    fedAt = toSecondIso(d);
    if (!body.day) day = toDayKey(d);
  }

  if (body.day !== undefined) {
    if (!isValidDayKey(body.day)) {
      return NextResponse.json({ error: "Ugyldig dag." }, { status: 400 });
    }
    day = body.day;
  }

  await db.execute({
    sql: `UPDATE meals SET day = ?, fed_at = ? WHERE id = ?`,
    args: [day, fedAt, id],
  });

  return NextResponse.json({ meal: { id, day, fed_at: fedAt } });
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Ugyldig id." }, { status: 400 });
  }

  const db = await ensureSchema();
  const result = await db.execute({
    sql: `DELETE FROM meals WHERE id = ?`,
    args: [id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Fant ikke måltid." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
