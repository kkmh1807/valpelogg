import { formatDuration } from "@/lib/dates";
import type { DayLog, Meal, SleepSession, Walk } from "@/lib/types";

export type LiveChangeKind =
  | "sleep"
  | "walk"
  | "meal"
  | "accident"
  | "poop"
  | "default";

export type LiveChange = {
  message: string;
  kind: LiveChangeKind;
};

function byId<T extends { id: number }>(rows: T[]): Map<number, T> {
  return new Map(rows.map((r) => [r.id, r]));
}

function sleepChanged(a: SleepSession, b: SleepSession): boolean {
  return (
    a.start_at !== b.start_at ||
    a.end_at !== b.end_at ||
    a.notes !== b.notes ||
    a.day !== b.day
  );
}

function walkChanged(a: Walk, b: Walk): boolean {
  return (
    a.started_at !== b.started_at ||
    a.peed !== b.peed ||
    a.pooped !== b.pooped ||
    a.notes !== b.notes ||
    a.day !== b.day
  );
}

function mealChanged(a: Meal, b: Meal): boolean {
  return a.fed_at !== b.fed_at || a.day !== b.day;
}

function sleepDurationLabel(s: SleepSession): string | null {
  if (!s.end_at) return null;
  const label = formatDuration(s.start_at, s.end_at);
  return label || null;
}

function walkToiletLabel(w: Walk): string {
  if (w.peed && w.pooped) return "tiss og bæsj";
  if (w.peed) return "tiss";
  if (w.pooped) return "bæsj";
  return "";
}

function walkMessage(prefix: string, w: Walk): string {
  const toilet = walkToiletLabel(w);
  return toilet ? `${prefix}, ${toilet}` : prefix;
}

function push(
  messages: LiveChange[],
  message: string,
  kind: LiveChangeKind,
) {
  messages.push({ message, kind });
}

function hasPrefix(messages: LiveChange[], prefix: string): boolean {
  return messages.some((m) => m.message.startsWith(prefix));
}

/** Human-readable Norwegian labels for remote day-log diffs. */
export function describeLiveChanges(
  prev: DayLog,
  next: DayLog,
): LiveChange[] {
  const messages: LiveChange[] = [];

  const prevSleep = byId(prev.sleep);
  const nextSleep = byId(next.sleep);
  for (const [id, s] of nextSleep) {
    const old = prevSleep.get(id);
    if (!old) {
      const duration = sleepDurationLabel(s);
      if (s.end_at && duration) {
        push(messages, `Lur ble logget, ${duration}`, "sleep");
      } else {
        push(messages, "Lur ble startet", "sleep");
      }
    } else if (old.end_at == null && s.end_at != null) {
      const duration = sleepDurationLabel(s);
      push(
        messages,
        duration ? `Lur ble avsluttet, ${duration}` : "Lur ble avsluttet",
        "sleep",
      );
    } else if (sleepChanged(old, s)) {
      const duration = sleepDurationLabel(s);
      push(
        messages,
        duration ? `Lur ble endret, ${duration}` : "Lur ble endret",
        "sleep",
      );
    }
  }
  for (const id of prevSleep.keys()) {
    if (!nextSleep.has(id)) push(messages, "Lur ble slettet", "sleep");
  }

  const prevOngoing = prev.ongoingSleep;
  const nextOngoing = next.ongoingSleep;
  if (prevOngoing && !nextOngoing) {
    if (
      !hasPrefix(messages, "Lur ble avsluttet") &&
      !hasPrefix(messages, "Lur ble slettet")
    ) {
      const ended =
        next.sleep.find((s) => s.id === prevOngoing.id) ??
        (next.lastSleepEndAt
          ? { ...prevOngoing, end_at: next.lastSleepEndAt }
          : null);
      const duration = ended ? sleepDurationLabel(ended) : null;
      push(
        messages,
        duration ? `Lur ble avsluttet, ${duration}` : "Lur ble avsluttet",
        "sleep",
      );
    }
  } else if (!prevOngoing && nextOngoing) {
    if (
      !hasPrefix(messages, "Lur ble startet") &&
      !hasPrefix(messages, "Lur ble logget")
    ) {
      push(messages, "Lur ble startet", "sleep");
    }
  }

  const prevWalks = byId(prev.walks);
  const nextWalks = byId(next.walks);
  for (const [id, w] of nextWalks) {
    const old = prevWalks.get(id);
    if (!old) {
      push(messages, walkMessage("Tur ble registrert", w), "walk");
    } else if (walkChanged(old, w)) {
      push(messages, walkMessage("Tur ble endret", w), "walk");
    }
  }
  for (const id of prevWalks.keys()) {
    if (!nextWalks.has(id)) push(messages, "Tur ble slettet", "walk");
  }

  const prevMeals = byId(prev.meals);
  const nextMeals = byId(next.meals);
  for (const [id, m] of nextMeals) {
    const old = prevMeals.get(id);
    if (!old) push(messages, "Måltid ble logget", "meal");
    else if (mealChanged(old, m)) push(messages, "Måltid ble endret", "meal");
  }
  for (const id of prevMeals.keys()) {
    if (!nextMeals.has(id)) push(messages, "Måltid ble slettet", "meal");
  }

  const peeDelta = next.indoorPeeAccidents - prev.indoorPeeAccidents;
  if (peeDelta > 0) {
    push(
      messages,
      peeDelta === 1
        ? "Tisseuhell registrert"
        : `${peeDelta} tisseuhell registrert`,
      "accident",
    );
  } else if (peeDelta < 0) {
    push(
      messages,
      `Tisseuhell oppdatert, nå ${next.indoorPeeAccidents}`,
      "accident",
    );
  }

  const poopDelta = next.indoorPoopAccidents - prev.indoorPoopAccidents;
  if (poopDelta > 0) {
    push(
      messages,
      poopDelta === 1
        ? "Bæsjeuhell registrert"
        : `${poopDelta} bæsjeuhell registrert`,
      "poop",
    );
  } else if (poopDelta < 0) {
    push(
      messages,
      `Bæsjeuhell oppdatert, nå ${next.indoorPoopAccidents}`,
      "poop",
    );
  }

  if (messages.length === 0) {
    push(messages, "Loggen ble oppdatert", "default");
  }
  return messages;
}

export function liveChangeToastClass(kind: LiveChangeKind): string {
  switch (kind) {
    case "sleep":
      return "live-toast live-toast-sleep";
    case "walk":
      return "live-toast live-toast-walk";
    case "meal":
      return "live-toast live-toast-meal";
    case "accident":
      return "live-toast live-toast-accident";
    case "poop":
      return "live-toast live-toast-poop";
    default:
      return "live-toast live-toast-default";
  }
}
