"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide backdrop: fractures that nucleate on a black field, propagate from
 * A to B, hold, then fade out. Each crack is finite — nothing loops forever.
 *
 * Direction is not random. A slowly evolving stress field decides the preferred
 * orientation at every point, so fractures in the same region line up with each
 * other the way they would in a real material. The pointer bends that field
 * locally, and a click concentrates enough stress to nucleate on the spot.
 */

type Point = { x: number; y: number };

type Phase = "growing" | "holding" | "fading";

type Crack = {
  points: Point[];
  angle: number;
  grown: number;
  target: number;
  pending: number;
  depth: number;
  phase: Phase;
  phaseElapsed: number;
  holdFor: number;
  speed: number;
  scale: number;
  major: boolean;
  branchBudget: number;
  pulse: number; // -1 idle, else 0..1 along the fracture
};

type Flash = { x: number; y: number; elapsed: number };

const STEP = 7; // px between recorded vertices
const BASE_SPEED = 165; // px per second
const JITTER = 0.12; // residual randomness on top of the field
const FIELD_PULL = 0.34; // how strongly a fracture obeys the stress field
const FIELD_SCALE = 0.0016; // spatial frequency of the field
const FIELD_DRIFT = 0.02; // how fast the field itself evolves

const POINTER_RADIUS = 260; // pointer stress concentration
const POINTER_PULL = 0.75;
const HEAT_RADIUS = 200; // pointer proximity that brightens a fracture
const HEAT_BOOST = 1;

const BRANCH_CHANCE = 0.045;
const MAX_DEPTH = 2;
// Chance decides *where* a fracture forks; the budget decides *how many* times.
// Without the budget a long major fracture alone forks enough to saturate the
// screen and the field never gets a quiet moment.
const BRANCH_BUDGET = 3;
const MAJOR_BRANCH_BUDGET = 7;
const AMBIENT_CRACKS = 8; // ambient spawns pause above this
const HARD_CAP = 28; // absolute ceiling, clicks included

const FIRST_SPAWN_MS = 700;
const SPAWN_MIN_MS = 2200;
const SPAWN_MAX_MS = 4200;
const MAJOR_MIN_MS = 20000;
const MAJOR_MAX_MS = 40000;

const FADE_IN_MS = 420;
const HOLD_MIN_MS = 2600;
const HOLD_MAX_MS = 4200;
const FADE_OUT_MS = 2400;
const PULSE_MS = 950;
const FLASH_MS = 520;

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
 * The field is a *line* field, not a vector field: it has an orientation but no
 * sign, so a fracture may travel either way along it.
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

function createCrack(
  origin: Point,
  angle: number,
  target: number,
  depth: number,
  major = false,
): Crack {
  return {
    points: [origin],
    angle,
    grown: 0,
    target,
    pending: 0,
    depth,
    phase: "growing",
    phaseElapsed: 0,
    holdFor: randomBetween(HOLD_MIN_MS, HOLD_MAX_MS) * (major ? 1.6 : 1),
    speed: BASE_SPEED * (major ? 0.62 : 1),
    scale: major ? 1.9 : 1,
    major,
    branchBudget: major ? MAJOR_BRANCH_BUDGET : BRANCH_BUDGET,
    pulse: -1,
  };
}

