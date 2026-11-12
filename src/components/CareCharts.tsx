"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMinutes } from "@/lib/dates";
import type { CareDay } from "@/lib/types";
import { LineTrendChart } from "@/components/LineTrendChart";

type Props = {
  endDay: string;
  days?: number;
};

export function CareCharts({ endDay, days = 14 }: Props) {
  const [series, setSeries] = useState<CareDay[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stats?days=${days}&end=${endDay}`)
      .then((r) => r.json())
      .then((data: { series?: CareDay[] }) => {
        if (!cancelled) setSeries(data.series ?? []);
      })
      .catch(() => {
        if (!cancelled) setSeries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [days, endDay]);

  const sleepPoints = useMemo(
    () =>
      series?.map((d) => ({ day: d.day, value: d.sleepMinutes })) ?? null,
    [series],
  );
  const walkPoints = useMemo(
    () => series?.map((d) => ({ day: d.day, value: d.walkCount })) ?? null,
    [series],
  );

  const avgSleep =
    series && series.length > 0
      ? Math.round(
          series.reduce((sum, d) => sum + d.sleepMinutes, 0) / series.length,
        )
      : 0;
  const avgWalks =
    series && series.length > 0
      ? (
          series.reduce((sum, d) => sum + d.walkCount, 0) / series.length
        ).toFixed(1)
      : "0";

  return (
    <>
      <LineTrendChart
        title="😴 Søvn per dag"
        subtitle={`Siste ${days} dager`}
        series={sleepPoints}
        strokeVar="var(--sleep)"
        borderClass="border-sleep/25"
        summary={series ? `Snitt ${formatMinutes(avgSleep)} / dag` : "…"}
        footer="Total søvntid per kalenderdag (alle lurer den dagen)."
        formatY={(v) => {
          const mins = Math.round(v);
          if (mins < 60) return `${mins}m`;
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          return m === 0 ? `${h}t` : `${h}t${m}`;
        }}
        ariaLabel={`Linjediagram over søvn de siste ${days} dagene`}
      />

      <LineTrendChart
        title="🐾 Turer ute"
        subtitle={`Siste ${days} dager`}
        series={walkPoints}
        strokeVar="var(--walk)"
        borderClass="border-walk/25"
        summary={series ? `Snitt ${avgWalks} turer / dag` : "…"}
        footer="Antall loggede turer per dag."
        formatY={(v) => String(Math.round(v))}
        ariaLabel={`Linjediagram over turer de siste ${days} dagene`}
      />
    </>
  );
}
