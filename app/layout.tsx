/**
 * ============================================================
 * app/layout.tsx — The frame around every page
 * ============================================================
 * WHAT THIS FILE DOES:
 * In Next.js, layout.tsx wraps every page of the app. It's where
 * we load fonts once and set the browser-tab title.
 *
 * CONCEPT: next/font downloads Google Fonts at BUILD time and
 * serves them from our own app — faster for patients, and the
 * page never "flashes" with a fallback font.
 * ============================================================
 */

import type { Metadata } from "next";
import { Bricolage_Grotesque, Figtree, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// Three fonts, three jobs:
// display = personality (headlines), body = readability, mono = data (times)
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
});
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "BrightSmile Dental — Book with Maya",
  description: "Book your dental appointment in a 30-second conversation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* The font variables become available to all CSS via var(--font-...) */}
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {children}
      </body>
    </html>
  );
}
