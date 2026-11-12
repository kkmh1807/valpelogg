import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { DemoBanner } from "@/components/DemoBanner";
import { isDemoMode } from "@/lib/config";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valpelogg",
  description: "Enkel dagbok for valpens lur, turer og måltider.",
};

const themeInitScript = `
(() => {
  try {
    const key = 'valpelogg-theme';
    const stored = localStorage.getItem(key);
    const theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nb"
      suppressHydrationWarning
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col text-ink">
        {isDemoMode ? <DemoBanner /> : null}
        {children}
      </body>
    </html>
  );
}
