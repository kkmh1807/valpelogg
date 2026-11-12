"use client";

import { useMemo } from "react";

type Point = {
  day: string;
  value: number;
};

type Props = {
  title: string;
  subtitle: string;
  series: Point[] | null;
  strokeVar: string;
  fillVar?: string;
  borderClass: string;
  summary: string;
  footer: string;
  formatY?: (value: number) => string;
  ariaLabel: string;
};

const W = 560;
const H = 180;
const PAD = { top: 16, right: 12, bottom: 28, left: 36 };

export function LineTrendChart({
  title,
  subtitle,
  series,
  strokeVar,
  borderClass,
  summary,
  footer,
  formatY = (v) => String(Math.round(v)),
  ariaLabel,
}: Props) {
  const chart = useMemo(() => {
    if (!series || series.length === 0) return null;
    const max = Math.max(1, ...series.map((d) => d.value));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const n = series.length;

    const xAt = (i: number) =>
      PAD.left + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const yAt = (v: number) => PAD.top + innerH - (v / max) * innerH;

    const points = series.map((d, i) => `${xAt(i)},${yAt(d.value)}`).join(" ");
    const grid = [0, 0.5, 1].map((t) => ({
      y: yAt(max * t),
      label: formatY(max * t),
    }));

    return { xAt, yAt, points, grid };
  }, [series, formatY]);

  return (
    <section
      className={`panel animate-fade-up-delay mt-6 border bg-surface ${borderClass}`}
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-ink">
            {title}
          </h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        <p className="font-[family-name:var(--font-fraunces)] text-lg text-ink">
          {summary}
        </p>
      </div>

      {!series || !chart ? (
        <p className="mt-4 text-sm text-muted">Laster graf…</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-44 w-full min-w-[280px]"
            role="img"
            aria-label={ariaLabel}
          >
            {chart.grid.map((g, i) => (
              <g key={`grid-${i}-${g.y}`}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={g.y}
                  y2={g.y}
                  stroke="color-mix(in srgb, var(--muted) 25%, transparent)"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 6}
                  y={g.y + 3}
                  textAnchor="end"
                  className="fill-[var(--muted)]"
                  fontSize="10"
                >
                  {g.label}
                </text>
              </g>
            ))}

            <polyline
              points={chart.points}
              fill="none"
              stroke={strokeVar}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {series.map((d, i) => (
              <g key={d.day}>
                <circle
                  cx={chart.xAt(i)}
                  cy={chart.yAt(d.value)}
                  r="3.5"
                  fill={strokeVar}
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
          <p className="mt-1 text-xs text-muted">{footer}</p>
        </div>
      )}
    </section>
  );
}
