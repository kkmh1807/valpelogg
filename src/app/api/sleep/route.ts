import { NextRequest, NextResponse } from "next/server";
import { isValidDayKey, toDayKey, toSecondIso } from "@/lib/dates";
import { ensureSchema, sameSecondPrefix } from "@/lib/db";


export async function POST(request: NextRequest) {
  let body: {
    action?: string;
    day?: string;
    start_at?: string;
    end_at?: string;
  } = {};

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const action = body.action ?? "start";
  const db = await ensureSchema();

  try {
    if (action === "start") {
      const now = body.start_at ? new Date(body.start_at) : new Date();
      if (Number.isNaN(now.getTime())) {
        return NextResponse.json({ error: "Ugyldig starttid." }, { status: 400 });
      }
      const startAt = toSecondIso(now);
      const day = body.day && isValidDayKey(body.day) ? body.day : toDayKey(now);

      const ongoing = await db.execute({
        sql: `SELECT id FROM sleep_sessions WHERE end_at IS NULL LIMIT 1`,
      });
      if (ongoing.rows.length > 0) {
        return NextResponse.json(
          { error: "En lur pågår allerede.", id: ongoing.rows[0].id },
          { status: 409 },
        );
      }

      // Same-second dedupe
      const prefix = sameSecondPrefix(startAt);
      const dup = await db.execute({
        sql: `SELECT id FROM sleep_sessions WHERE start_at LIKE ? LIMIT 1`,
        args: [`${prefix}%`],
      });
      if (dup.rows.length > 0) {
        const existing = await db.execute({
          sql: `SELECT * FROM sleep_sessions WHERE id = ?`,
          args: [dup.rows[0].id],
        });
        return NextResponse.json({
          sleep: existing.rows[0],
          deduped: true,
        });
      }

      const result = await db.execute({
        sql: `INSERT INTO sleep_sessions (day, start_at, end_at) VALUES (?, ?, NULL)`,
        args: [day, startAt],
      });

      return NextResponse.json({
        sleep: {
          id: Number(result.lastInsertRowid),
          day,
          start_at: startAt,
          end_at: null,
          notes: null,
        },
      });
    }

    if (action === "end") {
      const now = body.end_at ? new Date(body.end_at) : new Date();
      if (Number.isNaN(now.getTime())) {
        return NextResponse.json({ error: "Ugyldig sluttid." }, { status: 400 });
      }
      const endAt = toSecondIso(now);

      const ongoing = await db.execute({
        sql: `SELECT * FROM sleep_sessions WHERE end_at IS NULL ORDER BY start_at DESC LIMIT 1`,
      });
      if (ongoing.rows.length === 0) {
        return NextResponse.json(
          { error: "Ingen pågående lur å avslutte." },
          { status: 404 },
        );
      }

      const row = ongoing.rows[0];
      const startMs = new Date(String(row.start_at)).getTime();
      if (now.getTime() < startMs) {
        return NextResponse.json(
          { error: "Sluttid kan ikke være før starttid." },
          { status: 400 },
        );
      }

      await db.execute({
        sql: `UPDATE sleep_sessions SET end_at = ? WHERE id = ?`,
        args: [endAt, row.id],
      });

      return NextResponse.json({
        sleep: {
          id: Number(row.id),
          day: String(row.day),
          start_at: String(row.start_at),
          end_at: endAt,
          notes: row.notes == null ? null : String(row.notes),
        },
      });
    }

    return NextResponse.json({ error: "Ukjent handling." }, { status: 400 });
  } catch (error) {
    console.error("sleep POST failed", error);
    return NextResponse.json(
      { error: "Kunne ikke lagre lur." },
      { status: 500 },
    );
  }
}
