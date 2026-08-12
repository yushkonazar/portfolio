import type { ReactNode } from "react";

/**
 * Shared parts of the three Open Graph cards. They were the plainest thing the
 * project shipped — a system font on a flat field with one radial — while being
 * the first pixels anyone sees of it, in a Telegram or LinkedIn preview, before
 * deciding whether to click at all. So: the site's own typeface, a hint of its
 * block texture, and one routed trace at the lattice angle the canvas uses.
 */

export const OG_SIZE = { width: 1200, height: 630 };

/**
 * No stable URL exists for a Google-hosted font file — the path carries a
 * version (…/manrope/v20/…) that rotates. The CSS endpoint always names the
 * current one, and an old User-Agent makes it hand back WOFF instead of WOFF2,
 * which matters because satori reads the former and not the latter.
 */
const FONT_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Manrope:wght@400;700";
const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/26.0.1410.63 Safari/537.36";

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
};

let pending: Promise<OgFont[]> | undefined;

/**
 * Fetched once per worker instance rather than once per card: the bytes are
 * immutable and all three routes want the same two files.
 *
 * Returns an empty array on any failure. A card in the fallback font is worse
 * than one in Manrope; a card that throws is no card at all, and a link preview
 * that fails is worse than a plain one.
 */
export function manropeFonts(): Promise<OgFont[]> {
  pending ??= loadManropeFonts().catch(() => []);
  return pending;
}

async function loadManropeFonts(): Promise<OgFont[]> {
  const response = await fetch(FONT_CSS_URL, {
    headers: { "User-Agent": LEGACY_UA },
  });
  if (!response.ok) return [];

  const css = await response.text();

  // Each weight is read out of its own @font-face block rather than by position
  // in the file. The two do line up today, but nothing in the CSS spec or in
  // Google's contract says the blocks arrive in the order they were asked for,
  // and getting it wrong would render bold copy in regular and vice versa.
  const requested = [400, 700];
  const faces = css
    .split("@font-face")
    .slice(1)
    .flatMap((block) => {
      const weight = Number(/font-weight:\s*(\d+)/.exec(block)?.[1]);
      const url = /src:\s*url\((\S+?)\)/.exec(block)?.[1];
      if (!url || !requested.includes(weight)) return [];
      return [{ weight: weight as 400 | 700, url }];
    });

  const files = await Promise.all(
    faces.map(async ({ weight, url }) => {
      const file = await fetch(url);
      if (!file.ok) return null;
      return {
        name: "Manrope",
        data: await file.arrayBuffer(),
        weight,
        style: "normal" as const,
      };
    }),
  );

  return files.filter((file): file is OgFont => file !== null);
}

/**
 * Hand-placed rather than random: these cards are cached by every platform that
 * scrapes them, so a different arrangement per build would be churn nobody
 * sees. Values are x/y/width/height in the 1200x630 frame.
 */
const BLOCKS = [
  [0, 470, 190, 160],
  [190, 530, 120, 100],
  [860, 0, 150, 130],
  [1010, 0, 190, 92],
  [1060, 470, 140, 160],
  [930, 560, 130, 70],
  [310, 596, 90, 34],
];

/**
 * The frame every card sits in: background, texture, trace, radial. Children
 * are the copy, laid out in a column and vertically centred — the same layout
 * for the home, resume and project variants.
 */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundColor: "#050505",
        padding: "96px",
        position: "relative",
      }}
    >
      {BLOCKS.map(([x, y, width, height]) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x,
            top: y,
            width,
            height,
            backgroundColor: "rgba(250,250,250,0.028)",
            display: "flex",
          }}
        />
      ))}

      {/* One trace at the 45° the canvas routes on, kept to the right half. Run
          across the full frame it passed through the wordmark and read as a
          scratch on the card rather than a line under it. */}
      <div
        style={{
          position: "absolute",
          left: 960,
          top: 30,
          width: 2,
          height: 640,
          backgroundColor: "rgba(245,158,11,0.32)",
          transform: "rotate(45deg)",
          display: "flex",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: -140,
          right: -140,
          width: 520,
          height: 520,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(217,119,6,0.38) 0%, rgba(5,5,5,0) 70%)",
          display: "flex",
        }}
      />

      {children}
    </div>
  );
}
