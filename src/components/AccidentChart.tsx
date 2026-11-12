"use client";

import { useEffect, useMemo, useState } from "react";
import type { AccidentDay } from "@/lib/types";

type Props = {
  endDay: string;
  days?: number;
};

const W = 560;
const H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 28 };

export function AccidentChart({ endDay, days = 14 }: Props) {
  const [series, setSeries] = useState<AccidentDay[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/accidents?days=${days}&end=${endDay}`)
      .then((r) => r.json())
      .then((data: { series?: AccidentDay[] }) => {
        if (!cancelled) setSeries(data.series ?? []);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [days, endDay]);

  const chart = useMemo(() => {
    if (!series || series.length === 0) return null;
    const max = Math.max(
      1,
      ...series.map((d) => Math.max(d.pee, d.poop)),
    );
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const n = series.length;

    const xAt = (i: number) =>
      PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;

    const peePoints = series
      .map((d, i) => `${xAt(i)},${yAt(d.pee)}`)
      .join(" ");
    const poopPoints = series
      .map((d, i) => `${xAt(i)},${yAt(d.poop)}`)
      .join(" ");

    const grid = [0, 0.5, 1].map((t) => ({
      y: yAt(max * t),
      label: String(Math.round(max * t)),
    }));

    return { max, xAt, yAt, peePoints, poopPoints, grid };
  }, [series]);

  const peeTotal = (series ?? []).reduce((sum, d) => sum + d.pee, 0);
  const poopTotal = (series ?? []).reduce((sum, d) => sum + d.poop, 0);

  return (
    <section
      className="panel animate-fade-up-delay mt-6 border border-accident/25 bg-surface"
      aria-label="Uhell inne over tid"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-accident-deep">
            💧💩 Uhell inne
          </h2>
          <p className="text-sm text-muted">Siste {days} dager</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 text-accident-deep">
            <span className="h-2 w-2 rounded-full bg-accident" />
            Tiss {series ? peeTotal : "…"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-poop-deep">
            <span className="h-2 w-2 rounded-full bg-poop" />
            Bæsje {series ? poopTotal : "…"}
          </span>
        </div>
      </div>

      {!series || !chart ? (
        <p className="mt-4 text-sm text-muted">Laster graf…</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-44 w-full min-w-[280px]"
            role="img"
            aria-label={`Linjediagram over tisse- og bæsjeuhell de siste ${days} dagene`}
          >
            {chart.grid.map((g, i) => (
              <g key={`grid-${i}-${g.y}`}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={g.y}
                  y2={g.y}
                  stroke="rgba(63, 111, 150, 0.15)"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={g.y + 3}
                  textAnchor="end"
                  className="fill-[var(--accident-deep)]"
                  fontSize="10"
                >
                  {g.label}
                </text>
              </g>
            ))}

            <polyline
              points={chart.peePoints}
              fill="none"
              stroke="var(--accident)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <polyline
              points={chart.poopPoints}
              fill="none"
              stroke="var(--poop)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {series.map((d, i) => (
              <g key={d.day}>
                <circle
                  cx={chart.xAt(i)}
                  cy={chart.yAt(d.pee)}
                  r="3.5"
                  fill="var(--accident)"
                />
                <circle
                  cx={chart.xAt(i)}
                  cy={chart.yAt(d.poop)}
                  r="3.5"
                  fill="var(--poop)"
                />
                {(i === 0 ||
                  i === series.length - 1 ||
                  i % Math.ceil(series.length / 5) === 0) && (
                  <text
                    x={chart.xAt(i)}
                    y={H - 8}
                    textAnchor="middle"
                    className="fill-[var(--muted)]"
                    fontSize="10"
                  >
                    {d.day.slice(8)}
                  </text>
                )}
              </g>
            ))}
          </svg>
          <p className="mt-1 text-xs text-muted">
            Blå = tisseuhell, brun = bæsjeuhell. Færre uhell over tid er målet 🐾
          </p>
        </div>
      )}
    </section>
  );
}
