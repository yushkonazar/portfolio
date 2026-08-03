"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide backdrop: ground fissures that open on a black field, propagate
 * from A to B, hold, then close. Each fissure is finite — nothing loops.
 *
 * Modelled on geological faults rather than lightning, which drives three
 * choices: a fissure is an opening with width (widest mid-span, tapering to
 * nothing at both tips) rather than a stroked line; its curvature is strictly
 * bounded so it reads as a fault trace and never coils; and it arrests on
 * contact with an existing fissure, because a fracture cannot propagate across
 * a free surface. That last rule is also what makes strands split and rejoin
 * the way real fault systems anastomose.
 */

type Point = { x: number; y: number };

type Phase = "growing" | "holding" | "fading";

type Fissure = {
  points: Point[];
  angle: number;
  baseAngle: number;
  netTurn: number;
  grown: number;
  target: number;
  pending: number;
  depth: number;
  commit: number; // steps before it starts obeying the field again
  grace: number; // steps before contact can arrest it
  phase: Phase;
  phaseElapsed: number;
  holdFor: number;
  speed: number;
  halfWidth: number;
  major: boolean;
  branchBudget: number;
  pulse: number; // -1 idle, else 0..1 along the fissure
};

type Flash = { x: number; y: number; elapsed: number };

const STEP = 7; // px between recorded vertices
const BASE_SPEED = 150; // px per second
const JITTER = 0.03; // residual roughness — faults are not jagged
const FIELD_PULL = 0.12; // how strongly a fissure obeys the stress field
const FIELD_SCALE = 0.0009; // spatial frequency (low = long, sweeping traces)
const FIELD_DRIFT = 0.015;
const MAX_TURN_PER_STEP = 0.05; // rad — bounds local curvature
const MAX_NET_TURN = 0.85; // rad — bounds total bend, so it can never coil

const POINTER_RADIUS = 300;
const POINTER_PULL = 0.6;
const HEAT_RADIUS = 200;
const HEAT_BOOST = 0.7;

const ARREST_DISTANCE = 7; // px — a fissure stops when it meets another
const SELF_SKIP = 16; // own trailing vertices to ignore when testing contact
const CELL = 14; // spatial hash cell size

const BRANCH_CHANCE = 0.05;
const BRANCH_MIN_ANGLE = 0.18; // ~10°, shallow like real fault splays
const BRANCH_MAX_ANGLE = 0.46; // ~26°
const BRANCH_COMMIT = 10; // steps a splay travels before rejoining the field
// A splay is born *on* its parent and burst arms all share one origin, so
// without a grace period they arrest against their own source on step one.
const BRANCH_GRACE = 10;
const AMBIENT_GRACE = 2;
const MAX_DEPTH = 2;
// Chance decides *where* a fissure splays; the budget decides *how many* times.
// Without the budget a long trace splays enough to saturate the screen.
const BRANCH_BUDGET = 2;
const MAJOR_BRANCH_BUDGET = 5;

const MIN_SPLAY_LENGTH = 130; // keeps splays from reading as stubs
const AMBIENT_FISSURES = 9;
const HARD_CAP = 26;

const FIRST_SPAWN_MS = 700;
const SPAWN_MIN_MS = 2400;
const SPAWN_MAX_MS = 4600;
const MAJOR_MIN_MS = 20000;
const MAJOR_MAX_MS = 40000;

const FADE_IN_MS = 520;
const HOLD_MIN_MS = 2800;
const HOLD_MAX_MS = 4600;
const FADE_OUT_MS = 2600;
const PULSE_MS = 1100;
const FLASH_MS = 520;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return value < min ? min : value > max ? max : value;
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

/** Value noise with smoothstep interpolation — the substrate of the field. */
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

/**
 * A *line* field: it carries an orientation but no sign, so a fissure may run
 * either way along it.
 */
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

