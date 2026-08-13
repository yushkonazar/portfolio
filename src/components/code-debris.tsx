/**
 * The 404's centrepiece: a path that didn't resolve, shown as the code for it
 * coming apart.
 *
 * Placement is computed rather than hand-listed, and computed once at module
 * load rather than per render. Forty-odd fragments typed out by hand would be
 * forty numbers nobody could adjust — moving the cloud would mean editing all of
 * them — while `Math.random()` at render time would give a server and a client
 * two different clouds and a hydration mismatch, and a different cloud per build
 * for a page that is prerendered.
 *
 * So: a golden-angle spiral. Successive fragments land ~137.5° apart, which is
 * the arrangement that never repeats a spoke — the reason it turns up in
 * sunflowers — so the scatter reads as thrown rather than as a pattern, while
 * being the same scatter every time.
 */

/** Real fragments of the lookup that failed, so the debris says something. */
const SOURCE = [
  "func.resolve(path)",
  "if (!page) {",
  "  return notFound()",
  "}",
  "const slug = segments",
  "  .filter(Boolean)",
  "  .join('/')",
  "match(routes, slug)",
  "throw new NotFound(",
  "404",
  "await params",
  "generateStaticParams()",
  "locale ?? default",
  "// no such route",
  "pathname.split('/')",
  "return null",
  "catch (error) {",
  "status: 404",
  "revalidate = false",
  "segments.at(-1)",
  "!routes.has(key)",
  "resolve → miss",
];

type Fragment = {
  text: string;
  /** Percentages of the field, so the cloud scales with its container. */
  x: number;
  y: number;
  rotate: number;
  size: number;
  opacity: number;
  ember: boolean;
};

const COUNT = 46;
/** 137.5° in radians — the angle that keeps successive items off each other's
 * spokes no matter how many there are. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/**
 * Wider than tall by this much. The field sits behind a line of text, so a
 * circular cloud would pile density above and below the words where it competes
 * with them, and leave the ends of the line bare.
 */
const SPREAD_X = 2.15;

const FRAGMENTS: Fragment[] = Array.from({ length: COUNT }, (_, i) => {
  const angle = i * GOLDEN;
  // sqrt, not linear: equal-area rings, so the middle stays dense and the outside
  // thins out instead of the whole cloud being evenly sparse.
  const radius = 3 + Math.sqrt(i / COUNT) * 44;
  const near = 1 - radius / 47;

  return {
    text: SOURCE[i % SOURCE.length],
    x: 50 + Math.cos(angle) * radius * SPREAD_X,
    y: 50 + Math.sin(angle) * radius,
    // Leaning along its own way out from the centre, damped so nothing ends up
    // sideways and unreadable.
    rotate: ((angle * 180) / Math.PI) % 47 - 23,
    // The inner fragments have to be readable — a cloud of illegible specks is
    // texture, and the point is that this is the code that failed. At 7px, which
    // is where the first pass put them, none of it was.
    size: 9 + near * 9,
    // Brightest at the break, fading to almost nothing at the edges.
    opacity: 0.14 + near * 0.7,
    // Two in three carry the ember; the rest are near-white, which is what keeps
    // the cloud from reading as one flat wash of orange.
    ember: i % 3 !== 0,
  };
  // Centres only, so a fragment near the edge is still clipped by the field and
  // the cloud reads as continuing past it. This drops the ones that would land
  // wholly outside and cost markup for nothing.
}).filter((f) => f.x > -6 && f.x < 106 && f.y > -4 && f.y < 104);

/**
 * The number itself, built out of code rather than set in a typeface.
 *
 * A dot matrix, one token per lit cell — the shape of a seven-row display, which
 * is what a machine reports a status code on. Drawn this way it belongs to the
 * debris around it instead of being a large glyph sitting in front of it, and it
 * stays type: no raster to ship, crisp at any zoom, and it takes the accent from
 * the theme like everything else.
 */
const GLYPHS: Record<string, number[][]> = {
  "4": [
    [0, 0, 1, 1, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 1, 0],
  ],
  "0": [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
};

/**
 * Three characters at the most, and that is a hard limit rather than a
 * preference: a token has to sit inside its own cell or the digits blur back into
 * noise. A monospaced advance is ~0.6em, so n characters need 0.6n x the size,
 * and the size is a fraction of the cell — see the ratio below. `null` was in
 * here and inked 27.7px in a 21px cell.
 */
const TOKENS = [
  "404", "if", "{}", "->", "!", "?", "/", "..", "[]", "NaN", "nil",
  "err", "0x", "x", "()", "==",
];

const DIGITS = ["4", "0", "4"];
const GLYPH_W = 5;
const GLYPH_H = 7;
/** One blank column between digits. */
const COLUMNS = DIGITS.length * GLYPH_W + (DIGITS.length - 1);

type Cell = { token: string; col: number; row: number; ember: boolean };

const CELLS: Cell[] = DIGITS.flatMap((digit, d) => {
  const grid = GLYPHS[digit];
  const offset = d * (GLYPH_W + 1);
  const out: Cell[] = [];
  for (let row = 0; row < GLYPH_H; row++) {
    for (let col = 0; col < GLYPH_W; col++) {
      if (!grid[row][col]) continue;
      // Indexed off the position rather than a counter, so the same cell always
      // gets the same token however the glyphs are edited.
      const seed = (offset + col) * 7 + row * 3;
      out.push({
        token: TOKENS[seed % TOKENS.length],
        col: offset + col + 1,
        row: row + 1,
        ember: seed % 4 !== 0,
      });
    }
  }
  return out;
});

export function CodeNumeral({ className }: { className?: string }) {
  return (
    <p
      className={className}
      aria-label="404"
      role="img"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${COLUMNS}, var(--cell))`,
        gridTemplateRows: `repeat(${GLYPH_H}, var(--cell))`,
        fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
        lineHeight: 1,
      }}
    >
      {CELLS.map((cell) => (
        <span
          key={`${cell.col}-${cell.row}`}
          aria-hidden
          className={cell.ember ? "text-accent-bright" : "text-white"}
          style={{
            gridColumn: cell.col,
            gridRow: cell.row,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // 0.55 is a ceiling, not a taste: TOKENS caps at three characters
            // and a monospaced advance is ~0.6em, so 1.8 x the size has to fit
            // the cell — 1.8 x 0.55 = 0.99 of it. At 0.42, where this started,
            // the tokens came out at 7.5px and the "made of code" half of the
            // idea was invisible.
            fontSize: "calc(var(--cell) * 0.55)",
            // Brighter than the cloud it sits in: this is the thing being read,
            // the debris is the thing being glanced at.
            opacity: cell.ember ? 0.94 : 0.8,
            whiteSpace: "nowrap",
          }}
        >
          {cell.token}
        </span>
      ))}
    </p>
  );
}

export function CodeDebris() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden select-none"
    >
      {FRAGMENTS.map((f, i) => (
        <span
          key={`${i}-${f.text}`}
          className={f.ember ? "text-accent-bright" : "text-white"}
          style={{
            position: "absolute",
            left: `${f.x}%`,
            top: `${f.y}%`,
            fontSize: `${f.size}px`,
            opacity: f.opacity,
            // The translate centres each fragment on its own point; without it
            // `left`/`top` would place its corner there and the cloud would
            // drift down and right of where it was computed.
            transform: `translate(-50%, -50%) rotate(${f.rotate}deg)`,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-jetbrains-mono), ui-monospace, monospace",
            letterSpacing: "0.02em",
          }}
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
