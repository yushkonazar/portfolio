"use client";

import { useEffect, useRef } from "react";

/**
 * Fracture backdrop: hairline cracks that burst from a point, propagate
 * outward, hold, then close. Each fissure is finite — nothing loops forever.
 *
 * Two modes. Default: fills the viewport, fixed behind the whole page.
 * `scoped`: fills the nearest positioned ancestor instead — used to confine
 * the same animation to the hero band on the home page, so it can share the
 * fold with real content instead of running full-bleed behind it.
 *
 * Started from a real reference (a stock "surface impact crack" clip,
 * examined frame by frame), then tuned away from it on direct feedback:
 * slower growth, gentler turns, and branching spread
 * evenly along the whole trace rather than concentrated near the burst
 * point. It's still thin and roughly constant-width rather than a tapered
 * opening, and jagged — short straight-ish runs meeting at sharp angles, not
 * a smooth curve. The anti-coil bend budget and arrest-on-contact carry over
 * unchanged: those solved real structural problems independent of pacing or
 * branch density.
 */

type Point = { x: number; y: number };

type Phase = "growing" | "holding" | "fading";

type Fissure = {
  points: Point[];
  angle: number;
  /** Indices into `points` where the trace took a corner — drawn as junctions. */
  corners: number[];
  stepsToTurn: number;
  netTurn: number;
  grown: number;
  target: number;
  pending: number;
  depth: number;
  grace: number; // steps before contact can arrest it
  phase: Phase;
  phaseElapsed: number;
  holdFor: number;
  speed: number;
  major: boolean;
  branchBudget: number;
  pulse: number; // -1 idle, else 0..1 along the fissure
};

type Flash = { x: number; y: number; elapsed: number };

const STEP = 6; // px between recorded vertices

/**
 * Routing, not fracture. A trace holds one heading for a long run and then
 * takes a corner of exactly 45° or 90° — never an arbitrary angle, never a
 * gradual bend. Those two rules are the whole difference between something
 * that reads as a crack in a surface and something that reads as a signal
 * path on a board, and they are why the earlier easing constant is gone: an
 * eased joint is precisely what a routed line does not have.
 */
const LATTICE = Math.PI / 4;
const TURN_CHOICES = [LATTICE, -LATTICE, LATTICE * 2, -LATTICE * 2];
/** Diagonals over right angles — a board of pure 90° corners looks like a maze. */
const TURN_45_PREFERENCE = 0.55;
/** Chance of ignoring the field and taking an arbitrary allowed corner, so the
 *  layout doesn't read as everything combing one way. */
const TURN_NOISE = 0.22;

// Long runs between corners. Short ones would read as a zigzag; a trace's
// character comes from committing to a direction.
const RUN_MIN_STEPS = 7;
const RUN_MAX_STEPS = 20;

const FIELD_SCALE = 0.0011; // spatial frequency of the long-range bias
const FIELD_DRIFT = 0.02;
// Bounds total bend so a trace can route around but never spiral. Enforced by
// discarding corner choices that would exceed it, rather than by damping the
// turn — damping would put the line back off the lattice.
const MAX_NET_TURN = Math.PI;

const POINTER_RADIUS = 260;
const POINTER_WEIGHT = 0.6; // how much the pointer biases the kink choice
const HEAT_RADIUS = 190;
const HEAT_BOOST = 0.6;

const ARREST_DISTANCE = 6; // px — a fissure stops when it meets another
const SELF_SKIP = 14; // own trailing vertices to ignore when testing contact
const CELL = 12; // spatial hash cell size

// Branching is uniform along the whole length (no taper toward the tip) —
// side branches should keep coming off the main trace for its entire run,
// not just near the burst point.
const BRANCH_CHANCE = 0.095;
/** Forks leave on the lattice too, or the branch gives the grid away. */
const BRANCH_TURNS = [LATTICE, LATTICE * 2];
const BRANCH_GRACE = 6;
const MAX_DEPTH = 2;
// Chance decides *where* a fissure forks; the budget decides *how many*
// times — without it a long trace forks enough on length alone to saturate
// the screen and the field never gets a quiet moment (measured last pass).
const BRANCH_BUDGET = 8;
const MAJOR_BRANCH_BUDGET = 11;
const MIN_SPLAY_LENGTH = 60;

const ARM_MIN = 2;
const ARM_MAX = 3;

