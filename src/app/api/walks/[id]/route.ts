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

  let body: {
    started_at?: string;
    day?: string;
    peed?: boolean;
    pooped?: boolean;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON." }, { status: 400 });
  }

  const db = await ensureSchema();
  const existing = await db.execute({
    sql: `SELECT * FROM walks WHERE id = ?`,
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Fant ikke tur." }, { status: 404 });
  }

  const row = existing.rows[0];
  let startedAt = String(row.started_at);
  let day = String(row.day);
  let peed = Boolean(row.peed);
  let pooped = Boolean(row.pooped);
  let notes = row.notes == null ? null : String(row.notes);

  if (body.started_at !== undefined) {
    const d = new Date(body.started_at);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Ugyldig tid." }, { status: 400 });
    }
    startedAt = toSecondIso(d);
    if (!body.day) day = toDayKey(d);
  }

  if (body.day !== undefined) {
    if (!isValidDayKey(body.day)) {
      return NextResponse.json({ error: "Ugyldig dag." }, { status: 400 });
    }
    day = body.day;
  }

  if (body.peed !== undefined) peed = Boolean(body.peed);
  if (body.pooped !== undefined) pooped = Boolean(body.pooped);
  if (body.notes !== undefined) notes = body.notes;

  await db.execute({
    sql: `UPDATE walks SET day = ?, started_at = ?, peed = ?, pooped = ?, notes = ? WHERE id = ?`,
    args: [day, startedAt, peed ? 1 : 0, pooped ? 1 : 0, notes, id],
  });

  return NextResponse.json({
    walk: { id, day, started_at: startedAt, peed, pooped, notes },
  });
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Ugyldig id." }, { status: 400 });
  }

  const db = await ensureSchema();
  const result = await db.execute({
    sql: `DELETE FROM walks WHERE id = ?`,
    args: [id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Fant ikke tur." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
