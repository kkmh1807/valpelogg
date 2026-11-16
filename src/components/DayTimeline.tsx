"use client";

import { useMemo } from "react";
import { formatClock } from "@/lib/dates";
import {
  buildDayTimeline,
  type TimelineKind,
} from "@/lib/day-timeline";
import type { DayLog } from "@/lib/types";

type Props = {
  log: DayLog;
};

function kindStroke(kind: TimelineKind): string {
  switch (kind) {
    case "sleep-start":
    case "sleep-end":
      return "var(--sleep)";
    case "walk":
      return "var(--walk)";
    case "meal":
      return "var(--meal)";
    case "accident":
      return "var(--accident)";
    default:
      return "var(--pine)";
  }
}

function shortTitle(title: string): string {
  if (title.startsWith("Lur start")) return "Lur start";
  if (title.startsWith("Lur avslut")) return "Lur slutt";
  if (title.startsWith("Lur pågår")) return "Lur";
  if (title.startsWith("Tisse")) return "Tiss";
  if (title.startsWith("Bæsje")) return "Bæsj";
  return title;
}

const SLOT_W = 72;
const H = 118;
const PAD_X = 20;
const AXIS_Y = 58;

/** Compact horizontal timeline chart (no outer panel / toggle). */
export function DayTimeline({ log }: Props) {
  const allEvents = useMemo(() => buildDayTimeline(log), [log]);
  const timed = useMemo(() => allEvents.filter((e) => e.at), [allEvents]);
  const legacy = useMemo(
    () => allEvents.filter((e) => e.kind === "accident-summary"),
    [allEvents],
  );

  const width = Math.max(320, PAD_X * 2 + Math.max(1, timed.length) * SLOT_W);

  if (timed.length === 0 && legacy.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted">Ingenting logget denne dagen.</p>
    );
  }

  return (
    <div className="mt-3 border-t border-pine/10 pt-3" aria-label="Dagens tidslinje">
      {timed.length > 0 ? (
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${H}`}
            width={width}
            height={H}
            className="block max-w-none"
            role="img"
            aria-label="Horisontal tidslinje for dagen"
          >
            <line
              x1={PAD_X}
              y1={AXIS_Y}
              x2={width - PAD_X}
              y2={AXIS_Y}
              stroke="var(--pine)"
              strokeOpacity={0.28}
              strokeWidth={2}
              strokeLinecap="round"
            />

            {timed.map((event, i) => {
              const n = timed.length;
              const x =
                n === 1
                  ? width / 2
                  : PAD_X +
                    SLOT_W / 2 +
                    (i / (n - 1)) * (width - PAD_X * 2 - SLOT_W);
              const above = i % 2 === 0;
              const stroke = kindStroke(event.kind);
              const tip = [formatClock(event.at), event.title, event.detail]
                .filter(Boolean)
                .join(" · ");

              return (
                <g key={event.id}>
                  <title>{tip}</title>
                  <line
                    x1={x}
                    y1={AXIS_Y}
                    x2={x}
                    y2={above ? AXIS_Y - 14 : AXIS_Y + 14}
                    stroke={stroke}
                    strokeOpacity={0.5}
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={x}
                    cy={AXIS_Y}
                    r={6}
                    fill={stroke}
                    stroke="var(--surface-strong)"
                    strokeWidth={2}
                  />
                  <text
                    x={x}
                    y={above ? AXIS_Y - 28 : AXIS_Y + 32}
                    textAnchor="middle"
                    fontSize={14}
                  >
                    {event.emoji}
                  </text>
                  <text
                    x={x}
                    y={above ? 14 : H - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={stroke}
                  >
                    {formatClock(event.at)}
                  </text>
                  <text
                    x={x}
                    y={above ? 26 : H - 18}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--muted)"
                  >
                    {shortTitle(event.title)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}

      {legacy.map((event) => (
        <p key={event.id} className="mt-1 text-xs text-muted">
          {event.emoji} {event.title}
          {event.detail ? ` · ${event.detail}` : ""}
        </p>
      ))}
    </div>
  );
}
