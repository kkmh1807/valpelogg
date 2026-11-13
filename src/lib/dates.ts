const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** App calendar day — always Norway time (not Vercel UTC). */
export const APP_TIMEZONE = "Europe/Oslo";

/** Format a Date as YYYY-MM-DD in Europe/Oslo. */
export function toDayKey(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Shift a YYYY-MM-DD key by whole calendar days (UTC-safe). */
export function shiftDayKey(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export function isValidDayKey(day: string): boolean {
  if (!DAY_RE.test(day)) return false;
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}

/** ISO timestamp truncated to second precision. */
export function toSecondIso(date: Date = new Date()): string {
  const iso = date.toISOString();
  return iso.replace(/\.\d{3}Z$/, "Z");
}

export function parseLocalDateTime(day: string, time: string): Date | null {
  if (!isValidDayKey(day)) return null;
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) return null;
  const [, hh, mm, ss = "00"] = match;
  const hours = Number(hh);
  const minutes = Number(mm);
  const seconds = Number(ss);
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d, hours, minutes, seconds);
}

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("nb-NO", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDayHeading(day: string): string {
  if (!isValidDayKey(day)) return day;
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("nb-NO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function durationMinutes(
  startIso: string,
  endIso: string | null,
): number {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0;
  return Math.round((end - start) / 60_000);
}

export function formatMinutes(mins: number): string {
  if (mins <= 0) return "0 min";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} t` : `${h} t ${m} min`;
}

export function formatDuration(startIso: string, endIso: string | null): string {
  return formatMinutes(durationMinutes(startIso, endIso));
}

/** Puppy wake window guidelines: prefer ≤45 min, caution to 60, over after that. */
export const WAKE_OK_MAX_MIN = 45;
export const WAKE_WARN_MAX_MIN = 60;

export type WakeLevel = "ok" | "warn" | "over";

export function wakeLevel(mins: number): WakeLevel {
  if (mins <= WAKE_OK_MAX_MIN) return "ok";
  if (mins <= WAKE_WARN_MAX_MIN) return "warn";
  return "over";
}

export function monthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("nb-NO", { month: "long", year: "numeric" });
}

export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month - 1, 1);
  // Monday-first: JS Sunday=0 → shift
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(
      `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    );
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