/** Pick whichever of the line's two directions the fissure is already facing. */
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
  halfWidth: number,
  major = false,
  commit = 0,
  grace = AMBIENT_GRACE,
): Fissure {
  return {
    points: [origin],
    angle,
    baseAngle: angle,
    netTurn: 0,
    grown: 0,
    target,
    pending: 0,
    depth,
    commit,
    grace,
    phase: "growing",
    phaseElapsed: 0,
    holdFor: randomBetween(HOLD_MIN_MS, HOLD_MAX_MS) * (major ? 1.6 : 1),
    speed: BASE_SPEED * (major ? 0.68 : 1),
    halfWidth,
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

      const angle =
        fieldAngle(origin.x, origin.y, elapsedSeconds) +
        (Math.random() < 0.5 ? 0 : Math.PI);
      fissures.push(
        createFissure(
          origin,
          angle,
          randomBetween(260, 680),
          0,
          randomBetween(1.6, 2.6),
        ),
      );
    }

    function spawnMajor() {
      const fromStart = Math.random() < 0.5;
      const vertical = Math.random() < 0.4;
      const origin: Point = vertical
        ? { x: randomBetween(0, width), y: fromStart ? -20 : height + 20 }
        : { x: fromStart ? -20 : width + 20, y: randomBetween(0, height) };

      const toCentre = Math.atan2(height / 2 - origin.y, width / 2 - origin.x);
      fissures.push(
        createFissure(
          origin,
          toCentre + randomBetween(-0.35, 0.35),
          Math.hypot(width, height) * randomBetween(0.75, 1.05),
          0,
          randomBetween(4.5, 6),
          true,
        ),
      );
    }

    function spawnBurst(x: number, y: number) {
      // Radial splays, the way fractures run out of an indentation point.
      const arms = 3 + Math.floor(Math.random() * 2);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < arms; i++) {
        if (fissures.length >= HARD_CAP) break;
        fissures.push(
          createFissure(
            { x, y },
            base + (i / arms) * Math.PI * 2 + randomBetween(-0.25, 0.25),
            randomBetween(170, 380),
            1,
            randomBetween(1.4, 2.2),
            false,
            BRANCH_COMMIT,
            BRANCH_GRACE,
          ),
        );
      }
      flashes.push({ x, y, elapsed: 0 });
    }

    /**
     * Bend the trace toward the local stress orientation, under a hard
     * curvature budget. The pointer rotates the field near it toward the radial
     * line — never toward the pointer's position, which is what would make a
     * trace orbit it and coil.
     */
    function steer(fissure: Fissure, tip: Point) {
      if (fissure.commit > 0) {
        fissure.commit--;
        fissure.angle += (Math.random() - 0.5) * JITTER;
        return;
      }

      let orientation = fieldAngle(tip.x, tip.y, elapsedSeconds);

      const dx = tip.x - pointer.x;
      const dy = tip.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER_RADIUS && distance > 1) {
        const radial = Math.atan2(dy, dx);
        const weight = (1 - distance / POINTER_RADIUS) * POINTER_PULL;
        orientation += angleDelta(orientation, alignToLine(orientation, radial)) * weight;
      }

      const desired = alignToLine(fissure.angle, orientation);
      let turn = angleDelta(fissure.angle, desired) * FIELD_PULL;
      turn = clamp(turn, -MAX_TURN_PER_STEP, MAX_TURN_PER_STEP);

      // Never let the accumulated bend exceed the budget — this is what makes
      // coiling structurally impossible rather than merely unlikely.
      const projected = fissure.netTurn + turn;
      if (Math.abs(projected) > MAX_NET_TURN) {
        turn = Math.sign(projected) * MAX_NET_TURN - fissure.netTurn;
      }

      fissure.netTurn += turn;
      fissure.angle += turn + (Math.random() - 0.5) * JITTER;
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
        steer(fissure, last);

        const next = {
          x: last.x + Math.cos(fissure.angle) * STEP,
          y: last.y + Math.sin(fissure.angle) * STEP,
        };

        // A fracture cannot cross a free surface: meeting another trace ends
        // it. Splays that curve back into their parent terminate on it, which
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

        const canBranch =
          fissure.depth < MAX_DEPTH &&
          fissure.branchBudget > 0 &&
          fissures.length < HARD_CAP &&
          Math.random() < BRANCH_CHANCE * (fissure.major ? 1.8 : 1);

        if (canBranch) {
          fissure.branchBudget--;
          const spread =
            randomBetween(BRANCH_MIN_ANGLE, BRANCH_MAX_ANGLE) *
            (Math.random() < 0.5 ? 1 : -1);
          fissures.push(
            createFissure(
              { ...next },
              fissure.angle + spread,
              Math.max(
                MIN_SPLAY_LENGTH,
                fissure.target * randomBetween(0.35, 0.6),
              ),
              fissure.depth + 1,
              fissure.halfWidth * randomBetween(0.5, 0.7),
              false,
              BRANCH_COMMIT,
              BRANCH_GRACE,
            ),
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

    /**
     * Outline of the opening: the centreline offset either side by a width that
     * peaks mid-span and tapers to nothing at both tips, which is the profile
     * that separates a fault trace from a bolt.
     */
    function outline(fissure: Fissure, widthScale: number) {
      const points = fissure.points;
      const path = new Path2D();
      const left: Point[] = [];
      const right: Point[] = [];
      const last = points.length - 1;

      for (let i = 0; i <= last; i++) {
        const prev = points[Math.max(0, i - 1)];
        const next = points[Math.min(last, i + 1)];
        let nx = -(next.y - prev.y);
        let ny = next.x - prev.x;
        const length = Math.hypot(nx, ny) || 1;
        nx /= length;
        ny /= length;

        const along = clamp((i * STEP) / Math.max(fissure.target, 1), 0, 1);
        const taperTip = Math.min(1, (last - i) / 6); // sharp leading tip
        const w =
          fissure.halfWidth *
          widthScale *
          Math.sin(Math.PI * along) *
          taperTip;

        left.push({ x: points[i].x + nx * w, y: points[i].y + ny * w });
        right.push({ x: points[i].x - nx * w, y: points[i].y - ny * w });
      }

      path.moveTo(left[0].x, left[0].y);
      for (let i = 1; i < left.length; i++) path.lineTo(left[i].x, left[i].y);
      for (let i = right.length - 1; i >= 0; i--) {
        path.lineTo(right[i].x, right[i].y);
      }
      path.closePath();
      return path;
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
      if (points.length < 3) return;

      const alpha = Math.min(1.4, fissureAlpha(fissure) * heatFor(fissure));
      if (alpha <= 0) return;

      const spine = centreline(fissure);

      // Faint warmth escaping the opening — kept low so it reads as depth
      // rather than discharge.
      ctx.lineWidth = 16 * (fissure.major ? 1.6 : 1);
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.035 * alpha})`;
      ctx.stroke(spine);

      // The opening itself: darker than the ground around it.
      const gap = outline(fissure, 1);
      ctx.fillStyle = `rgba(0, 0, 0, ${0.95 * alpha})`;
      ctx.fill(gap);

      // Lit rim along the broken edge.
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(168, 140, 112, ${0.22 * alpha})`;
      ctx.stroke(gap);

      // Ember deep inside, tapering with the opening.
      ctx.fillStyle = `rgba(${br}, ${bg}, ${bb}, ${0.42 * alpha})`;
      ctx.fill(outline(fissure, 0.4));

      if (fissure.phase === "growing") {
        const tip = points[points.length - 1];
        glowAt(tip.x, tip.y, 12 * (fissure.major ? 1.6 : 1), 0.32 * alpha);
      }

      if (fissure.pulse >= 0) {
        const index = Math.min(
          points.length - 1,
          Math.floor(fissure.pulse * (points.length - 1)),
        );
        const head = points[index];
        const fade = 1 - fissure.pulse;
        glowAt(head.x, head.y, 52, 0.4 * fade);
      }
    }

    function drawFlash(flash: Flash) {
      const progress = flash.elapsed / FLASH_MS;
      const fade = 1 - progress;
      glowAt(flash.x, flash.y, 26 + progress * 90, 0.32 * fade * fade);
    }

    function frame(time: number) {
      rafId = requestAnimationFrame(frame);

      const deltaMs = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      elapsedSeconds += deltaMs / 1000;

      nextSpawnIn -= deltaMs;
      if (nextSpawnIn <= 0 && fissures.length < AMBIENT_FISSURES) {
        spawnAmbient();
        nextSpawnIn = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS);
      }

      nextMajorIn -= deltaMs;
      if (nextMajorIn <= 0 && fissures.length < HARD_CAP) {
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
      spawnBurst(event.clientX, event.clientY);
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
