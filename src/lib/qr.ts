/**
 * A QR encoder, written out rather than installed.
 *
 * Only the corner of ISO/IEC 18004 this site needs: byte mode, and only the
 * versions that carry a single error-correction block. That one restriction is
 * what keeps this file short — block interleaving is the fiddliest part of the
 * spec, and at these sizes there is nothing to interleave. The cost is a cap on
 * how long a link can be; see `QR_SPECS`.
 *
 * Pure and DOM-free on purpose: the card computes its matrix on the server and
 * ships geometry, so none of this reaches the browser.
 */

export type QrLevel = "L" | "M" | "Q" | "H";

export type QrCode = {
  /** Row-major, `true` is a dark module. */
  modules: boolean[][];
  /** Modules per side. */
  size: number;
  version: number;
  level: QrLevel;
};

type VersionSpec = {
  version: number;
  /** Data codewords. */
  data: number;
  /** Error-correction codewords. */
  ec: number;
  /** Longest byte payload that fits, after the mode and length headers. */
  capacity: number;
};

/**
 * Single-block versions only. Anything past these rows splits the payload
 * across two or more EC blocks and needs interleaving, which is deliberately
 * not implemented — the last row of a level is therefore its hard capacity.
 */
const QR_SPECS: Record<QrLevel, VersionSpec[]> = {
  L: [
    { version: 1, data: 19, ec: 7, capacity: 17 },
    { version: 2, data: 34, ec: 10, capacity: 32 },
    { version: 3, data: 55, ec: 15, capacity: 53 },
  ],
  M: [
    { version: 1, data: 16, ec: 10, capacity: 14 },
    { version: 2, data: 28, ec: 16, capacity: 26 },
    { version: 3, data: 44, ec: 26, capacity: 42 },
  ],
  Q: [
    { version: 1, data: 13, ec: 13, capacity: 11 },
    { version: 2, data: 22, ec: 22, capacity: 20 },
  ],
  H: [
    { version: 1, data: 9, ec: 17, capacity: 7 },
    { version: 2, data: 16, ec: 28, capacity: 14 },
  ],
};

/** Format-information bits per level — not the same order as the letters. */
const LEVEL_BITS: Record<QrLevel, number> = { M: 0, L: 1, H: 2, Q: 3 };

/** Byte mode. */
const MODE_INDICATOR = 0b0100;

/** Alternating filler once the payload and terminator run out. */
const PAD_BYTES = [0xec, 0x11];

/** The field this code's arithmetic lives in: GF(256) mod x⁸+x⁴+x³+x²+1. */
const GF_PRIMITIVE = 0x11d;

/** Generator and mask for the 15-bit BCH format string. */
const FORMAT_GENERATOR = 0x537;
const FORMAT_MASK = 0x5412;

/** The longest link a level can hold, for the input's own maxlength. */
export function qrCapacity(level: QrLevel): number {
  const specs = QR_SPECS[level];
  return specs[specs.length - 1].capacity;
}

function gfMultiply(a: number, b: number): number {
  let product = 0;
  for (let bit = 7; bit >= 0; bit--) {
    product = (product << 1) ^ ((product >>> 7) * GF_PRIMITIVE);
    product ^= ((b >>> bit) & 1) * a;
  }
  return product & 0xff;
}

/** Coefficients of (x−α⁰)(x−α¹)…(x−α^(degree−1)), highest power first. */
function generatorPolynomial(degree: number): number[] {
  const coefficients = new Array<number>(degree).fill(0);
  coefficients[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      coefficients[j] = gfMultiply(coefficients[j], root);
      if (j + 1 < degree) coefficients[j] ^= coefficients[j + 1];
    }
    root = gfMultiply(root, 2);
  }
  return coefficients;
}

/** The remainder that follows the data codewords. */
function errorCorrection(data: number[], degree: number): number[] {
  const generator = generatorPolynomial(degree);
  const remainder = new Array<number>(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ (remainder.shift() ?? 0);
    remainder.push(0);
    for (let i = 0; i < generator.length; i++) {
      remainder[i] ^= gfMultiply(generator[i], factor);
    }
  }
  return remainder;
}

