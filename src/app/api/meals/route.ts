import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey, toDayKey, toSecondIso } from "@/lib/dates";
import { ensureSchema, sameSecondPrefix } from "@/lib/db";


export async function POST(request: NextRequest) {
  let body: { day?: string; fed_at?: string } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const now = body.fed_at ? new Date(body.fed_at) : new Date();
  if (Number.isNaN(now.getTime())) {
    return NextResponse.json({ error: "Ugyldig tid." }, { status: 400 });
  }

  const fedAt = toSecondIso(now);
  const day = body.day && isValidDayKey(body.day) ? body.day : toDayKey(now);

  try {
    const db = await ensureSchema();

    const prefix = sameSecondPrefix(fedAt);
    const dup = await db.execute({
      sql: `SELECT * FROM meals WHERE fed_at LIKE ? LIMIT 1`,
      args: [`${prefix}%`],
    });
    if (dup.rows.length > 0) {
      const row = dup.rows[0];
      return NextResponse.json({
        meal: {
          id: Number(row.id),
          day: String(row.day),
          fed_at: String(row.fed_at),
        },
        deduped: true,
      });
    }

    const result = await db.execute({
      sql: `INSERT INTO meals (day, fed_at) VALUES (?, ?)`,
      args: [day, fedAt],
    });

    return NextResponse.json({
      meal: {
        id: Number(result.lastInsertRowid),
        day,
        fed_at: fedAt,
      },
    });
  } catch (error) {
    console.error("meals POST failed", error);
    return NextResponse.json(
      { error: "Kunne ikke lagre måltid." },
      { status: 500 },
    );
  }
}
