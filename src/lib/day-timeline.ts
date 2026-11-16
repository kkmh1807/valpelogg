import { formatDuration } from "@/lib/dates";
import type { DayLog } from "@/lib/types";

export type TimelineKind =
  | "sleep-start"
  | "sleep-end"
  | "walk"
  | "meal"
  | "accident"
  | "accident-summary";

export type TimelineEvent = {
  id: string;
  /** ISO timestamp; empty for untimed summary rows */
  at: string;
  kind: TimelineKind;
  emoji: string;
  title: string;
  detail?: string;
  toneClass: string;
};

export function buildDayTimeline(log: DayLog): TimelineEvent[] {
  const timed: TimelineEvent[] = [];

  for (const s of log.sleep) {
    if (s.end_at == null) {
      timed.push({
        id: `sleep-${s.id}`,
        at: s.start_at,
        kind: "sleep-start",
        emoji: "💤",
        title: "Lur pågår",
        detail: "Startet",
        toneClass: "border-sleep/35 bg-sleep-soft text-sleep-deep",
      });
    } else {
      timed.push({
        id: `sleep-start-${s.id}`,
        at: s.start_at,
        kind: "sleep-start",
        emoji: "😴",
        title: "Lur startet",
        toneClass: "border-sleep/35 bg-sleep-soft text-sleep-deep",
      });
      timed.push({
        id: `sleep-end-${s.id}`,
        at: s.end_at,
        kind: "sleep-end",
        emoji: "☀️",
        title: "Lur avsluttet",
        detail: formatDuration(s.start_at, s.end_at) || undefined,
        toneClass: "border-sleep/35 bg-sleep-soft text-sleep-deep",
      });
    }
  }

  for (const w of log.walks) {
    const parts: string[] = [];
    if (w.peed) parts.push("tiss");
    if (w.pooped) parts.push("bæsj");
    timed.push({
      id: `walk-${w.id}`,
      at: w.started_at,
      kind: "walk",
      emoji: "🐾",
      title: "Tur",
      detail: parts.length > 0 ? parts.join(" og ") : undefined,
      toneClass: "border-walk/35 bg-walk-soft text-walk-deep",
    });
  }

  for (const m of log.meals) {
    timed.push({
      id: `meal-${m.id}`,
      at: m.fed_at,
      kind: "meal",
      emoji: "🥣",
      title: "Måltid",
      toneClass: "border-meal/35 bg-meal-soft text-meal-deep",
    });
  }

  const events = log.accidentEvents ?? [];
  for (const e of events) {
    const isPoop = e.kind === "poop";
    timed.push({
      id: `accident-${e.id}`,
      at: e.occurred_at,
      kind: "accident",
      emoji: isPoop ? "💩" : "💧",
      title: isPoop ? "Bæsjeuhell" : "Tisseuhell",
      toneClass: isPoop
        ? "border-poop/35 bg-poop-soft text-poop-deep"
        : "border-accident/35 bg-accident-soft text-accident-deep",
    });
  }

  timed.sort((a, b) => {
    const diff = new Date(a.at).getTime() - new Date(b.at).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  const timedPee = events.filter((e) => e.kind === "pee").length;
  const timedPoop = events.filter((e) => e.kind === "poop").length;
  const legacyPee = Math.max(0, log.indoorPeeAccidents - timedPee);
  const legacyPoop = Math.max(0, log.indoorPoopAccidents - timedPoop);
  if (legacyPee > 0 || legacyPoop > 0) {
    const bits: string[] = [];
    if (legacyPee > 0) bits.push(`💧 ${legacyPee} tiss`);
    if (legacyPoop > 0) bits.push(`💩 ${legacyPoop} bæsj`);
    timed.push({
      id: "accident-summary",
      at: "",
      kind: "accident-summary",
      emoji: "💧",
      title: "Uhell inne (eldre)",
      detail: `${bits.join(" · ")} uten klokkeslett`,
      toneClass: "border-accident/35 bg-accident-soft text-accident-deep",
    });
  }

  return timed;
}
