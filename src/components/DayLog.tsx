"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";
import {
  durationMinutes,
  formatClock,
  formatDayHeading,
  formatDuration,
  formatMinutes,
  toDayKey,
} from "@/lib/dates";
import type { DayLog as DayLogType, Meal, SleepSession, Walk } from "@/lib/types";

type Props = {
  day: string;
};

function localInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function DayLog({ day }: Props) {
  const [log, setLog] = useState<DayLogType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [peed, setPeed] = useState(false);
  const [pooped, setPooped] = useState(false);
  const [showManualSleep, setShowManualSleep] = useState(false);
  const [showManualWalk, setShowManualWalk] = useState(false);
  const [manualSleepStart, setManualSleepStart] = useState("");
  const [manualWalkAt, setManualWalkAt] = useState("");
  const [editSleep, setEditSleep] = useState<SleepSession | null>(null);
  const [editWalk, setEditWalk] = useState<Walk | null>(null);
  const [editMeal, setEditMeal] = useState<Meal | null>(null);
  const lock = useRef(false);

  const today = toDayKey();
  const isToday = day === today;

  const refresh = useCallback(async () => {
    const data = await apiJson<DayLogType>(`/api/day?day=${day}`);
    setLog(data);
  }, [day]);

  useEffect(() => {
    let cancelled = false;
    apiJson<DayLogType>(`/api/day?day=${day}`)
      .then((data) => {
        if (cancelled) return;
        setLog(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [day]);

  // Oppdater regnskap mens en lur pågår
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasOngoing = (log?.sleep ?? []).some((s) => s.end_at === null);
    if (!hasOngoing) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [log?.sleep]);

  async function withLock(key: string, fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(key);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noe gikk galt.");
    } finally {
      lock.current = false;
      setBusy(null);
    }
  }

  const ongoing =
    log?.ongoingSleep && (isToday || log.ongoingSleep.day === day)
      ? log.ongoingSleep
      : null;

  const sleepMinutes = (log?.sleep ?? []).reduce(
    (sum, s) => sum + durationMinutes(s.start_at, s.end_at),
    0,
  );
  const walkCount = log?.walks.length ?? 0;
  const peedCount = (log?.walks ?? []).filter((w) => w.peed).length;
  const poopedCount = (log?.walks ?? []).filter((w) => w.pooped).length;
  const mealCount = log?.meals.length ?? 0;
  const hasOngoingSleep = (log?.sleep ?? []).some((s) => s.end_at === null);

  async function startSleep(startAt?: string) {
    await withLock("sleep-start", async () => {
      await apiJson("/api/sleep", {
        method: "POST",
        body: JSON.stringify({
          action: "start",
          day,
          ...(startAt ? { start_at: startAt } : {}),
        }),
      });
      setShowManualSleep(false);
    });
  }

  async function endSleep() {
    await withLock("sleep-end", async () => {
      await apiJson("/api/sleep", {
        method: "POST",
        body: JSON.stringify({ action: "end" }),
      });
    });
  }

  async function addWalk(startedAt?: string) {
    await withLock("walk", async () => {
      await apiJson("/api/walks", {
        method: "POST",
        body: JSON.stringify({
          day,
          peed,
          pooped,
          ...(startedAt ? { started_at: startedAt } : {}),
        }),
      });
      setPeed(false);
      setPooped(false);
      setShowManualWalk(false);
    });
  }

  async function addMeal() {
    await withLock("meal", async () => {
      await apiJson("/api/meals", {
        method: "POST",
        body: JSON.stringify({ day }),
      });
    });
  }

  async function confirmDelete(
    label: string,
    url: string,
  ): Promise<void> {
    if (!window.confirm(`Slette ${label}?`)) return;
    await withLock(`del-${url}`, async () => {
      await apiJson(url, { method: "DELETE" });
    });
  }

  if (!log && !error) {
    return (
      <div className="panel text-muted">Laster {formatDayHeading(day)}…</div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="animate-fade-up">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-pine">
          🐶 Dagens logg
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl capitalize text-pine-deep sm:text-4xl">
          {formatDayHeading(day)}
        </h1>
        {!isToday ? (
          <p className="mt-1 text-sm text-muted">
            Du ser en tidligere dag. Nye registreringer knyttes til denne dagen.
          </p>
        ) : null}
      </header>

      {error ? (
        <p className="rounded-xl border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          {error}
        </p>
      ) : null}

      {/* Dagsregnskap */}
      <section
        className="panel animate-fade-up border border-pine/15 bg-white/75"
        aria-label="Dagens regnskap"
      >
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg text-pine-deep">
          📊 Dagens regnskap
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-sleep/30 bg-sleep-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sleep-deep">
              😴 Søvn
            </p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-sleep-deep">
              {formatMinutes(sleepMinutes)}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {(log?.sleep.length ?? 0) === 0
                ? "Ingen lurer ennå"
                : `${log?.sleep.length} ${log?.sleep.length === 1 ? "lur" : "lurer"}${hasOngoingSleep ? " · en pågår" : ""}`}
            </p>
          </div>

          <div className="rounded-2xl border border-walk/30 bg-walk-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-walk-deep">
              🐾 Turer ute
            </p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-walk-deep">
              {walkCount} {walkCount === 1 ? "tur" : "turer"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {walkCount === 0
                ? "Ingen turer ennå"
                : `💧 ${peedCount} tisset · 💩 ${poopedCount} bæsjet`}
            </p>
          </div>

          <div className="rounded-2xl border border-meal/30 bg-meal-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-meal-deep">
              🥣 Måltider
            </p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-meal-deep">
              {mealCount} {mealCount === 1 ? "måltid" : "måltider"}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {mealCount === 0 ? "Ingen måltider ennå" : "Logget i dag"}
            </p>
          </div>
        </div>
      </section>

      {/* Sleep */}
      <section className="panel animate-fade-up space-y-4 !border-2 !border-sleep/40 !bg-sleep-soft">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sleep/20 text-lg"
            aria-hidden
          >
            😴
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-sleep-deep">
              Lur
            </h2>
            <p className="text-sm text-muted">Ett trykk med enhetens klokke</p>
          </div>
        </div>

        {ongoing ? (
          <div className="animate-soft-pulse rounded-2xl border border-sleep/30 bg-white/80 px-4 py-4">
            <p className="text-sm font-semibold text-sleep-deep">
              💤 Lur pågår
            </p>
            <p className="mt-1 text-muted">
              Startet {formatClock(ongoing.start_at)} ·{" "}
              {formatDuration(ongoing.start_at, null)}
            </p>
            <button
              type="button"
              className="btn mt-3 w-full bg-sleep text-white shadow-md shadow-sleep/30 sm:w-auto hover:bg-sleep-deep"
              disabled={busy !== null}
              onClick={() => void endSleep()}
            >
              {busy === "sleep-end" ? "Avslutter…" : "☀️ Avslutt lur"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn bg-sleep text-white shadow-md shadow-sleep/30 hover:bg-sleep-deep"
              disabled={busy !== null}
              onClick={() => void startSleep()}
            >
              {busy === "sleep-start" ? "Starter…" : "😴 Start lur"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowManualSleep((v) => !v)}
            >
              Manuell tid
            </button>
          </div>
        )}

        {showManualSleep && !ongoing ? (
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white/60 p-3">
            <label className="text-sm text-muted">
              Starttid
              <input
                type="datetime-local"
                className="mt-1 block rounded-lg border border-sleep/40 bg-white px-3 py-2 text-ink"
                value={manualSleepStart}
                onChange={(e) => setManualSleepStart(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!manualSleepStart || busy !== null}
              onClick={() =>
                void startSleep(fromLocalInput(manualSleepStart))
              }
            >
              Lagre start
            </button>
          </div>
        ) : null}

        <ul className="space-y-2">
          {(log?.sleep ?? []).map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2.5"
            >
              <div>
                <p className="font-medium text-ink">
                  💤 {formatClock(s.start_at)}
                  {s.end_at ? ` – ${formatClock(s.end_at)}` : " – pågår"}
                </p>
                <p className="text-xs text-muted">
                  {formatDuration(s.start_at, s.end_at) || "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditSleep(s)}
                >
                  Endre tid
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy !== null}
                  onClick={() =>
                    void confirmDelete("denne luren", `/api/sleep/${s.id}`)
                  }
                >
                  Slett
                </button>
              </div>
            </li>
          ))}
          {(log?.sleep.length ?? 0) === 0 ? (
            <li className="text-sm text-muted">Ingen lurer denne dagen ennå 🌙</li>
          ) : null}
        </ul>
      </section>

      {/* Walks */}
      <section className="panel animate-fade-up space-y-4 !border-2 !border-walk/40 !bg-walk-soft">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-walk/20 text-lg"
            aria-hidden
          >
            🐾
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-walk-deep">
              Tur
            </h2>
            <p className="text-sm text-muted">
              Ett trykk logger tur nå. Huk av for tisset / bæsjet.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="toggle"
            data-on={peed}
            onClick={() => setPeed((v) => !v)}
          >
            💧 Tisset
          </button>
          <button
            type="button"
            className="toggle"
            data-on={pooped}
            onClick={() => setPooped((v) => !v)}
          >
            💩 Bæsjet
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn bg-walk text-white shadow-md shadow-walk/30 hover:bg-walk-deep"
            disabled={busy !== null}
            onClick={() => void addWalk()}
          >
            {busy === "walk" ? "Logger…" : "🦮 Ny tur"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowManualWalk((v) => !v)}
          >
            Manuell tid
          </button>
        </div>

        {showManualWalk ? (
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-white/60 p-3">
            <label className="text-sm text-muted">
              Tidspunkt
              <input
                type="datetime-local"
                className="mt-1 block rounded-lg border border-walk/40 bg-white px-3 py-2 text-ink"
                value={manualWalkAt}
                onChange={(e) => setManualWalkAt(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!manualWalkAt || busy !== null}
              onClick={() => void addWalk(fromLocalInput(manualWalkAt))}
            >
              Lagre tur
            </button>
          </div>
        ) : null}

        <ul className="space-y-2">
          {(log?.walks ?? []).map((w) => (
            <li
              key={w.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2.5"
            >
              <div>
                <p className="font-medium text-ink">
                  🐾 {formatClock(w.started_at)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="toggle"
                    data-on={w.peed}
                    disabled={busy !== null}
                    onClick={() =>
                      void withLock(`walk-peed-${w.id}`, async () => {
                        await apiJson(`/api/walks/${w.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ peed: !w.peed }),
                        });
                      })
                    }
                  >
                    💧 Tisset
                  </button>
                  <button
                    type="button"
                    className="toggle"
                    data-on={w.pooped}
                    disabled={busy !== null}
                    onClick={() =>
                      void withLock(`walk-poop-${w.id}`, async () => {
                        await apiJson(`/api/walks/${w.id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ pooped: !w.pooped }),
                        });
                      })
                    }
                  >
                    💩 Bæsjet
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditWalk(w)}
                >
                  Endre tid
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy !== null}
                  onClick={() =>
                    void confirmDelete("denne turen", `/api/walks/${w.id}`)
                  }
                >
                  Slett
                </button>
              </div>
            </li>
          ))}
          {(log?.walks.length ?? 0) === 0 ? (
            <li className="text-sm text-muted">Ingen turer denne dagen ennå 🌿</li>
          ) : null}
        </ul>
      </section>

      {/* Meals */}
      <section className="panel animate-fade-up space-y-4 !border-2 !border-meal/40 !bg-meal-soft">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-meal/20 text-lg"
            aria-hidden
          >
            🥣
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-meal-deep">
              Måltid
            </h2>
            <p className="text-sm text-muted">Ett trykk logger tidspunktet</p>
          </div>
        </div>

        <button
          type="button"
          className="btn bg-meal text-white shadow-md shadow-meal/30 hover:bg-meal-deep"
          disabled={busy !== null}
          onClick={() => void addMeal()}
        >
          {busy === "meal" ? "Logger…" : "🥣 Måltid"}
        </button>

        <ul className="space-y-2">
          {(log?.meals ?? []).map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-2.5"
            >
              <p className="font-medium text-ink">🍖 {formatClock(m.fed_at)}</p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditMeal(m)}
                >
                  Endre tid
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy !== null}
                  onClick={() =>
                    void confirmDelete("dette måltidet", `/api/meals/${m.id}`)
                  }
                >
                  Slett
                </button>
              </div>
            </li>
          ))}
          {(log?.meals.length ?? 0) === 0 ? (
            <li className="text-sm text-muted">Ingen måltider denne dagen ennå 🦴</li>
          ) : null}
        </ul>
      </section>

      {/* Edit modals */}
      {editSleep ? (
        <EditDialog
          title="😴 Endre lur"
          onClose={() => setEditSleep(null)}
          onSave={async (start, end) => {
            await withLock("edit-sleep", async () => {
              await apiJson(`/api/sleep/${editSleep.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  start_at: fromLocalInput(start),
                  end_at: end ? fromLocalInput(end) : null,
                }),
              });
              setEditSleep(null);
            });
          }}
          startDefault={localInputValue(editSleep.start_at)}
          endDefault={
            editSleep.end_at ? localInputValue(editSleep.end_at) : ""
          }
          showEnd
        />
      ) : null}

      {editWalk ? (
        <EditDialog
          title="🐾 Endre tur"
          onClose={() => setEditWalk(null)}
          onSave={async (start) => {
            await withLock("edit-walk", async () => {
              await apiJson(`/api/walks/${editWalk.id}`, {
                method: "PATCH",
                body: JSON.stringify({ started_at: fromLocalInput(start) }),
              });
              setEditWalk(null);
            });
          }}
          startDefault={localInputValue(editWalk.started_at)}
        />
      ) : null}

      {editMeal ? (
        <EditDialog
          title="🥣 Endre måltid"
          onClose={() => setEditMeal(null)}
          onSave={async (start) => {
            await withLock("edit-meal", async () => {
              await apiJson(`/api/meals/${editMeal.id}`, {
                method: "PATCH",
                body: JSON.stringify({ fed_at: fromLocalInput(start) }),
              });
              setEditMeal(null);
            });
          }}
          startDefault={localInputValue(editMeal.fed_at)}
        />
      ) : null}
    </div>
  );
}

function EditDialog({
  title,
  onClose,
  onSave,
  startDefault,
  endDefault = "",
  showEnd = false,
}: {
  title: string;
  onClose: () => void;
  onSave: (start: string, end: string) => Promise<void>;
  startDefault: string;
  endDefault?: string;
  showEnd?: boolean;
}) {
  const [start, setStart] = useState(startDefault);
  const [end, setEnd] = useState(endDefault);
  const [saving, setSaving] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/35 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-foam p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-[family-name:var(--font-fraunces)] text-xl text-pine-deep">
          {title}
        </h3>
        <div className="mt-4 space-y-3">
          <label className="block text-sm text-muted">
            {showEnd ? "Start" : "Tidspunkt"}
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-pine/20 bg-white px-3 py-2 text-ink"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          {showEnd ? (
            <label className="block text-sm text-muted">
              Slutt (tom = pågår)
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-pine/20 bg-white px-3 py-2 text-ink"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          ) : null}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Avbryt
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!start || saving}
            onClick={() => {
              setSaving(true);
              void onSave(start, end).finally(() => setSaving(false));
            }}
          >
            {saving ? "Lagrer…" : "Lagre"}
          </button>
        </div>
      </div>
    </div>
  );
}
