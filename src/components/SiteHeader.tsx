import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/LogoutButton";
import { isAuthEnabled } from "@/lib/auth";

type Props = {
  backHref?: string;
  backLabel?: string;
  rightSlot?: ReactNode;
};

export function SiteHeader({
  backHref,
  backLabel = "← 🐶 Valpelogg",
  rightSlot,
}: Props) {
  const showLogout = isAuthEnabled();

  return (
    <nav className="mb-6 flex items-center justify-between gap-3 text-sm">
      {backHref ? (
        <Link
          href={backHref}
          className="font-semibold text-pine hover:text-pine-deep"
        >
          {backLabel}
        </Link>
      ) : (
        <span className="font-[family-name:var(--font-fraunces)] text-lg font-semibold text-pine-deep">
          🐶 Valpelogg
        </span>
      )}
      <div className="flex items-center gap-2">
        {rightSlot}
        {showLogout ? <LogoutButton /> : null}
      </div>
    </nav>
  );
}
