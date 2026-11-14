"use client";

import { useSyncExternalStore } from "react";
import { Toaster } from "sonner";

function subscribe(onStoreChange: () => void) {
  const mo = new MutationObserver(onStoreChange);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => mo.disconnect();
}

function getTheme(): "light" | "dark" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function AppToaster() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as const);

  return (
    <Toaster
      theme={theme}
      position="bottom-right"
      closeButton
      expand
      visibleToasts={5}
      duration={4200}
      gap={8}
      offset={16}
      mobileOffset={{ bottom: 16, right: 12 }}
      toastOptions={{
        classNames: {
          toast: "font-[family-name:var(--font-manrope)] !text-sm",
        },
      }}
    />
  );
}
