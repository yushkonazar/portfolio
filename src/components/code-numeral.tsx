/**
 * The 404's number, built out of code rather than set in a typeface.
 *
 * There was a generated cloud of fragments here too — a golden-angle spiral of
 * pseudo-code placed at module load. It is gone: the page now carries supplied
 * artwork for that layer, and two clouds behind one number was mush.
 */

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