/**
 * The eight mask patterns. A mask is XORed over every data module so the result
 * has no large flat areas and nothing that mimics a finder pattern; which one
 * wins is decided by `penalty` below, not by preference.
 */
const MASKS: ((x: number, y: number) => boolean)[] = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** The 1:1:3:1:1 run a decoder reads as a finder — heavily penalised elsewhere. */
const FINDER_RUN = [
  true, false, true, true, true, false, true, false, false, false, false,
];

/** The spec's four penalty rules. Lower is better. */
function penalty(grid: boolean[][], size: number): number {
  let score = 0;

  // Rule 1 — runs of five or more of one colour, in both directions.
  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x < size; x++) {
      if (grid[y][x] === grid[y][x - 1]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y < size; y++) {
      if (grid[y][x] === grid[y - 1][x]) {
        run++;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
  }

  // Rule 2 — every 2x2 block of one colour.
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const corner = grid[y][x];
      if (
        corner === grid[y][x + 1] &&
        corner === grid[y + 1][x] &&
        corner === grid[y + 1][x + 1]
      ) {
        score += 3;
      }
    }
  }

  // Rule 3 — anything that reads like a finder pattern, either way round.
  const finderLikeRuns = (at: (index: number) => boolean) => {
    let found = 0;
    for (let start = 0; start + FINDER_RUN.length <= size; start++) {
      let forward = true;
      let backward = true;
      for (let i = 0; i < FINDER_RUN.length; i++) {
        const value = at(start + i);
        if (value !== FINDER_RUN[i]) forward = false;
        if (value !== FINDER_RUN[FINDER_RUN.length - 1 - i]) backward = false;
      }
      if (forward) found++;
      if (backward) found++;
    }
    return found;
  };
  for (let y = 0; y < size; y++) score += 40 * finderLikeRuns((i) => grid[y][i]);
  for (let x = 0; x < size; x++) score += 40 * finderLikeRuns((i) => grid[i][x]);

  // Rule 4 — drift away from half dark.
  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (grid[y][x]) dark++;
  }
  const drift = Math.abs((dark * 100) / (size * size) - 50);
  return score + Math.floor(drift / 5) * 10;
}

/**
 * Returns null when the text is empty or longer than the level can carry —
 * both are for the caller to report, not for this function to guess around.
 */
export function encodeQr(text: string, level: QrLevel): QrCode | null {
  const bytes = Array.from(new TextEncoder().encode(text));
  if (bytes.length === 0) return null;

  const spec = QR_SPECS[level].find((row) => bytes.length <= row.capacity);
  if (!spec) return null;

  const size = 17 + 4 * spec.version;

  // ── Bit stream: mode, length, payload, terminator, padding ────────────────
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(MODE_INDICATOR, 4);
  // 8-bit character count is correct for byte mode up to version 9.
  push(bytes.length, 8);
  for (const byte of bytes) push(byte, 8);
  push(0, Math.min(4, spec.data * 8 - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  }
  for (let i = 0; codewords.length < spec.data; i++) {
    codewords.push(PAD_BYTES[i % PAD_BYTES.length]);
  }
  const payload = codewords.concat(errorCorrection(codewords, spec.ec));

  // ── Function patterns ─────────────────────────────────────────────────────
  const modules: boolean[][] = [];
  const reserved: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    modules.push(new Array<boolean>(size).fill(false));
    reserved.push(new Array<boolean>(size).fill(false));
  }
  const place = (x: number, y: number, dark: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    modules[y][x] = dark;
    reserved[y][x] = true;
  };

  for (let i = 0; i < size; i++) {
    place(6, i, i % 2 === 0);
    place(i, 6, i % 2 === 0);
  }

  // A finder is a 7x7 target plus its light separator, which the Chebyshev
  // distance describes in one line: dark at 0, 1 and 3, light at 2 and 4.
  const finder = (cx: number, cy: number) => {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        place(cx + dx, cy + dy, ring !== 2 && ring !== 4);
      }
    }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);

  // Versions 2–6 carry exactly one alignment pattern, opposite the finders.
  if (spec.version >= 2) {
    const centre = size - 7;
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        place(centre + dx, centre + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  const formatCells = formatPositions(size);
  for (const [x, y] of formatCells) reserved[y][x] = true;

  // ── Data, laid in the spec's two-wide zigzag ──────────────────────────────
  let bit = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    // Column 6 is the vertical timing pattern; the pair steps around it.
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      for (let offset = 0; offset < 2; offset++) {
        const x = right - offset;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - step : step;
        if (reserved[y][x] || bit >= payload.length * 8) continue;
        modules[y][x] = ((payload[bit >>> 3] >>> (7 - (bit & 7))) & 1) !== 0;
        bit++;
      }
    }
  }

  // ── Masking: try all eight, keep the least penalised ──────────────────────
  let best: boolean[][] | null = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < MASKS.length; mask++) {
    const candidate = modules.map((row) => row.slice());
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!reserved[y][x] && MASKS[mask](x, y)) candidate[y][x] = !candidate[y][x];
      }
    }
    writeFormat(candidate, size, level, mask);
    const score = penalty(candidate, size);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  if (!best) return null;

  return { modules: best, size, version: spec.version, level };
}

