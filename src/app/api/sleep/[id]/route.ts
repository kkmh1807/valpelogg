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
    start_at?: string;
    end_at?: string | null;
    day?: string;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON." }, { status: 400 });
  }

  const db = await ensureSchema();
  const existing = await db.execute({
    sql: `SELECT * FROM sleep_sessions WHERE id = ?`,
    args: [id],
  });
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Fant ikke lur." }, { status: 404 });
  }

  const row = existing.rows[0];
  let startAt = String(row.start_at);
  let endAt: string | null =
    row.end_at == null ? null : String(row.end_at);
  let day = String(row.day);
  let notes = row.notes == null ? null : String(row.notes);

  if (body.start_at !== undefined) {
    const d = new Date(body.start_at);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: "Ugyldig starttid." }, { status: 400 });
    }
    startAt = toSecondIso(d);
    if (!body.day) day = toDayKey(d);
  }

  if (body.end_at !== undefined) {
    if (body.end_at === null) {
      endAt = null;
    } else {
      const d = new Date(body.end_at);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Ugyldig sluttid." }, { status: 400 });
      }
      endAt = toSecondIso(d);
    }
  }

  if (body.day !== undefined) {
    if (!isValidDayKey(body.day)) {
      return NextResponse.json({ error: "Ugyldig dag." }, { status: 400 });
    }
    day = body.day;
  }

  if (body.notes !== undefined) {
    notes = body.notes;
  }

  if (endAt !== null && new Date(endAt).getTime() < new Date(startAt).getTime()) {
    return NextResponse.json(
      { error: "Sluttid kan ikke være før starttid." },
      { status: 400 },
    );
  }

  await db.execute({
    sql: `UPDATE sleep_sessions SET day = ?, start_at = ?, end_at = ?, notes = ? WHERE id = ?`,
    args: [day, startAt, endAt, notes, id],
  });

  return NextResponse.json({
    sleep: { id, day, start_at: startAt, end_at: endAt, notes },
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
    sql: `DELETE FROM sleep_sessions WHERE id = ?`,
    args: [id],
  });

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "Fant ikke lur." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
