import type { Metadata } from "next";
import Link from "next/link";
import { SiteBackground } from "@/components/site-background";
import { manrope } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page not found — Yushko Nazar",
  robots: { index: false, follow: true },
};

// Renders its own document. This sits outside the [locale] segment, so there's
// no locale in scope and no translation context — resolving one here would make
// every page in the app render dynamically, which costs far more than it buys.
export default function NotFound() {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <SiteBackground />
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-[76px] leading-none font-extrabold tracking-[-0.045em]">
            404
          </p>
          <h1 className="mt-2.5 text-base font-medium md:text-lg">
            This page cracked off somewhere.
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
            The link may be old, or I moved the page. The work is all one click
            away.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/"
              className="bg-accent text-accent-foreground hover:bg-accent-bright flex h-11 items-center rounded-lg px-5 text-sm font-bold transition-colors"
            >
              Back home
            </Link>
            <Link
              href="/#work"
              className="border-border hover:border-muted-foreground flex h-11 items-center rounded-lg border px-[18px] text-sm font-semibold transition-colors"
            >
              See the projects
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