const AMBIENT_BURSTS = 3; // concurrent burst clusters, not individual arms
const HARD_CAP = 34; // total arms across every live cluster

const FIRST_SPAWN_MS = 500;
// Shorter still on request — bursts should appear more often — while
// AMBIENT_BURSTS above still caps how many are ever live at once.
const SPAWN_MIN_MS = 950;
const SPAWN_MAX_MS = 1900;
const MAJOR_MIN_MS = 20000;
const MAJOR_MAX_MS = 40000;

// Slower and gentler than the reference clip's near-instant reveal — traded
// away deliberately on request, in favour of motion that reads as smoother.
const SPEED_MIN = 200;
const SPEED_MAX = 300;

const FADE_IN_MS = 90;
const HOLD_MIN_MS = 2800;
const HOLD_MAX_MS = 4600;
const FADE_OUT_MS = 2200;
const PULSE_MS = 950;
const FLASH_MS = 420;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function hexToRgb(hex: string, fallback: [number, number, number]) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!match) return fallback;
  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
  ] as [number, number, number];
}

function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/** Value noise with smoothstep interpolation — a very long-range bias only. */
function smoothNoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);

  return (
    a * (1 - ux) * (1 - uy) +
    b * ux * (1 - uy) +
    c * (1 - ux) * uy +
    d * ux * uy
  );
}

/** A *line* field: it carries an orientation but no sign. */
function fieldAngle(x: number, y: number, seconds: number) {
  const n = smoothNoise(
    x * FIELD_SCALE + seconds * FIELD_DRIFT,
    y * FIELD_SCALE - seconds * FIELD_DRIFT * 0.6,
  );
  return n * Math.PI;
}

function angleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

/** Pick whichever of the line's two directions is closer to the heading. */
function alignToLine(heading: number, orientation: number) {
  const forward = angleDelta(heading, orientation);
  const backward = angleDelta(heading, orientation + Math.PI);
  return Math.abs(forward) <= Math.abs(backward)
    ? heading + forward
    : heading + backward;
}

function createFissure(
  origin: Point,
  angle: number,
  target: number,
  depth: number,
  major = false,
  grace = 0,
): Fissure {
  return {
    points: [origin],
    // Snapped on the way in, so every arm starts on the lattice no matter
    // which spawn path produced it — bursts, majors and forks alike.
    angle: Math.round(angle / LATTICE) * LATTICE,
    corners: [],
    stepsToTurn: Math.floor(randomBetween(RUN_MIN_STEPS, RUN_MAX_STEPS)),
    netTurn: 0,
    grown: 0,
    target,
    pending: 0,
    depth,
    grace,
    phase: "growing",
    phaseElapsed: 0,
    holdFor: randomBetween(HOLD_MIN_MS, HOLD_MAX_MS) * (major ? 1.6 : 1),
    speed: randomBetween(SPEED_MIN, SPEED_MAX) * (major ? 0.75 : 1),
    major,
    branchBudget: major ? MAJOR_BRANCH_BUDGET : BRANCH_BUDGET,
    pulse: -1,
  };
}

function fissureAlpha(fissure: Fissure) {
  if (fissure.phase === "growing") {
    return Math.min(1, fissure.phaseElapsed / FADE_IN_MS);
  }
  if (fissure.phase === "fading") {
    return Math.max(0, 1 - fissure.phaseElapsed / FADE_OUT_MS);
  }
  return 1;
}

type SiteBackgroundProps = {
  /** Fill the nearest positioned ancestor instead of the viewport. */
  scoped?: boolean;
  /** Bias ambient bursts (and major-fissure origins) to the right half —
   * keeps them off text that sits on the left, e.g. a hero headline. */
  region?: "right";
  /** Concurrent burst clusters. Default 3; a hero-scoped instance uses fewer. */
  bursts?: number;
  /** Total live arms across every cluster. Default 34. */
  cap?: number;
};

