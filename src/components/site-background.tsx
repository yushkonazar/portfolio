"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide backdrop: fractures that nucleate somewhere on a black field,
 * propagate from A to B, hold, then fade out. Each crack is finite — nothing
 * loops forever — and the cadence is slow enough to stay background noise
 * rather than something that competes with the text on top of it.
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
};

const GROWTH_SPEED = 165; // px per second
const STEP = 7; // px between recorded vertices
const WOBBLE = 0.42; // radians of drift per step
const BRANCH_CHANCE = 0.045;
const MAX_DEPTH = 2;
const MAX_CRACKS = 8;

const FIRST_SPAWN_MS = 700;
const SPAWN_MIN_MS = 2200;
const SPAWN_MAX_MS = 4200;
const FADE_IN_MS = 420;
const HOLD_MIN_MS = 2600;
const HOLD_MAX_MS = 4200;
const FADE_OUT_MS = 2400;

const HEAT_RADIUS = 180; // pointer proximity that brightens a fracture
const HEAT_BOOST = 0.9;

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

function createCrack(origin: Point, angle: number, target: number, depth: number): Crack {
  return {
    points: [origin],
    angle,
    grown: 0,
    target,
    pending: 0,
    depth,
    phase: "growing",
    phaseElapsed: 0,
    holdFor: randomBetween(HOLD_MIN_MS, HOLD_MAX_MS),
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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
    const cracks: Crack[] = [];
    const pointer: Point = { x: -9999, y: -9999 };
    let nextSpawnIn = FIRST_SPAWN_MS;
    let rafId = 0;
    let lastTime = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = Math.floor(width * dpr);
      canvas!.height = Math.floor(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
    }

    function spawnCrack() {
      // Nucleate anywhere on screen, favouring the margins so fractures tend
      // to travel across empty space rather than straight through the copy.
      const edgeBias = Math.random() < 0.6;
      const origin: Point = edgeBias
        ? {
            x: Math.random() < 0.5 ? randomBetween(0, width * 0.3) : randomBetween(width * 0.7, width),
            y: randomBetween(0, height),
          }
        : { x: randomBetween(0, width), y: randomBetween(0, height) };

      const angle = Math.random() * Math.PI * 2;
      const target = randomBetween(220, 620);
      cracks.push(createCrack(origin, angle, target, 0));
    }

    function advance(crack: Crack, deltaMs: number) {
      crack.phaseElapsed += deltaMs;

      if (crack.phase === "holding") {
        if (crack.phaseElapsed >= crack.holdFor) {
          crack.phase = "fading";
          crack.phaseElapsed = 0;
        }
        return;
      }

      if (crack.phase !== "growing") return;

      crack.pending += (GROWTH_SPEED * deltaMs) / 1000;

      while (crack.pending >= STEP) {
        crack.pending -= STEP;
        crack.angle += (Math.random() - 0.5) * WOBBLE;

        const last = crack.points[crack.points.length - 1];
        crack.points.push({
          x: last.x + Math.cos(crack.angle) * STEP,
          y: last.y + Math.sin(crack.angle) * STEP,
        });
        crack.grown += STEP;

        const canBranch =
          crack.depth < MAX_DEPTH &&
          cracks.length < MAX_CRACKS &&
          Math.random() < BRANCH_CHANCE;

        if (canBranch) {
          const spread = randomBetween(0.4, 0.95) * (Math.random() < 0.5 ? 1 : -1);
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

    function draw(crack: Crack) {
      const points = crack.points;
      if (points.length < 2) return;

      const alpha = crackAlpha(crack) * heatFor(crack);
      if (alpha <= 0) return;

      ctx!.beginPath();
      ctx!.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx!.lineTo(points[i].x, points[i].y);
      }

      // Bloom, body, then the bright fracture line itself.
      ctx!.lineWidth = 12;
      ctx!.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.045 * alpha})`;
      ctx!.stroke();

      ctx!.lineWidth = 4;
      ctx!.strokeStyle = `rgba(${ar}, ${ag}, ${ab}, ${0.1 * alpha})`;
      ctx!.stroke();

      ctx!.lineWidth = 1.1;
      ctx!.strokeStyle = `rgba(${br}, ${bg}, ${bb}, ${0.34 * alpha})`;
      ctx!.stroke();

      // While it is still tearing, the leading tip glows hotter.
      if (crack.phase === "growing") {
        const tip = points[points.length - 1];
        const glow = ctx!.createRadialGradient(tip.x, tip.y, 0, tip.x, tip.y, 16);
        glow.addColorStop(0, `rgba(${br}, ${bg}, ${bb}, ${0.42 * alpha})`);
        glow.addColorStop(1, `rgba(${br}, ${bg}, ${bb}, 0)`);
        ctx!.fillStyle = glow;
        ctx!.beginPath();
        ctx!.arc(tip.x, tip.y, 16, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function frame(time: number) {
      rafId = requestAnimationFrame(frame);

      const deltaMs = lastTime ? Math.min(time - lastTime, 64) : 16;
      lastTime = time;

      nextSpawnIn -= deltaMs;
      if (nextSpawnIn <= 0 && cracks.length < MAX_CRACKS) {
        spawnCrack();
        nextSpawnIn = randomBetween(SPAWN_MIN_MS, SPAWN_MAX_MS);
      }

      ctx!.clearRect(0, 0, width, height);

      for (let i = cracks.length - 1; i >= 0; i--) {
        const crack = cracks[i];
        advance(crack, deltaMs);
        draw(crack);
        if (crack.phase === "fading" && crack.phaseElapsed >= FADE_OUT_MS) {
          cracks.splice(i, 1);
        }
      }
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
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
    document.addEventListener("visibilitychange", onVisibilityChange);
    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
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
