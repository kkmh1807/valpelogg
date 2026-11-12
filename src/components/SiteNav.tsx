"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logoutAction } from "@/lib/logout-action";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function unlockScroll() {
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
}

function lockScroll() {
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";
}

type Props = {
  today: string;
  showLogout?: boolean;
};

function navLinks(today: string) {
  return [
    { href: "/", label: "Hjem", emoji: "🏠" },
    { href: `/dag/${today}`, label: "Dagens logg", emoji: "✨" },
    { href: "/#kalender", label: "Kalender", emoji: "📅" },
    { href: "/#statistikk", label: "Statistikk", emoji: "📊" },
  ] as const;
}

export function SiteNav({ today, showLogout = false }: Props) {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const pathname = usePathname();
  const panelId = useId();

  // Unlock scroll + jump to top after route changes
  useEffect(() => {
    unlockScroll();
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      unlockScroll();
      return;
    }

    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        unlockScroll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open]);

  useEffect(() => {
    return () => {
      unlockScroll();
    };
  }, []);

  function close() {
    setOpen(false);
    unlockScroll();
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/dag/")) return pathname.startsWith("/dag/");
    return false;
  }

  const menu =
    mounted &&
    createPortal(
      <>
        <div
          className={`fixed inset-0 z-[80] bg-ink/45 transition-opacity duration-200 ${
            open ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={close}
          aria-hidden={!open}
        />

        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
          aria-label="Navigasjon"
          className={`fixed inset-y-0 right-0 z-[90] flex w-[min(100vw-2.5rem,20rem)] flex-col border-l border-pine/15 bg-surface-strong shadow-2xl transition-transform duration-200 ease-out ${
            open ? "translate-x-0" : "pointer-events-none translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-pine/10 px-4 py-4">
            <p className="font-[family-name:var(--font-fraunces)] text-xl text-pine-deep">
              Meny
            </p>
            <button
              type="button"
              className="btn btn-ghost min-h-11 px-3"
              onClick={close}
            >
              Lukke
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {navLinks(today).map((link) => {
              const active = isActive(link.href);
              const hash = link.href.includes("#")
                ? link.href.split("#")[1]
                : null;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  scroll={!hash}
                  onClick={(e) => {
                    if (hash && pathname === "/") {
                      e.preventDefault();
                      close();
                      window.requestAnimationFrame(() => {
                        document
                          .getElementById(hash)
                          ?.scrollIntoView({ behavior: "smooth" });
                      });
                      return;
                    }
                    close();
                  }}
                  className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-base font-semibold transition ${
                    active
                      ? "bg-pine/15 text-pine-deep"
                      : "text-ink active:bg-surface hover:bg-surface"
                  }`}
                >
                  <span aria-hidden className="text-xl">
                    {link.emoji}
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {showLogout ? (
            <div className="border-t border-pine/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="btn btn-secondary flex min-h-14 w-full items-center justify-start gap-3 px-4 text-base"
                  onClick={close}
                >
                  <span aria-hidden>🚪</span>
                  Logg ut
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </>,
      document.body,
    );

  return (
    <>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          className="btn btn-secondary flex h-11 min-w-11 items-center justify-center px-0"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Lukk meny" : "Åpne meny"}
          onClick={() => {
            setOpen((v) => {
              const next = !v;
              if (next) lockScroll();
              else unlockScroll();
              return next;
            });
          }}
        >
          <span className="relative block h-[14px] w-5" aria-hidden>
            <span
              className={`absolute left-0 top-0 block h-0.5 w-5 origin-center rounded-full bg-current transition duration-200 ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[6px] block h-0.5 w-5 rounded-full bg-current transition duration-200 ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[12px] block h-0.5 w-5 origin-center rounded-full bg-current transition duration-200 ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>
      {menu}
    </>
  );
}
