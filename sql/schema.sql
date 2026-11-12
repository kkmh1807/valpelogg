-- Valpelogg schema (Turso / libSQL / SQLite)

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

-- Daily counters: indoor pee / poop accidents
-- `count` = tisseuhell (legacy column name), `poop_count` = bæsjeuhell
CREATE TABLE IF NOT EXISTS indoor_accidents (
  day TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  poop_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sleep_day ON sleep_sessions(day);
CREATE INDEX IF NOT EXISTS idx_sleep_ongoing ON sleep_sessions(end_at);
CREATE INDEX IF NOT EXISTS idx_walks_day ON walks(day);
CREATE INDEX IF NOT EXISTS idx_meals_day ON meals(day);
