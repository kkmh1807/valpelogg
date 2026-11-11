import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey, toDayKey, toSecondIso } from "@/lib/dates";
import { ensureSchema, sameSecondPrefix } from "@/lib/db";


export async function POST(request: NextRequest) {
  let body: {
    day?: string;
    started_at?: string;
    peed?: boolean;
    pooped?: boolean;
    notes?: string | null;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const now = body.started_at ? new Date(body.started_at) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: "Ugyldig tid." }, { status: 400 });
  }

  const startedAt = toSecondIso(now);
  const day = body.day && isValidDayKey(body.day) ? body.day : toDayKey(now);
  const peed = Boolean(body.peed);
  const pooped = Boolean(body.pooped);
  const notes = body.notes ?? null;

  try {
    const db = await ensureSchema();

    const prefix = sameSecondPrefix(startedAt);
    const dup = await db.execute({
      sql: `SELECT * FROM walks WHERE started_at LIKE ? LIMIT 1`,
      args: [`${prefix}%`],
    });
    if (dup.rows.length > 0) {
      const row = dup.rows[0];
      return NextResponse.json({
        walk: {
          id: Number(row.id),
          day: String(row.day),
          started_at: String(row.started_at),
          peed: Boolean(row.peed),
          pooped: Boolean(row.pooped),
          notes: row.notes == null ? null : String(row.notes),
        },
        deduped: true,
      });
    }

    const result = await db.execute({
      sql: `INSERT INTO walks (day, started_at, peed, pooped, notes) VALUES (?, ?, ?, ?, ?)`,
      args: [day, startedAt, peed ? 1 : 0, pooped ? 1 : 0, notes],
    });

    return NextResponse.json({
      walk: {
        id: Number(result.lastInsertRowid),
        day,
        started_at: startedAt,
        peed,
        pooped,
        notes,
      },
    });
  } catch (error) {
    console.error("walks POST failed", error);
    return NextResponse.json(
      { error: "Kunne ikke lagre tur." },
      { status: 500 },
    );
  }
}
