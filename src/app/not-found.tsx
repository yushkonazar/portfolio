import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageTexture } from "@/components/page-texture";
import { SiteBackground } from "@/components/site-background";
import { manrope } from "./fonts";
import "./globals.css";

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
    <html lang="en" className={manrope.variable}>
      <body>
        {/* Texture first, then the traces over it — the same order the locale
            layout stacks them in. */}
        <PageTexture />
        <SiteBackground />

        <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-20">
          {/* The artwork's own box, clipping it. `overflow-hidden` has to be here:
              the image is wider than this on purpose, so the cloud reads as
              continuing past the frame, and with nothing clipping it the page
              gained a horizontal scrollbar. */}
          <div className="relative flex h-[300px] w-full items-center justify-center overflow-hidden sm:h-[380px]">
            {/* Keyed, trimmed and centred rather than used as it arrived.

                It came 2608x1600 and 6.3MB with an opaque painted checkerboard
                behind it — the alpha channel was there and every pixel in it was
                255. Every empty corner topped out at luminance 24 while the
                content runs to 255, with 91% of pixels below 32 and a flat tail
                above, so the background keys out on a ramp from 24 to 48. RGB is
                left as it was: the antialiased edges keep their dark-mixed
                colour, which is invisible against a near-black page and saves
                un-premultiplying every one of them.

                Trimming to the content's bounding box is what left it looking
                shifted. The box is stretched by a few thin trace lines reaching
                further right than anything else, so the dense cloud sat left of
                the middle of it — measured, the outer fifth of the width carried
                3.7% of the mass. It is now cropped symmetrically about the
                midpoint of the span holding the middle 90% of the alpha mass,
                which puts the visual centre at 49.9% and keeps 99.6% of it.

                Held at 70%: at full strength its lettering asks to be read, and
                it is a surface rather than a text. */}
            <Image
              src="/404-debris.webp"
              alt=""
              aria-hidden
              width={860}
              height={610}
              priority
              className="pointer-events-none absolute top-1/2 left-1/2 w-[118%] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-70 select-none"
            />
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