export function SiteBackground({
  scoped = false,
  region,
  bursts = AMBIENT_BURSTS,
  cap = HARD_CAP,
}: SiteBackgroundProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas: HTMLCanvasElement = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;
    const ctx: CanvasRenderingContext2D = context;

    const styles = getComputedStyle(document.documentElement);
    const [ar, ag, ab] = hexToRgb(
      styles.getPropertyValue("--color-accent"),
      [217, 119, 6],
    );
    const [br, bg, bb] = hexToRgb(
      styles.getPropertyValue("--color-accent-bright"),
      [245, 158, 11],
    );

    let width = 0;
    let height = 0;
    let elapsedSeconds = 0;
    let nextSpawnIn = FIRST_SPAWN_MS;
    let nextMajorIn = randomBetween(MAJOR_MIN_MS, MAJOR_MAX_MS);
    let rafId = 0;
    let lastTime = 0;
    let liveArms = 0;
    let visible = true;

    const fissures: Fissure[] = [];
    const flashes: Flash[] = [];
    const pointer: Point = { x: -9999, y: -9999 };

    // Spatial hash of every live vertex, rebuilt each frame, used for the
    // arrest test.
    const grid = new Map<number, number[]>();
    const cellKey = (x: number, y: number) =>
      (Math.floor(x / CELL) + 8192) * 65536 + (Math.floor(y / CELL) + 8192);

    function rebuildGrid() {
      grid.clear();
      for (let c = 0; c < fissures.length; c++) {
        const points = fissures[c].points;
        for (let i = 0; i < points.length; i++) {
          const key = cellKey(points[i].x, points[i].y);
          let bucket = grid.get(key);
          if (!bucket) {
            bucket = [];
            grid.set(key, bucket);
          }
          // Packed as c * 2^16 + i to keep the buckets as flat number arrays.
          bucket.push(c * 65536 + i);
        }
      }
    }

    function touchesExisting(tip: Point, ownIndex: number, ownCount: number) {
      const cx = Math.floor(tip.x / CELL);
      const cy = Math.floor(tip.y / CELL);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get(
            (cx + ox + 8192) * 65536 + (cy + oy + 8192),
          );
          if (!bucket) continue;
          for (const packed of bucket) {
            const c = packed >>> 16;
            const i = packed & 0xffff;
            if (c === ownIndex && ownCount - i <= SELF_SKIP) continue;
            const other = fissures[c]?.points[i];
            if (!other) continue;
            const dx = other.x - tip.x;
            const dy = other.y - tip.y;
            if (dx * dx + dy * dy < ARREST_DISTANCE * ARREST_DISTANCE) {
              return true;
            }
          }
        }
      }
      return false;
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = scoped
        ? canvas.parentElement!.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }

    function addArm(
      origin: Point,
      angle: number,
      target: number,
      depth: number,
      major = false,
      grace = 0,
    ) {
      if (liveArms >= cap) return;
      fissures.push(createFissure(origin, angle, target, depth, major, grace));
      liveArms++;
    }

    /** A burst: several arms radiating from one point, the way a fracture
     * actually starts — not a single thread that occasionally forks. */
    function spawnBurstAt(x: number, y: number, minLen: number, maxLen: number) {
      const arms = Math.floor(randomBetween(ARM_MIN, ARM_MAX + 1));
      const base = Math.random() * Math.PI * 2;
      const step = (Math.PI * 2) / arms;
      for (let i = 0; i < arms; i++) {
        addArm(
          { x, y },
          base + i * step + randomBetween(-0.35, 0.35),
          randomBetween(minLen, maxLen),
          0,
          false,
          BRANCH_GRACE,
        );
      }
      flashes.push({ x, y, elapsed: 0 });
    }

    function spawnAmbient() {
      if (region === "right") {
        spawnBurstAt(
          randomBetween(width * 0.5, width * 0.98),
          randomBetween(0, height),
          130,
          340,
        );
        return;
      }
      const edgeBias = Math.random() < 0.6;
      const origin: Point = edgeBias
        ? {
            x:
              Math.random() < 0.5
                ? randomBetween(0, width * 0.3)
                : randomBetween(width * 0.7, width),
            y: randomBetween(0, height),
          }
        : { x: randomBetween(0, width), y: randomBetween(0, height) };
      spawnBurstAt(origin.x, origin.y, 130, 340);
    }

    function spawnMajor() {
      const fromStart = Math.random() < 0.5;
      const vertical = Math.random() < 0.4;
      const origin: Point = vertical
        ? {
            x:
              region === "right"
                ? randomBetween(width * 0.5, width)
                : randomBetween(0, width),
            y: fromStart ? -20 : height + 20,
          }
        : { x: fromStart ? -20 : width + 20, y: randomBetween(0, height) };

      const toCentre = Math.atan2(height / 2 - origin.y, width / 2 - origin.x);
      addArm(
        origin,
        toCentre + randomBetween(-0.3, 0.3),
        Math.hypot(width, height) * randomBetween(0.65, 0.95),
        0,
        true,
      );
    }

    function spawnClickBurst(x: number, y: number) {
      spawnBurstAt(x, y, 160, 420);
    }

    /**
     * Choose the corner to take. The field and the pointer still say which
     * heading is *preferred* — that is what gives the whole screen a shared
     * grain — but they can no longer bend the line to an arbitrary angle.
     * Instead the preference only decides which of the four legal corners
     * gets taken, so every segment stays on the lattice.
     *
     * The pointer biases which side the corner leans toward, never the tip's
     * position: attracting the position is what would make a trace orbit the
     * cursor and coil.
     */
    function chooseTurn(fissure: Fissure, tip: Point) {
      let bias = fieldAngle(tip.x, tip.y, elapsedSeconds);
      bias = alignToLine(fissure.angle, bias);

      const dx = tip.x - pointer.x;
      const dy = tip.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER_RADIUS && distance > 1) {
        const radial = Math.atan2(dy, dx);
        const weight = (1 - distance / POINTER_RADIUS) * POINTER_WEIGHT;
        bias += angleDelta(bias, alignToLine(bias, radial)) * weight;
      }

      const legal = TURN_CHOICES.filter(
        (turn) => Math.abs(fissure.netTurn + turn) <= MAX_NET_TURN,
      );
      if (legal.length === 0) return 0;

      if (Math.random() < TURN_NOISE) {
        return legal[Math.floor(Math.random() * legal.length)];
      }

      let best = legal[0];
      let bestScore = Infinity;
      for (const turn of legal) {
        // Distance from the preferred heading, discounted for diagonals so
        // they win ties and the layout doesn't end up all right angles.
        const off = Math.abs(angleDelta(fissure.angle + turn, bias));
        const score =
          off - (Math.abs(turn) < LATTICE * 1.5 ? TURN_45_PREFERENCE : 0);
        if (score < bestScore) {
          bestScore = score;
          best = turn;
        }
      }
      return best;
    }

    function step(fissure: Fissure, tip: Point) {
      fissure.stepsToTurn--;
      if (fissure.stepsToTurn > 0) return;

      // The corner happens in one step, not eased across several. This is the
      // line that decides whether the result reads as routed or as cracked.
      const turn = chooseTurn(fissure, tip);
      fissure.netTurn += turn;
      fissure.angle += turn;
      fissure.stepsToTurn = Math.floor(
        randomBetween(RUN_MIN_STEPS, RUN_MAX_STEPS),
      );
      if (turn !== 0) fissure.corners.push(fissure.points.length);
    }

    function advance(fissure: Fissure, index: number, deltaMs: number) {
      fissure.phaseElapsed += deltaMs;

      if (fissure.pulse >= 0) {
        fissure.pulse += deltaMs / PULSE_MS;
        if (fissure.pulse > 1) fissure.pulse = -1;
      }

      if (fissure.phase === "holding") {
        if (fissure.phaseElapsed >= fissure.holdFor) {
          fissure.phase = "fading";
          fissure.phaseElapsed = 0;
        }
        return;
      }

      if (fissure.phase !== "growing") return;

      fissure.pending += (fissure.speed * deltaMs) / 1000;

      while (fissure.pending >= STEP) {
        fissure.pending -= STEP;

        const last = fissure.points[fissure.points.length - 1];
        step(fissure, last);

        const next = {
          x: last.x + Math.cos(fissure.angle) * STEP,
          y: last.y + Math.sin(fissure.angle) * STEP,
        };

        // A fracture cannot cross a free surface: meeting another trace ends
        // it. Forks that curve back into their parent terminate on it, which
        // is how the strands come to anastomose.
        if (fissure.grace > 0) {
          fissure.grace--;
        } else if (touchesExisting(next, index, fissure.points.length)) {
          fissure.phase = "holding";
          fissure.phaseElapsed = 0;
          fissure.target = fissure.grown;
          break;
        }

        fissure.points.push(next);
        fissure.grown += STEP;

        // Flat probability along the whole run — no tapering by distance
        // from the burst point, on request: side branches should keep
        // coming off the main trace for its entire length.
        const canBranch =
          fissure.depth < MAX_DEPTH &&
          fissure.branchBudget > 0 &&
          liveArms < cap &&
          Math.random() < BRANCH_CHANCE;

        if (canBranch) {
          fissure.branchBudget--;
          const spread =
            BRANCH_TURNS[Math.floor(Math.random() * BRANCH_TURNS.length)] *
            (Math.random() < 0.5 ? 1 : -1);
          // Where a fork leaves the parent is a junction on the parent too.
          fissure.corners.push(fissure.points.length - 1);
          addArm(
            { ...next },
            fissure.angle + spread,
            Math.max(
              MIN_SPLAY_LENGTH,
              fissure.target * randomBetween(0.3, 0.55),
            ),
            fissure.depth + 1,
            false,
            BRANCH_GRACE,
          );
        }

        if (fissure.grown >= fissure.target) {
          fissure.phase = "holding";
          fissure.phaseElapsed = 0;
          if (fissure.major) fissure.pulse = 0;
          break;
        }
      }
    }

    function heatFor(fissure: Fissure) {
      let nearest = Infinity;
      for (const point of fissure.points) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        const distance = dx * dx + dy * dy;
        if (distance < nearest) nearest = distance;
      }
      const falloff = 1 - Math.min(1, Math.sqrt(nearest) / HEAT_RADIUS);
      return 1 + HEAT_BOOST * falloff;
    }

    function centreline(fissure: Fissure) {
      const points = fissure.points;
      const path = new Path2D();
      path.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i].x, points[i].y);
      }
      return path;
    }

    function glowAt(x: number, y: number, radius: number, alpha: number) {
      const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
      glow.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, ${alpha})`);
      glow.addColorStop(1, `rgba(${br}, ${bg}, ${bb}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    /**
     * A pad at a corner. Small, and deliberately drawn dark-cored with a lit
     * rim rather than as a solid dot: a filled blob at every turn would add up
     * to far more bright area than the contrast budget allows, and it would
     * read as beads on a string instead of hardware.
     */
    function junctionAt(x: number, y: number, scale: number, alpha: number) {
      const r = 2.3 * scale;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(20, 14, 10, ${0.9 * alpha})`;
      ctx.fill();
      ctx.lineWidth = 1.1 * scale;
      ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.5 * alpha})`;
      ctx.stroke();
    }

    // Width by generation: the main line reads as the thicker trace, each
    // fork starting noticeably thinner than its parent.
    const DEPTH_SCALE = [1, 0.72, 0.52];
    // Base stroke widths (glow / dark core / ember), before depth+major
    // scaling — bumped up twice now on direct "thicker" feedback.
    const GLOW_WIDTH = 11;
    const CORE_WIDTH = 3.2;
    const EMBER_WIDTH = 1.7;

    function strokeLayers(x1: number, y1: number, x2: number, y2: number, w: number, alpha: number) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = GLOW_WIDTH * w;
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.05 * alpha})`;
      ctx.stroke();
      ctx.lineWidth = CORE_WIDTH * w;
      ctx.strokeStyle = `rgba(20, 14, 10, ${0.85 * alpha})`;
      ctx.stroke();
      ctx.lineWidth = EMBER_WIDTH * w;
      ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.55 * alpha})`;
      ctx.stroke();
    }

    function draw(fissure: Fissure) {
      const points = fissure.points;
      if (points.length < 2) return;

      const alpha = Math.min(1.2, fissureAlpha(fissure) * heatFor(fissure));
      if (alpha <= 0) return;

      const isRoot = fissure.depth === 0;
      const depthScale = DEPTH_SCALE[Math.min(fissure.depth, DEPTH_SCALE.length - 1)];
      const baseScale = (fissure.major ? 1.9 : 1) * depthScale;

      if (isRoot) {
        // The main line: a solid width along its whole run.
        const spine = centreline(fissure);
        ctx.lineWidth = GLOW_WIDTH * baseScale;
        ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.05 * alpha})`;
        ctx.stroke(spine);
        ctx.lineWidth = CORE_WIDTH * baseScale;
        ctx.strokeStyle = `rgba(20, 14, 10, ${0.85 * alpha})`;
        ctx.stroke(spine);
        ctx.lineWidth = EMBER_WIDTH * baseScale;
        ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.55 * alpha})`;
        ctx.stroke(spine);
      } else {
        // A branch: full width where it splits off the parent, thinning
        // toward its tip — it visibly loses thickness as it moves away
        // from where it started.
        const last = points.length - 1;
        for (let i = 1; i <= last; i++) {
          const w = baseScale * (1 - (i / last) * 0.7);
          strokeLayers(
            points[i - 1].x,
            points[i - 1].y,
            points[i].x,
            points[i].y,
            w,
            alpha,
          );
        }
      }

      // Junctions last, so a pad always sits on top of the trace it belongs to
      // rather than being half-covered by the next segment's stroke.
      for (const index of fissure.corners) {
        const point = points[index];
        if (point) junctionAt(point.x, point.y, baseScale, alpha);
      }

      if (fissure.phase === "growing") {
        const tip = points[points.length - 1];
        glowAt(tip.x, tip.y, 10 * baseScale, 0.45 * alpha);
      }

      if (fissure.pulse >= 0) {
        const index = Math.min(
          points.length - 1,
          Math.floor(fissure.pulse * (points.length - 1)),
        );
        const head = points[index];
        const fade = 1 - fissure.pulse;
        glowAt(head.x, head.y, 46, 0.4 * fade);
      }
    }

    function drawFlash(flash: Flash) {
      const progress = flash.elapsed / FLASH_MS;
      const fade = 1 - progress;
      glowAt(flash.x, flash.y, 20 + progress * 70, 0.4 * fade * fade);
    }

    function frame(time: number) {
      rafId = requestAnimationFrame(frame);

      const deltaMs = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      elapsedSeconds += deltaMs / 1000;

      nextSpawnIn -= deltaMs;
      const activeBursts = Math.ceil(liveArms / ((ARM_MIN + ARM_MAX) / 2));
      if (nextSpawnIn <= 0 && activeBursts < bursts) {
        spawnAmbient();
        nextSpawnIn = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS);
      }

      nextMajorIn -= deltaMs;
      if (nextMajorIn <= 0 && liveArms < cap) {
        spawnMajor();
        nextMajorIn = randomBetween(MAJOR_MIN_MS, MAJOR_MAX_MS);
      }

      ctx.clearRect(0, 0, width, height);
      rebuildGrid();

      for (let i = 0; i < fissures.length; i++) {
        advance(fissures[i], i, deltaMs);
        draw(fissures[i]);
      }

      for (let i = fissures.length - 1; i >= 0; i--) {
        const fissure = fissures[i];
        if (fissure.phase === "fading" && fissure.phaseElapsed >= FADE_OUT_MS) {
          fissures.splice(i, 1);
          liveArms--;
        }
      }

      for (let i = flashes.length - 1; i >= 0; i--) {
        const flash = flashes[i];
        flash.elapsed += deltaMs;
        drawFlash(flash);
        if (flash.elapsed >= FLASH_MS) flashes.splice(i, 1);
      }
    }

    function startLoop() {
      if (rafId || !visible || document.hidden) return;
      lastTime = 0;
      rafId = requestAnimationFrame(frame);
    }

    function stopLoop() {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }

    function onPointerMove(event: PointerEvent) {
      if (scoped) {
        const rect = canvas.getBoundingClientRect();
        pointer.x = event.clientX - rect.left;
        pointer.y = event.clientY - rect.top;
      } else {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (scoped) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        // A click elsewhere on the page shouldn't spawn a burst inside a
        // hero that happens to be scrolled off-screen.
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
        pointer.x = x;
        pointer.y = y;
        spawnClickBurst(x, y);
      } else {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        spawnClickBurst(event.clientX, event.clientY);
      }
    }

    function onVisibilityChange() {
      if (document.hidden) {
        stopLoop();
      } else {
        startLoop();
      }
    }

    resize();
    startLoop();

    let resizeObserver: ResizeObserver | undefined;
    let intersectionObserver: IntersectionObserver | undefined;

    if (scoped && canvas.parentElement) {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas.parentElement);

      // Several of these can exist on one page (or none, in the common
      // case) — no reason to keep simulating one that's scrolled away.
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          visible = entries[0].isIntersecting;
          if (visible) startLoop();
          else stopLoop();
        },
        { rootMargin: "200px" },
      );
      intersectionObserver.observe(canvas.parentElement);
    } else {
      window.addEventListener("resize", resize);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [scoped, region, bursts, cap]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={
        scoped
          ? "pointer-events-none absolute inset-0"
          : "pointer-events-none fixed inset-0 z-0"
      }
    />
  );
}
