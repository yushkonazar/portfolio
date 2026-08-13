import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { CodeDebris } from "@/components/code-debris";
import { PageTexture } from "@/components/page-texture";
import { SiteBackground } from "@/components/site-background";
import { manrope } from "./fonts";
import "./globals.css";

/**
 * This is the one page whose subject is code that didn't resolve, so it is set in
 * the face people write paths in. Cyrillic is included because the copy
 * alternates between two languages and one of them needs it — Latin-only would
 * drop the Ukrainian face to a fallback halfway through a crossfade.
 *
 * `preload: false` is the part that matters, and it took measuring to find. The
 * app builds to a single CSS chunk, so every @font-face declared anywhere lands
 * in the stylesheet every page loads, and Next emits a preload link for each —
 * which had the home page fetching 40KB of a mono it renders no character of.
 * Moving the declaration out of ./fonts and into this file changed nothing,
 * because the chunk is shared regardless of which module declared it. Without
 * the preload the face is still declared everywhere and fetched only where text
 * actually asks for it, which is here. `display: swap` covers the wait.
 */
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Page not found — Yushko Nazar",
  robots: { index: false, follow: true },
};

/** Both labels for one control, taking turns in place. */
function Bilingual({ en, uk }: { en: string; uk: string }) {
  return (
    <span className="locale-cycle-inline">
      <span>{en}</span>
      <span lang="uk">{uk}</span>
    </span>
  );
}

/*
 * Renders its own document. This sits outside the [locale] segment, so there's
 * no locale in scope and no translation context — resolving one here would make
 * every page in the app render dynamically, which costs far more than it buys.
 *
 * Hence both languages, but taking turns rather than stacked: whichever one a
 * given reader can't use was noise sitting directly under the one they can.
 * Reading NEXT_LOCALE would answer the question properly, and only by paying
 * that price for the one page nobody means to land on.
 *
 * The page is about a path that didn't resolve, so it shows the code for that
 * coming apart, and sets it in the face people write paths in. The block field
 * and the traces underneath are the site's own, not this page's — a 404 belongs
 * on the same surface as everything else.
 */
export default function NotFound() {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Texture first, then the traces over it — the same order the locale
            layout stacks them in. */}
        <PageTexture />
        <SiteBackground />

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-20">
          {/* The debris and the numeral share this box, so the cloud is centred
              on the thing that broke. Its height is fixed rather than derived
              from the numeral: the fragments are positioned in percentages, and
              a box that hugged its text would collapse the whole spread onto one
              line. Overflow is clipped here rather than on <body>, which would
              take the page's own scrolling with it. */}
          <div className="relative flex h-[300px] w-full items-center justify-center sm:h-[380px]">
            <CodeDebris />

            {/* Just enough shade for the numeral to sit on, shaped to it rather
                than to the box. `closest-side` covered the whole field and put
                out the middle of the cloud — which is the brightest part of it,
                being where the break happened. An ellipse the size of the number
                clears the number and leaves the rest lit. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 42% 34% at 50% 50%, rgba(5,5,5,0.9) 0%, rgba(5,5,5,0.55) 52%, rgba(5,5,5,0) 82%)",
              }}
            />

            <p
              className="relative font-mono text-[96px] leading-none font-bold tracking-[-0.06em] sm:text-[132px]"
              style={{ fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace" }}
            >
              404
            </p>
          </div>

          {/* Pulled up into the bottom of the cloud, the way the sentence sits
              inside the spread rather than under it. */}
          <div className="locale-cycle relative -mt-6 text-center sm:-mt-8">
            <div>
              <h1 className="text-base font-medium md:text-lg">
                This page cracked off somewhere.
              </h1>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                The link may be old, or I moved the page. The work is all one
                click away.
              </p>
            </div>

            {/* The heading has to be one of the two: a page gets one h1 and this
                document's lang is en. The Ukrainian face carries the same
                sentence as a paragraph with its own lang, which is what a
                translated heading is when the heading is already spoken for. */}
            <div lang="uk">
              <p className="text-base font-medium md:text-lg">
                Ця сторінка десь відкололася.
              </p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                Можливо, посилання застаріле, або я переніс сторінку. Усі
                проєкти — за один клік.
              </p>
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/"
              className="bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright flex h-11 items-center rounded-lg px-5 text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Bilingual en="Back home" uk="На головну" />
            </Link>
            <Link
              href="/#work"
              className="border-border hover:border-muted-foreground focus-visible:outline-accent-bright flex h-11 items-center rounded-lg border px-[18px] text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Bilingual en="See the projects" uk="До проєктів" />
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
