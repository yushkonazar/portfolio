"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide backdrop: hairline fractures that burst from a point on a black
 * field, propagate outward, hold, then close. Each fissure is finite —
 * nothing loops forever.
 *
 * Started from a real reference (a stock "surface impact crack" clip,
 * examined frame by frame — see .workspace/journal.md), then tuned away from
 * it on direct feedback: slower growth, gentler turns, and branching spread
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
  kinkTarget: number;
  stepsToKink: number;
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

// A crack advances in short straight-ish runs that meet at sharp angles,
// not a smoothly curving line — re-rolling a "kink" target every few steps
// and snapping toward it is what produces that, versus jitter applied every
// single step which just reads as a wobbly curve.
const KINK_MIN_STEPS = 4;
const KINK_MAX_STEPS = 8;
const KINK_STRENGTH = 0.55; // rad, ~31° — the sharp-angle character
// Snapping toward each new kink over several steps instead of ~1 reads as a
// smoother turn without smoothing away the sharp-angle character itself —
// the *joint* eases in, the target angle is still a hard kink.
const KINK_SNAP = 0.4;

const FIELD_SCALE = 0.0011; // spatial frequency of the long-range bias
const FIELD_DRIFT = 0.02;
const FIELD_WEIGHT = 0.35; // how much the field biases the kink choice
const MAX_NET_TURN = 1.05; // rad — bounds total bend, so it can never coil

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
const BRANCH_MIN_ANGLE = 0.3; // ~17°
const BRANCH_MAX_ANGLE = 0.85; // ~49° — wide forks, close to the reference
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
// Shorter than before — bursts should appear more often — while
// AMBIENT_BURSTS above still caps how many are ever live at once.
const SPAWN_MIN_MS = 1600;
const SPAWN_MAX_MS = 3200;
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
    angle,
    kinkTarget: angle,
    stepsToKink: Math.floor(randomBetween(KINK_MIN_STEPS, KINK_MAX_STEPS)),
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

export function SiteBackground() {
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
      width = window.innerWidth;
      height = window.innerHeight;
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
      if (liveArms >= HARD_CAP) return;
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
        ? { x: randomBetween(0, width), y: fromStart ? -20 : height + 20 }
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
     * Pick the next kink target: a sharp offset from the current heading,
     * with a weak long-range bias from the stress field and a pointer
     * concentration nearby. The pointer nudges *which side* the next kink
     * leans toward — it never attracts the tip's position, which is what
     * would make a trace orbit it and coil.
     */
    function rollKink(fissure: Fissure, tip: Point) {
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

      const jag = randomBetween(-KINK_STRENGTH, KINK_STRENGTH);
      const towardBias = angleDelta(fissure.angle, bias) * FIELD_WEIGHT;
      fissure.kinkTarget = fissure.angle + towardBias + jag;
      fissure.stepsToKink = Math.floor(
        randomBetween(KINK_MIN_STEPS, KINK_MAX_STEPS),
      );
    }

    function step(fissure: Fissure, tip: Point) {
      if (fissure.stepsToKink <= 0) rollKink(fissure, tip);
      fissure.stepsToKink--;

      let turn = angleDelta(fissure.angle, fissure.kinkTarget) * KINK_SNAP;

      const projected = fissure.netTurn + turn;
      if (Math.abs(projected) > MAX_NET_TURN) {
        turn = Math.sign(projected) * MAX_NET_TURN - fissure.netTurn;
      }
      fissure.netTurn += turn;
      fissure.angle += turn;
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
          liveArms < HARD_CAP &&
          Math.random() < BRANCH_CHANCE;

        if (canBranch) {
          fissure.branchBudget--;
          const spread =
            randomBetween(BRANCH_MIN_ANGLE, BRANCH_MAX_ANGLE) *
            (Math.random() < 0.5 ? 1 : -1);
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

    function draw(fissure: Fissure) {
      const points = fissure.points;
      if (points.length < 2) return;

      const alpha = Math.min(1.2, fissureAlpha(fissure) * heatFor(fissure));
      if (alpha <= 0) return;
      const scale = fissure.major ? 1.5 : 1;

      const spine = centreline(fissure);

      // Faint warmth around the hairline — kept low so it reads as a lit
      // edge rather than a discharge.
      ctx.lineWidth = 7 * scale;
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.05 * alpha})`;
      ctx.stroke(spine);

      // The hairline itself: dark, roughly constant width, like a real
      // surface crack rather than a lit bolt.
      ctx.lineWidth = 1.6 * scale;
      ctx.strokeStyle = `rgba(20, 14, 10, ${0.85 * alpha})`;
      ctx.stroke(spine);

      // A thin ember running the core of the crack.
      ctx.lineWidth = 0.8 * scale;
      ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.55 * alpha})`;
      ctx.stroke(spine);

      if (fissure.phase === "growing") {
        const tip = points[points.length - 1];
        glowAt(tip.x, tip.y, 10 * scale, 0.45 * alpha);
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
      if (nextSpawnIn <= 0 && activeBursts < AMBIENT_BURSTS) {
        spawnAmbient();
        nextSpawnIn = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS);
      }

      nextMajorIn -= deltaMs;
      if (nextMajorIn <= 0 && liveArms < HARD_CAP) {
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

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    }

    function onPointerDown(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      spawnClickBurst(event.clientX, event.clientY);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      } else if (!rafId) {
        lastTime = 0;
        rafId = requestAnimationFrame(frame);
      }
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}