/** The 31 cells the format string occupies, in bit order and duplicated. */
function formatPositions(size: number): [number, number][] {
  const cells: [number, number][] = [];
  for (let i = 0; i <= 5; i++) cells.push([8, i]);
  cells.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i < 15; i++) cells.push([14 - i, 8]);
  for (let i = 0; i < 8; i++) cells.push([size - 1 - i, 8]);
  for (let i = 8; i < 15; i++) cells.push([8, size - 15 + i]);
  cells.push([8, size - 8]);
  return cells;
}

function writeFormat(
  grid: boolean[][],
  size: number,
  level: QrLevel,
  mask: number,
) {
  const data = (LEVEL_BITS[level] << 3) | mask;
  let remainder = data;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder << 1) ^ ((remainder >>> 9) * FORMAT_GENERATOR);
  }
  const format = ((data << 10) | remainder) ^ FORMAT_MASK;
  const at = (index: number) => ((format >>> index) & 1) !== 0;

  for (let i = 0; i <= 5; i++) grid[i][8] = at(i);
  grid[7][8] = at(6);
  grid[8][8] = at(7);
  grid[8][7] = at(8);
  for (let i = 9; i < 15; i++) grid[8][14 - i] = at(i);
  for (let i = 0; i < 8; i++) grid[8][size - 1 - i] = at(i);
  for (let i = 8; i < 15; i++) grid[size - 15 + i][8] = at(i);
  // The always-dark module beside the lower-left finder.
  grid[size - 8][8] = true;
}

/**
 * The three finder patterns are drawn as shapes rather than modules, so the
 * data path skips their 7x7 blocks entirely.
 */
export function isFinderModule(x: number, y: number, size: number): boolean {
  return (
    (x < 7 && y < 7) ||
    (x >= size - 7 && y < 7) ||
    (x < 7 && y >= size - 7)
  );
}

/**
 * One `<path>` for every data module, as touching circles.
 *
 * Radius is exactly half a module, so neighbours meet orthogonally and every
 * centre stays on the grid — which is the property a decoder actually samples.
 * Shape is free here precisely because it costs no error correction: it is
 * rendering, not encoding.
 */
export function qrDataPath(code: QrCode, quiet: number): string {
  const radius = 0.5;
  let path = "";
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size; x++) {
      if (!code.modules[y][x] || isFinderModule(x, y, code.size)) continue;
      const left = x + quiet + 0.5 - radius;
      const middle = y + quiet + 0.5;
      path += `M${left} ${middle}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
    }
  }
  return path;
}
