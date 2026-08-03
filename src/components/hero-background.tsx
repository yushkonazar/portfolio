"use client";

import { useEffect, useRef, useState } from "react";
import { Renderer, Program, Mesh, Triangle } from "ogl";

const IDLE_TIMEOUT_MS = 2500;

const vertexShader = `
  attribute vec2 uv;
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Voronoi cells whose feature points drift over time (or shift with the
// pointer). Thresholding the gap between the nearest and second-nearest
// point traces the cell boundaries — that's the "crack" — and an ember glow
// is mixed in right at the boundary, like light through a fault line.
const fragmentShader = `
  precision highp float;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform float uTime;
  uniform float uIdle;
  varying vec2 vUv;

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  vec2 voronoi(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = hash2(n + g);
        o = 0.5 + 0.5 * sin(uTime * 0.12 + 6.2831 * o);
        vec2 r = g + o - f;
        float d = dot(r, r);
        if (d < f1) { f2 = f1; f1 = d; }
        else if (d < f2) { f2 = d; }
      }
    }
    return vec2(sqrt(f1), sqrt(f2));
  }

  void main() {
    vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
    vec2 st = vUv * aspect * 7.0;

    vec2 mouseOffset = (uMouse - 0.5) * aspect * 2.5;
    st += mouseOffset * (1.0 - uIdle);

    vec2 f = voronoi(st);
    float edge = smoothstep(0.0, 0.05, f.y - f.x);

    vec3 plate = vec3(0.02, 0.02, 0.025);
    vec3 ember = vec3(0.96, 0.55, 0.05);

    float glow = pow(1.0 - edge, 4.0);
    vec3 color = mix(plate, ember, glow);

    gl_FragColor = vec4(color, 1.0);
  }
`;

export function HeroBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (reducedMotion || !container) return;

    const renderer = new Renderer({
      alpha: true,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);
    gl.canvas.style.width = "100%";
    gl.canvas.style.height = "100%";

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uResolution: { value: [container.clientWidth, container.clientHeight] },
        uMouse: { value: [0.5, 0.5] },
        uTime: { value: 0 },
        uIdle: { value: 1 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    const targetMouse = [0.5, 0.5];
    const currentMouse = [0.5, 0.5];
    let idleTarget = 1;
    let currentIdle = 1;
    let idleTimer: ReturnType<typeof setTimeout>;

    function resize() {
      if (!container) return;
      const { clientWidth, clientHeight } = container;
      renderer.setSize(clientWidth, clientHeight);
      program.uniforms.uResolution.value = [clientWidth, clientHeight];
    }
    resize();
    window.addEventListener("resize", resize);

    function onPointerMove(event: PointerEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      targetMouse[0] = (event.clientX - rect.left) / rect.width;
      targetMouse[1] = 1 - (event.clientY - rect.top) / rect.height;
      idleTarget = 0;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTarget = 1;
      }, IDLE_TIMEOUT_MS);
    }
    window.addEventListener("pointermove", onPointerMove);

    let rafId: number;
    function update(time: number) {
      rafId = requestAnimationFrame(update);
      program.uniforms.uTime.value = time * 0.001;
      currentMouse[0] += (targetMouse[0] - currentMouse[0]) * 0.05;
      currentMouse[1] += (targetMouse[1] - currentMouse[1]) * 0.05;
      program.uniforms.uMouse.value = currentMouse;
      currentIdle += (idleTarget - currentIdle) * 0.02;
      program.uniforms.uIdle.value = currentIdle;
      renderer.render({ scene: mesh });
    }
    rafId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(idleTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(135deg, #050505, #1a1108)" }}
      />
    );
  }

  return <div ref={containerRef} aria-hidden className="absolute inset-0 -z-10" />;
}
