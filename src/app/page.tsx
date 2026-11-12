import Link from "next/link";
import { AccidentChart } from "@/components/AccidentChart";
import { Calendar } from "@/components/Calendar";
import { SiteHeader } from "@/components/SiteHeader";
import { toDayKey } from "@/lib/dates";

// Must run per request — otherwise "dagens logg" is baked in at build time (UTC).
export const dynamic = "force-dynamic";

export default function HomePage() {
  const today = toDayKey();
  const [year, month] = today.split("-").map(Number);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-6 sm:px-6">
      <SiteHeader />
      <section className="relative flex min-h-[68vh] flex-col justify-center py-8">
        <div
          className="animate-float-soft pointer-events-none absolute -right-6 top-10 h-40 w-40 rounded-full bg-sleep/20 blur-2xl sm:h-52 sm:w-52"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-16 h-36 w-36 rounded-full bg-meal/20 blur-2xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute right-16 bottom-8 h-28 w-28 rounded-full bg-walk/20 blur-2xl"
          aria-hidden
        />

        <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.18em] text-pine">
          🐶 Valpens dagbok
        </p>
        <h1 className="animate-fade-up mt-3 font-[family-name:var(--font-fraunces)] text-5xl leading-[1.05] tracking-tight text-pine-deep sm:text-6xl md:text-7xl">
          Valpelogg
        </h1>
        <p className="animate-fade-up-delay mt-4 max-w-md text-lg text-muted sm:text-xl">
          Logg lur, turer og måltider — ett trykk, én dag om gangen.
        </p>

        <p className="animate-fade-up-delay mt-5 flex flex-wrap gap-3 text-sm font-medium text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sleep-soft px-3 py-1 text-sleep-deep">
            😴 Lur
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-walk-soft px-3 py-1 text-walk-deep">
            🐾 Tur
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-meal-soft px-3 py-1 text-meal-deep">
            🥣 Måltid
          </span>
        </p>

        <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
          <Link href={`/dag/${today}`} className="btn btn-primary text-base">
            ✨ Åpne dagens logg
          </Link>
          <a href="#kalender" className="btn btn-secondary text-base">
            📅 Se kalender
          </a>
        </div>
      </section>

      <div id="kalender" className="scroll-mt-6">
        <Calendar initialYear={year} initialMonth={month} />
      </div>

      <div id="tisseuhell" className="scroll-mt-6">
        <AccidentChart endDay={today} days={14} />
      </div>
    </main>
  );
}
