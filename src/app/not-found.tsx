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
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-24">
          <p className="text-accent-bright text-sm font-medium">404</p>
          <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            That page doesn&apos;t exist — it may have moved, or the link may be
            wrong.
          </p>
          <Link
            href="/"
            className="border-border hover:border-accent mt-8 inline-block w-fit rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          >
            Go to the homepage
          </Link>
        </main>
      </body>
    </html>
  );
}
