import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "fs";
import path from "path";
import { isDemoMode } from "./config";
import { durationMinutes, shiftDayKey } from "./dates";
import type {
  AccidentDay,
  AccidentKind,
  CareDay,
  DayActivity,
  DayLog,
  Meal,
  SleepSession,
  Walk,
} from "./types";

export { isDemoMode };

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS walks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  started_at TEXT NOT NULL,
  peed INTEGER NOT NULL DEFAULT 0,
  pooped INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  fed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS indoor_accidents (
  day TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  poop_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sleep_day ON sleep_sessions(day);
CREATE INDEX IF NOT EXISTS idx_sleep_ongoing ON sleep_sessions(end_at);
CREATE INDEX IF NOT EXISTS idx_walks_day ON walks(day);
CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day);
`;

let client: Client | null = null;
let bootstrapped = false;

function resolveUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  return `file:${path.join(dataDir, "local.db")}`;
}

export function getDb(): Client {
  if (!client) {
    const url = resolveUrl();
    const authToken = process.env.TURSO_AUTH_TOKEN;
    client = createClient({
      url,
      ...(authToken ? { authToken } : {}),
    });
  }
  return client;
}

export async function ensureSchema(): Promise<Client> {
  const db = getDb();
  if (!bootstrapped) {
    await db.executeMultiple(SCHEMA_SQL);
    // Existing DBs created before poop tracking
    try {
      await db.execute(
        `ALTER TABLE indoor_accidents ADD COLUMN poop_count INTEGER NOT NULL DEFAULT 0`,
      );
    } catch {
      // column already exists
    }
    bootstrapped = true;
  }
  return db;
}

function mapSleep(row: Record<string, unknown>): SleepSession {
  return {
    id: Number(row.id),
    day: String(row.day),
    start_at: String(row.start_at),
    end_at: row.end_at == null ? null : String(row.end_at),
    notes: row.notes == null ? null : String(row.notes),
  };
}

function mapWalk(row: Record<string, unknown>): Walk {
  return {
    id: Number(row.id),
    day: String(row.day),
    started_at: String(row.started_at),
    peed: Boolean(row.peed),
    pooped: Boolean(row.pooped),
    notes: row.notes == null ? null : String(row.notes),
  };
}

function mapMeal(row: Record<string, unknown>): Meal {
  return {
    id: Number(row.id),
    day: String(row.day),
    fed_at: String(row.fed_at),
  };
}

export async function getDayLog(day: string): Promise<DayLog> {
  const db = await ensureSchema();

  const [sleepRes, walkRes, mealRes, accidentRes] = await Promise.all([
    db.execute({
      sql: `SELECT * FROM sleep_sessions WHERE day = ? ORDER BY start_at ASC`,
      args: [day],
    }),
    db.execute({
      sql: `SELECT * FROM walks WHERE day = ? ORDER BY started_at ASC`,
      args: [day],
    }),
    db.execute({
      sql: `SELECT * FROM meals WHERE day = ? ORDER BY fed_at ASC`,
      args: [day],
    }),
    db.execute({
      sql: `SELECT count, poop_count FROM indoor_accidents WHERE day = ?`,
      args: [day],
    }),
  ]);

  const sleep = sleepRes.rows.map((r) =>
    mapSleep(r as unknown as Record<string, unknown>),
  );
  const walks = walkRes.rows.map((r) =>
    mapWalk(r as unknown as Record<string, unknown>),
  );
  const meals = mealRes.rows.map((r) =>
    mapMeal(r as unknown as Record<string, unknown>),
  );
  const indoorPeeAccidents =
    accidentRes.rows.length > 0 ? Number(accidentRes.rows[0].count) : 0;
  const indoorPoopAccidents =
    accidentRes.rows.length > 0
      ? Number(accidentRes.rows[0].poop_count ?? 0)
      : 0;

  const ongoingSleep =
    sleep.find((s) => s.end_at === null) ??
    (
      await db.execute({
        sql: `SELECT * FROM sleep_sessions WHERE end_at IS NULL ORDER BY start_at DESC LIMIT 1`,
      })
    ).rows.map((r) => mapSleep(r as unknown as Record<string, unknown>))[0] ??
    null;

  const lastEndedRes = await db.execute({
    sql: `SELECT end_at FROM sleep_sessions WHERE end_at IS NOT NULL ORDER BY end_at DESC LIMIT 1`,
  });
  const lastSleepEndAt =
    lastEndedRes.rows.length > 0
      ? String(lastEndedRes.rows[0].end_at)
      : null;

  return {
    day,
    sleep,
    walks,
    meals,
    ongoingSleep,
    lastSleepEndAt,
    indoorPeeAccidents,
    indoorPoopAccidents,
  };
}

export async function getIndoorAccidentCounts(
  day: string,
): Promise<{ pee: number; poop: number }> {
  const db = await ensureSchema();
  const res = await db.execute({
    sql: `SELECT count, poop_count FROM indoor_accidents WHERE day = ?`,
    args: [day],
  });
  if (res.rows.length === 0) return { pee: 0, poop: 0 };
  return {
    pee: Number(res.rows[0].count),
    poop: Number(res.rows[0].poop_count ?? 0),
  };
}

export async function setIndoorAccident(
  day: string,
  kind: AccidentKind,
  value: number,
): Promise<{ pee: number; poop: number }> {
  const db = await ensureSchema();
  const safe = Math.max(0, Math.min(99, Math.floor(value)));
  const current = await getIndoorAccidentCounts(day);
  const next = {
    pee: kind === "pee" ? safe : current.pee,
    poop: kind === "poop" ? safe : current.poop,
  };

  if (next.pee === 0 && next.poop === 0) {
    await db.execute({
      sql: `DELETE FROM indoor_accidents WHERE day = ?`,
      args: [day],
    });
    return next;
  }

  await db.execute({
    sql: `INSERT INTO indoor_accidents (day, count, poop_count) VALUES (?, ?, ?)
          ON CONFLICT(day) DO UPDATE SET count = excluded.count, poop_count = excluded.poop_count`,
    args: [day, next.pee, next.poop],
  });
  return next;
}

export async function getAccidentSeries(
  days: number,
  endDay: string,
): Promise<AccidentDay[]> {
  const db = await ensureSchema();
  const startKey = shiftDayKey(endDay, -(days - 1));

  const res = await db.execute({
    sql: `SELECT day, count, poop_count FROM indoor_accidents WHERE day >= ? AND day <= ? ORDER BY day ASC`,
    args: [startKey, endDay],
  });
  const byDay = new Map(
    res.rows.map((r) => [
      String(r.day),
      {
        pee: Number(r.count),
        poop: Number(r.poop_count ?? 0),
      },
    ]),
  );

  const series: AccidentDay[] = [];
  for (let i = 0; i < days; i++) {
    const key = shiftDayKey(startKey, i);
    const row = byDay.get(key);
    series.push({ day: key, pee: row?.pee ?? 0, poop: row?.poop ?? 0 });
  }
  return series;
}

export async function getCareSeries(
  days: number,
  endDay: string,
): Promise<CareDay[]> {
  const db = await ensureSchema();
  const startKey = shiftDayKey(endDay, -(days - 1));

  const [sleepRes, walkRes] = await Promise.all([
    db.execute({
      sql: `SELECT day, start_at, end_at FROM sleep_sessions WHERE day >= ? AND day <= ?`,
      args: [startKey, endDay],
    }),
    db.execute({
      sql: `SELECT day, COUNT(*) AS walk_count FROM walks WHERE day >= ? AND day <= ? GROUP BY day`,
      args: [startKey, endDay],
    }),
  ]);

  const sleepByDay = new Map<string, number>();
  for (const row of sleepRes.rows) {
    const day = String(row.day);
    const mins = durationMinutes(
      String(row.start_at),
      row.end_at == null ? null : String(row.end_at),
    );
    sleepByDay.set(day, (sleepByDay.get(day) ?? 0) + mins);
  }

  const walksByDay = new Map(
    walkRes.rows.map((r) => [String(r.day), Number(r.walk_count)]),
  );

  const series: CareDay[] = [];
  for (let i = 0; i < days; i++) {
    const key = shiftDayKey(startKey, i);
    series.push({
      day: key,
      sleepMinutes: sleepByDay.get(key) ?? 0,
      walkCount: walksByDay.get(key) ?? 0,
    });
  }
  return series;
}

export async function getMonthActivity(
  year: number,
  month: number,
): Promise<DayActivity[]> {
  const db = await ensureSchema();
  const prefix = `${year}-${String(month).padStart(2, "0")}-%`;

  const [sleepRes, walkRes, mealRes] = await Promise.all([
    db.execute({
      sql: `SELECT DISTINCT day FROM sleep_sessions WHERE day LIKE ?`,
      args: [prefix],
    }),
    db.execute({
      sql: `SELECT DISTINCT day FROM walks WHERE day LIKE ?`,
      args: [prefix],
    }),
    db.execute({
      sql: `SELECT DISTINCT day FROM meals WHERE day LIKE ?`,
      args: [prefix],
    }),
  ]);

  const sleepDays = new Set(sleepRes.rows.map((r) => String(r.day)));
  const walkDays = new Set(walkRes.rows.map((r) => String(r.day)));
  const mealDays = new Set(mealRes.rows.map((r) => String(r.day)));
  const allDays = new Set([...sleepDays, ...walkDays, ...mealDays]);

  return [...allDays]
    .sort()
    .map((day) => ({
      day,
      hasSleep: sleepDays.has(day),
      hasWalk: walkDays.has(day),
      hasMeal: mealDays.has(day),
    }));
}

/** Same-second dedupe window helper (ISO second precision). */
export function sameSecondPrefix(iso: string): string {
  return iso.slice(0, 19);
}
