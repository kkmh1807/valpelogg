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
};

export type DayActivity = {
  day: string;
  hasSleep: boolean;
  hasWalk: boolean;
  hasMeal: boolean;
};
