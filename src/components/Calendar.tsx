"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  buildMonthGrid,
  monthLabel,
  shiftMonth,
  toDayKey,
} from "@/lib/dates";
import type { DayActivity } from "@/lib/types";

const WEEKDAYS = ["ma", "ti", "on", "to", "fr", "lø", "sø"];

type Props = {
  initialYear: number;
  initialMonth: number;
};

export function Calendar({ initialYear, initialMonth }: Props) {
  const today = toDayKey();
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [activity, setActivity] = useState<Record<string, DayActivity>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/calendar?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((data: { days?: DayActivity[] }) => {
        if (cancelled) return;
        const map: Record<string, DayActivity> = {};
        for (const d of data.days ?? []) map[d.day] = d;
        setActivity(map);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setActivity({});
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const cells = buildMonthGrid(year, month);
  const label = monthLabel(year, month);

  function go(delta: number) {
    setLoading(true);
    const next = shiftMonth(year, month, delta);
    setYear(next.year);
    setMonth(next.month);
  }

  return (
    <section
      className="panel animate-fade-up-delay border border-pine/10 bg-white/70"
      aria-label="Kalender"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-[family-name:var(--font-fraunces)] text-2xl capitalize text-pine-deep">
          📅 {label}
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary px-3 py-2 text-sm"
            onClick={() => go(-1)}
            aria-label="Forrige måned"
          >
            ←
          </button>
          <button
            type="button"
            className="btn btn-secondary px-3 py-2 text-sm"
            onClick={() => go(1)}
            aria-label="Neste måned"
          >
            →
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div
        className={`grid grid-cols-7 gap-1 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}
      >
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`empty-${i}`} className="aspect-square" />;
          }
          const a = activity[day];
          const isToday = day === today;
          return (
            <Link
              key={day}
              href={`/dag/${day}`}
              className={`flex aspect-square flex-col items-center justify-center rounded-2xl text-sm transition hover:bg-white/80 ${
                isToday
                  ? "bg-pine text-white shadow-md shadow-pine/20"
                  : "bg-white/40 text-ink"
              }`}
            >
              <span className="font-semibold">{Number(day.slice(-2))}</span>
              <span className="mt-0.5 flex h-2 items-center gap-0.5">
                {a?.hasSleep ? (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white/90" : "bg-sleep"}`}
                    title="Lur"
                  />
                ) : null}
                {a?.hasWalk ? (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white/90" : "bg-walk"}`}
                    title="Tur"
                  />
                ) : null}
                {a?.hasMeal ? (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${isToday ? "bg-white/90" : "bg-meal"}`}
                    title="Måltid"
                  />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-sleep" /> 😴 Lur
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-walk" /> 🐾 Tur
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-meal" /> 🥣 Måltid
        </span>
      </p>
    </section>
  );
}
