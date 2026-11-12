"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "valpelogg-theme";
const EVENT = "valpelogg-theme";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const handler = () => onChange();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      className="btn btn-secondary h-9 w-9 px-0 text-base"
      onClick={toggle}
      aria-label={theme === "dark" ? "Bytt til lyst tema" : "Bytt til mørkt tema"}
      title={theme === "dark" ? "Lyst tema" : "Mørkt tema"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
