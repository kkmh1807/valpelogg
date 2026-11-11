import Link from "next/link";
import { Calendar } from "@/components/Calendar";
import { toDayKey } from "@/lib/dates";

export default function HomePage() {
  const today = toDayKey();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-16 pt-8 sm:px-6">
      <section className="relative flex min-h-[72vh] flex-col justify-center py-8">
        <div
          className="animate-float-soft pointer-events-none absolute -right-6 top-10 h-40 w-40 rounded-full bg-sage/25 blur-2xl sm:h-52 sm:w-52"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-16 h-36 w-36 rounded-full bg-sky/80 blur-2xl"
          aria-hidden
        />

        <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.18em] text-pine">
          Valpens dagbok
        </p>
        <h1 className="animate-fade-up mt-3 font-[family-name:var(--font-fraunces)] text-5xl leading-[1.05] tracking-tight text-pine-deep sm:text-6xl md:text-7xl">
          Valpelogg
        </h1>
        <p className="animate-fade-up-delay mt-4 max-w-md text-lg text-muted sm:text-xl">
          Logg lur, turer og måltider — ett trykk, én dag om gangen.
        </p>

        <div className="animate-fade-up-delay mt-8 flex flex-wrap gap-3">
          <Link href={`/dag/${today}`} className="btn btn-primary text-base">
            Åpne dagens logg
          </Link>
          <a href="#kalender" className="btn btn-secondary text-base">
            Se kalender
          </a>
        </div>
      </section>

      <div id="kalender" className="scroll-mt-6">
        <Calendar initialYear={year} initialMonth={month} />
      </div>
    </main>
  );
}
