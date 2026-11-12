import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { isAuthEnabled } from "@/lib/auth";
import { toDayKey } from "@/lib/dates";

type Props = {
  /** Optional label override under the brand on small screens */
  title?: string;
};

export function SiteHeader({ title }: Props) {
  const today = toDayKey();
  const showLogout = isAuthEnabled();

  return (
    <header className="sticky top-0 z-30 -mx-4 mb-6 border-b border-pine/10 bg-[color-mix(in_srgb,var(--foam)_82%,transparent)] px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="min-w-0 font-[family-name:var(--font-fraunces)] text-xl font-semibold text-pine-deep sm:text-2xl"
        >
          <span className="mr-1" aria-hidden>
            🐶
          </span>
          Valpelogg
          {title ? (
            <span className="mt-0.5 block truncate text-xs font-sans font-medium uppercase tracking-[0.14em] text-muted">
              {title}
            </span>
          ) : null}
        </Link>
        <SiteNav today={today} showLogout={showLogout} />
      </div>
    </header>
  );
}
