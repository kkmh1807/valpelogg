"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";
import {
  durationMinutes,
  formatClock,
  formatDayHeading,
  formatDuration,
  formatMinutes,
  shiftDayKey,
  wakeGapsBetweenSleep,
  wakeLevel,
  type WakeLevel,
  toDayKey,
} from "@/lib/dates";
import type {
  AccidentKind,
  DayLog as DayLogType,
  Meal,
  SleepSession,
  Walk,
} from "@/lib/types";

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

function wakeTone(level: WakeLevel): string {
  if (level === "ok") return "border-walk/40 bg-walk-soft text-walk-deep";
  if (level === "warn") return "border-honey/50 bg-meal-soft text-honey";
  return "border-warn/40 bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-warn";
}

function wakeHint(level: WakeLevel): string {
  if (level === "ok") return "Innenfor 45 min";
  if (level === "warn") return "Nærmer seg 60 min";
  return "Over 60 min — tid for lur";
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
  const [expandSleep, setExpandSleep] = useState(false);
  const [expandWalks, setExpandWalks] = useState(false);
  const lock = useRef(false);

  const LIST_PREVIEW = 3;

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

  // Oppdater regnskap mens lur pågår eller våkenteller går
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasOngoing =
      Boolean(log?.ongoingSleep) ||
      (log?.sleep ?? []).some((s) => s.end_at === null);
    const trackingAwake =
      isToday && !hasOngoing && Boolean(log?.lastSleepEndAt);
    if (!hasOngoing && !trackingAwake) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(id);
  }, [log?.sleep, log?.ongoingSleep, log?.lastSleepEndAt, isToday]);

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
  const peeAccidents = log?.indoorPeeAccidents ?? 0;
  const poopAccidents = log?.indoorPoopAccidents ?? 0;
  const hasOngoingSleep = (log?.sleep ?? []).some((s) => s.end_at === null);
  const wakeGaps = wakeGapsBetweenSleep(log?.sleep ?? [], log?.priorSleepEndAt);
  const awakeSinceLastNapMin =
    isToday && !ongoing && !hasOngoingSleep && log?.lastSleepEndAt
      ? durationMinutes(log.lastSleepEndAt, new Date().toISOString())
      : null;
  const awakeLevel =
    awakeSinceLastNapMin != null ? wakeLevel(awakeSinceLastNapMin) : null;

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

  async function changeAccidents(kind: AccidentKind, delta: number) {
    await withLock(`accidents-${kind}`, async () => {
      await apiJson("/api/accidents", {
        method: "PATCH",
        body: JSON.stringify({ day, kind, delta }),
      });
    });
  }

  async function confirmDelete(label: string, url: string): Promise<void> {
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
        <h1 className="mt-1 font-[family-name:var(--font-fraunces)] text-3xl capitalize text-pine-deep sm:text-4xl">
          {formatDayHeading(day)}
        </h1>
        <nav className="mt-3 flex items-center gap-2" aria-label="Bytt dag">
          <Link
            href={`/dag/${shiftDayKey(day, -1)}`}
            className="btn btn-ghost min-h-11 flex-1 justify-center px-3 text-sm sm:flex-none"
          >
            ← Forrige
          </Link>
          {!isToday ? (
            <Link
              href={`/dag/${today}`}
              className="btn btn-secondary min-h-11 flex-1 justify-center px-3 text-sm sm:flex-none"
            >
              I dag
            </Link>
          ) : null}
          {day < today ? (
            <Link
              href={`/dag/${shiftDayKey(day, 1)}`}
              className="btn btn-ghost min-h-11 flex-1 justify-center px-3 text-sm sm:flex-none"
            >
              Neste →
            </Link>
          ) : (
            <span
              className="btn btn-ghost min-h-11 flex-1 justify-center px-3 text-sm opacity-40 sm:flex-none"
              aria-disabled="true"
            >
              Neste →
            </span>
          )}
        </nav>
        {!isToday ? (
          <p className="mt-2 text-sm text-muted">
            Du ser en annen dag. Nye registreringer knyttes til denne dagen.
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
        className="panel animate-fade-up border border-pine/15 bg-surface"
        aria-label="Dagens regnskap"
      >
        <h2 className="font-[family-name:var(--font-fraunces)] text-lg text-pine-deep">
          📊 Dagens regnskap
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                : `${log?.sleep.length} ${log?.sleep.length === 1 ? "lur" : "lurer"}${hasOngoingSleep || ongoing ? " · en pågår" : ""}`}
            </p>
            {isToday && awakeSinceLastNapMin != null && awakeLevel ? (
              <p
                className={`mt-1 text-xs font-medium ${
                  awakeLevel === "ok"
                    ? "text-walk-deep"
                    : awakeLevel === "warn"
                      ? "text-honey"
                      : "text-warn"
                }`}
              >
                👀 Våken {formatMinutes(awakeSinceLastNapMin)}
              </p>
            ) : null}
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

          <div className="rounded-2xl border border-accident/30 bg-accident-soft px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-accident-deep">
              💧💩 Uhell
            </p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl text-accident-deep">
              {peeAccidents + poopAccidents}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {peeAccidents + poopAccidents === 0
                ? "Ingen i dag 🎉"
                : `💧 ${peeAccidents} · 💩 ${poopAccidents}`}
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
          <div className="animate-soft-pulse rounded-2xl border border-sleep/30 bg-surface px-4 py-4">
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
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface p-3">
            <label className="text-sm text-muted">
              Starttid
              <input
                type="datetime-local"
                className="mt-1 block rounded-lg border border-sleep/40 bg-surface-strong px-3 py-2 text-ink"
                value={manualSleepStart}
                onChange={(e) => setManualSleepStart(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!manualSleepStart || busy !== null}
              onClick={() => void startSleep(fromLocalInput(manualSleepStart))}
            >
              Lagre start
            </button>
          </div>
        ) : null}

        {isToday && awakeSinceLastNapMin != null && awakeLevel ? (
          <div
            className={`rounded-2xl border-2 px-4 py-3 ${wakeTone(awakeLevel)}`}
            role="status"
          >
            <p className="text-sm font-semibold">👀 Våken siden siste lur</p>
            <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl">
              {formatMinutes(awakeSinceLastNapMin)}
            </p>
            <p className="mt-0.5 text-xs opacity-90">
              Siste lur sluttet {formatClock(log!.lastSleepEndAt!)} ·{" "}
              {wakeHint(awakeLevel)}
            </p>
            <p className="mt-2 text-xs opacity-80">
              Mål: maks 45–60 min våken om gangen (ca. 18–20 t søvn/døgn)
            </p>
          </div>
        ) : null}

        {isToday && (ongoing || hasOngoingSleep) ? (
          <p className="text-sm text-muted">
            Sover nå — våkenteller starter når luren avsluttes.
          </p>
        ) : null}

        {wakeGaps.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-sleep-deep">
              Våkentid mellom lurer
            </p>
            <ul className="space-y-1.5">
              {wakeGaps.map((g) => (
                <li
                  key={`${g.fromIso}-${g.toIso}`}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${wakeTone(g.level)}`}
                >
                  <span>
                    {formatClock(g.fromIso)} → {formatClock(g.toIso)}
                  </span>
                  <span className="font-semibold">
                    {formatMinutes(g.minutes)}
                    <span className="ml-2 text-xs font-normal opacity-90">
                      {wakeHint(g.level)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {(() => {
          const sleepNewest = [...(log?.sleep ?? [])].reverse();
          const sleepVisible = expandSleep
            ? sleepNewest
            : sleepNewest.slice(0, LIST_PREVIEW);
          const sleepExtra = sleepNewest.length - LIST_PREVIEW;
          return (
            <>
              <ul className="space-y-2">
                {sleepVisible.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5"
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
                          void confirmDelete(
                            "denne luren",
                            `/api/sleep/${s.id}`,
                          )
                        }
                      >
                        Slett
                      </button>
                    </div>
                  </li>
                ))}
                {sleepNewest.length === 0 ? (
                  <li className="text-sm text-muted">
                    Ingen lurer denne dagen ennå 🌙
                  </li>
                ) : null}
              </ul>
              {sleepExtra > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost w-full text-sleep-deep"
                  onClick={() => setExpandSleep((v) => !v)}
                >
                  {expandSleep
                    ? "Vis færre"
                    : `Vis ${sleepExtra} eldre lur${sleepExtra === 1 ? "" : "er"}`}
                </button>
              ) : null}
            </>
          );
        })()}
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
          <div className="flex flex-wrap items-end gap-2 rounded-xl bg-surface p-3">
            <label className="text-sm text-muted">
              Tidspunkt
              <input
                type="datetime-local"
                className="mt-1 block rounded-lg border border-walk/40 bg-surface-strong px-3 py-2 text-ink"
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

        {(() => {
          const walksNewest = [...(log?.walks ?? [])].reverse();
          const walksVisible = expandWalks
            ? walksNewest
            : walksNewest.slice(0, LIST_PREVIEW);
          const walksExtra = walksNewest.length - LIST_PREVIEW;
          return (
            <>
              <ul className="space-y-2">
                {walksVisible.map((w) => (
                  <li
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5"
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
                          void confirmDelete(
                            "denne turen",
                            `/api/walks/${w.id}`,
                          )
                        }
                      >
                        Slett
                      </button>
                    </div>
                  </li>
                ))}
                {walksNewest.length === 0 ? (
                  <li className="text-sm text-muted">
                    Ingen turer denne dagen ennå 🌿
                  </li>
                ) : null}
              </ul>
              {walksExtra > 0 ? (
                <button
                  type="button"
                  className="btn btn-ghost w-full text-walk-deep"
                  onClick={() => setExpandWalks((v) => !v)}
                >
                  {expandWalks
                    ? "Vis færre"
                    : `Vis ${walksExtra} eldre tur${walksExtra === 1 ? "" : "er"}`}
                </button>
              ) : null}
            </>
          );
        })()}
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
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2.5"
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
            <li className="text-sm text-muted">
              Ingen måltider denne dagen ennå 🦴
            </li>
          ) : null}
        </ul>
      </section>

      {/* Indoor accidents counters — nest etter lur/tur/måltid */}
      <section className="panel animate-fade-up space-y-5 !border-2 !border-accident/40 !bg-accident-soft/70">
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accident/20 text-lg"
            aria-hidden
          >
            🏠
          </span>
          <div>
            <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-accident-deep">
              Uhell inne
            </h2>
            <p className="text-sm text-muted">Tiss og bæsje — enkel teller</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-accident/30 bg-surface px-3 py-3">
            <p className="text-sm font-semibold text-accident-deep">
              💧 Tisseuhell
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary h-11 w-11 text-xl"
                disabled={busy !== null || peeAccidents <= 0}
                aria-label="Fjern tisseuhell"
                onClick={() => void changeAccidents("pee", -1)}
              >
                −
              </button>
              <p className="min-w-[2.5rem] text-center font-[family-name:var(--font-fraunces)] text-3xl text-accident-deep">
                {peeAccidents}
              </p>
              <button
                type="button"
                className="btn h-11 w-11 bg-accident text-xl text-white shadow-md shadow-accident/25 hover:bg-accident-deep"
                disabled={busy !== null}
                aria-label="Legg til tisseuhell"
                onClick={() => void changeAccidents("pee", 1)}
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-poop/30 bg-poop-soft px-3 py-3">
            <p className="text-sm font-semibold text-poop-deep">
              💩 Bæsjeuhell
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-secondary h-11 w-11 text-xl"
                disabled={busy !== null || poopAccidents <= 0}
                aria-label="Fjern bæsjeuhell"
                onClick={() => void changeAccidents("poop", -1)}
              >
                −
              </button>
              <p className="min-w-[2.5rem] text-center font-[family-name:var(--font-fraunces)] text-3xl text-poop-deep">
                {poopAccidents}
              </p>
              <button
                type="button"
                className="btn h-11 w-11 bg-poop text-xl text-white shadow-md shadow-poop/25 hover:bg-poop-deep"
                disabled={busy !== null}
                aria-label="Legg til bæsjeuhell"
                onClick={() => void changeAccidents("poop", 1)}
              >
                +
              </button>
            </div>
          </div>
        </div>
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
          endDefault={editSleep.end_at ? localInputValue(editSleep.end_at) : ""}
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
              className="mt-1 w-full rounded-lg border border-pine/20 bg-surface-strong px-3 py-2 text-ink"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          {showEnd ? (
            <label className="block text-sm text-muted">
              Slutt (tom = pågår)
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-pine/20 bg-surface-strong px-3 py-2 text-ink"
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
