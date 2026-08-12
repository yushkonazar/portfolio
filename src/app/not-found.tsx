import type { Metadata } from "next";
import Link from "next/link";
import { PageTexture } from "@/components/page-texture";
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
//
// Hence both languages at once rather than a chosen one. Reading NEXT_LOCALE
// would answer the question properly, but only by paying that same price for
// the one page nobody means to land on. Two short paragraphs cost nothing and
// are honest about not knowing who arrived.
export default function NotFound() {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        {/* Texture first, then the traces over it — the same order the locale
            layout stacks them in, so a 404 sits on the same surface as the
            rest of the site instead of on bare black. */}
        <PageTexture />
        <SiteBackground />
        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-24 text-center">
          <p className="text-[76px] leading-none font-extrabold tracking-[-0.045em]">
            404
          </p>

          <div>
            <h1 className="mt-2.5 text-base font-medium md:text-lg">
              This page cracked off somewhere.
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              The link may be old, or I moved the page. The work is all one
              click away.
            </p>
          </div>

          <div aria-hidden className="mt-5 h-px w-10 bg-white/15" />

          <div lang="uk" className="mt-5">
            <p className="text-base font-medium md:text-lg">
              Ця сторінка десь відкололася.
            </p>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              Можливо, посилання застаріле, або я переніс сторінку. Усі проєкти
              — за один клік.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/"
              className="bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright flex h-11 items-center rounded-lg px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Back home <span className="mx-1.5 opacity-50">·</span>
              <span lang="uk">На головну</span>
            </Link>
            <Link
              href="/#work"
              className="border-border hover:border-muted-foreground focus-visible:outline-accent-bright flex h-11 items-center rounded-lg border px-[18px] text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              See the projects <span className="mx-1.5 opacity-50">·</span>
              <span lang="uk">До проєктів</span>
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
