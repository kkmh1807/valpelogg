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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nb"
      className={`${fraunces.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-ink">
        {isDemoMode ? <DemoBanner /> : null}
        {children}
      </body>
    </html>
  );
}
