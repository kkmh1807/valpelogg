export type SleepSession = {
  id: number;
  day: string;
  start_at: string;
  end_at: string | null;
  notes: string | null;
};

export type Walk = {
  id: number;
  day: string;
  started_at: string;
  peed: boolean;
  pooped: boolean;
  notes: string | null;
};

export type Meal = {
  id: number;
  day: string;
  fed_at: string;
};

export type DayLog = {
  day: string;
  sleep: SleepSession[];
  walks: Walk[];
  meals: Meal[];
  ongoingSleep: SleepSession | null;
  /** Most recent completed nap end (any day) — for current awake timer. */
  lastSleepEndAt: string | null;
  /**
   * End of the nap before this day's first lur (or before "now" if no lur yet).
   * Used for the first wake window of the day.
   */
  priorSleepEndAt: string | null;
  indoorPeeAccidents: number;
  indoorPoopAccidents: number;
};

export type AccidentKind = "pee" | "poop";

export type AccidentDay = {
  day: string;
  pee: number;
  poop: number;
};

export type CareDay = {
  day: string;
  sleepMinutes: number;
  walkCount: number;
};

export type DayActivity = {
  day: string;
  hasSleep: boolean;
  hasWalk: boolean;
  hasMeal: boolean;
};