function crackAlpha(crack: Crack) {
  if (crack.phase === "growing") {
    return Math.min(1, crack.phaseElapsed / FADE_IN_MS);
  }
  if (crack.phase === "fading") {
    return Math.max(0, 1 - crack.phaseElapsed / FADE_OUT_MS);
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

    const cracks: Crack[] = [];
    const flashes: Flash[] = [];
    const pointer: Point = { x: -9999, y: -9999 };

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
      // Favour the margins so fractures tend to travel across empty space.
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

      // Start already aligned to the field rather than fighting it.
      const angle = fieldAngle(origin.x, origin.y, elapsedSeconds) + (Math.random() < 0.5 ? 0 : Math.PI);
      cracks.push(createCrack(origin, angle, randomBetween(220, 620), 0));
    }

    function spawnMajor() {
      // Enters from an edge and travels far enough to cross the viewport.
      const fromLeft = Math.random() < 0.5;
      const vertical = Math.random() < 0.4;
      const origin: Point = vertical
        ? { x: randomBetween(0, width), y: fromLeft ? -20 : height + 20 }
        : { x: fromLeft ? -20 : width + 20, y: randomBetween(0, height) };

      const toCentre = Math.atan2(height / 2 - origin.y, width / 2 - origin.x);
      const target = Math.hypot(width, height) * randomBetween(0.7, 1.05);
      cracks.push(
        createCrack(origin, toCentre + randomBetween(-0.5, 0.5), target, 0, true),
      );
    }

    function spawnBurst(x: number, y: number) {
      const arms = 3 + Math.floor(Math.random() * 3);
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < arms; i++) {
        if (cracks.length >= HARD_CAP) break;
        cracks.push(
          createCrack(
            { x, y },
            base + (i / arms) * Math.PI * 2 + randomBetween(-0.3, 0.3),
            randomBetween(150, 340),
            1,
          ),
        );
      }
      flashes.push({ x, y, elapsed: 0 });
    }

    /** Blend the fracture's heading toward the local stress orientation. */
    function steer(crack: Crack, tip: Point) {
      const oriented = fieldAngle(tip.x, tip.y, elapsedSeconds);
      const forward = angleDelta(crack.angle, oriented);
      const backward = angleDelta(crack.angle, oriented + Math.PI);
      let desired =
        Math.abs(forward) <= Math.abs(backward)
          ? crack.angle + forward
          : crack.angle + backward;

      const dx = pointer.x - tip.x;
      const dy = pointer.y - tip.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER_RADIUS) {
        // The pointer acts as a stress concentration the fracture leans into.
        const weight = (1 - distance / POINTER_RADIUS) * POINTER_PULL;
        desired += angleDelta(desired, Math.atan2(dy, dx)) * weight;
      }

      crack.angle += angleDelta(crack.angle, desired) * FIELD_PULL;
      crack.angle += (Math.random() - 0.5) * JITTER;
    }

    function advance(crack: Crack, deltaMs: number) {
      crack.phaseElapsed += deltaMs;

      if (crack.pulse >= 0) {
        crack.pulse += deltaMs / PULSE_MS;
        if (crack.pulse > 1) crack.pulse = -1;
      }

      if (crack.phase === "holding") {
        if (crack.phaseElapsed >= crack.holdFor) {
          crack.phase = "fading";
          crack.phaseElapsed = 0;
        }
        return;
      }

      if (crack.phase !== "growing") return;

      crack.pending += (crack.speed * deltaMs) / 1000;

      while (crack.pending >= STEP) {
        crack.pending -= STEP;

        const last = crack.points[crack.points.length - 1];
        steer(crack, last);

        crack.points.push({
          x: last.x + Math.cos(crack.angle) * STEP,
          y: last.y + Math.sin(crack.angle) * STEP,
        });
        crack.grown += STEP;

        const canBranch =
          crack.depth < MAX_DEPTH &&
          crack.branchBudget > 0 &&
          cracks.length < HARD_CAP &&
          Math.random() < BRANCH_CHANCE * (crack.major ? 2.2 : 1);

        if (canBranch) {
          crack.branchBudget--;
          const spread =
            randomBetween(0.4, 0.95) * (Math.random() < 0.5 ? 1 : -1);
          cracks.push(
            createCrack(
              { ...crack.points[crack.points.length - 1] },
              crack.angle + spread,
              crack.target * randomBetween(0.3, 0.55),
              crack.depth + 1,
            ),
          );
        }

        if (crack.grown >= crack.target) {
          crack.phase = "holding";
          crack.phaseElapsed = 0;
          // A major fracture releases its energy as a pulse of light.
          if (crack.major) crack.pulse = 0;
          break;
        }
      }
    }

    function heatFor(crack: Crack) {
      let nearest = Infinity;
      for (const point of crack.points) {
        const dx = point.x - pointer.x;
        const dy = point.y - pointer.y;
        const distance = dx * dx + dy * dy;
        if (distance < nearest) nearest = distance;
      }
      const falloff = 1 - Math.min(1, Math.sqrt(nearest) / HEAT_RADIUS);
      return 1 + HEAT_BOOST * falloff;
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

    function draw(crack: Crack) {
      const points = crack.points;
      if (points.length < 2) return;

      const alpha = crackAlpha(crack) * heatFor(crack);
      if (alpha <= 0) return;
      const scale = crack.scale;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }

      // Bloom, body, then the bright fracture line itself.
      ctx.lineWidth = 14 * scale;
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.06 * alpha})`;
      ctx.stroke();

      ctx.lineWidth = 5 * scale;
      ctx.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.14 * alpha})`;
      ctx.stroke();

      ctx.lineWidth = 1.3 * scale;
      ctx.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.5 * alpha})`;
      ctx.stroke();

      // While it is still tearing, the leading tip glows hotter.
      if (crack.phase === "growing") {
        const tip = points[points.length - 1];
        glowAt(tip.x, tip.y, 18 * scale, 0.5 * alpha);
      }

      // Energy release travelling the length of a completed major fracture.
      if (crack.pulse >= 0) {
        const index = Math.min(
          points.length - 1,
          Math.floor(crack.pulse * (points.length - 1)),
        );
        const head = points[index];
        const fade = 1 - crack.pulse;
        glowAt(head.x, head.y, 46 * scale, 0.55 * fade);

        ctx.beginPath();
        ctx.moveTo(points[Math.max(0, index - 8)].x, points[Math.max(0, index - 8)].y);
        for (let i = Math.max(0, index - 8); i <= index; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.lineWidth = 2.4 * scale;
        ctx.strokeStyle = `rgba(255, 236, 200, ${0.7 * fade})`;
        ctx.stroke();
      }
    }

    function drawFlash(flash: Flash) {
      const progress = flash.elapsed / FLASH_MS;
      const fade = 1 - progress;
      glowAt(flash.x, flash.y, 30 + progress * 120, 0.5 * fade * fade);
    }

    function frame(time: number) {
      rafId = requestAnimationFrame(frame);

      const deltaMs = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;
      elapsedSeconds += deltaMs / 1000;

      nextSpawnIn -= deltaMs;
      if (nextSpawnIn <= 0 && cracks.length < AMBIENT_CRACKS) {
        spawnAmbient();
        nextSpawnIn = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS);
      }

      nextMajorIn -= deltaMs;
      if (nextMajorIn <= 0 && cracks.length < HARD_CAP) {
        spawnMajor();
        nextMajorIn = randomBetween(MAJOR_MIN_MS, MAJOR_MAX_MS);
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, width, height);
      // Overlapping fractures should compound into brighter light, not paint
      // over each other.
      ctx.globalCompositeOperation = "lighter";

      for (let i = cracks.length - 1; i >= 0; i--) {
        const crack = cracks[i];
        advance(crack, deltaMs);
        draw(crack);
        if (crack.phase === "fading" && crack.phaseElapsed >= FADE_OUT_MS) {
          cracks.splice(i, 1);
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
