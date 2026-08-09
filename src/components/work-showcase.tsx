"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StatsBand, type Stat } from "./stats-band";
import { ProjectRow, type ProjectRowLink } from "./project-row";
import { Reveal } from "./reveal";

export type ShowcaseRow = {
  slug: string;
  title: string;
  status: string;
  statusTone: "live" | "production";
  short: string;
  description: string;
  metrics: Stat[];
  stack: string[];
  screenshot?: { src: string; width: number; height: number };
  screenshotPlaceholder?: string;
  links: ProjectRowLink[];
  note?: string;
};

// Where on the screen a row counts as "the one being read".
const FOCUS_LINE = 0.42;
// After an automatic change, ignore scroll for this long. Opening a row grows
// the list, which moves the next row across the focus line, which would open
// that one — a loop. The cooldown outlives the 450ms expand transition.
const AUTO_COOLDOWN_MS = 600;

export function WorkShowcase({
  rows,
  siteStats,
  defaultCaption,
  heading,
  hint,
}: {
  rows: ShowcaseRow[];
  siteStats: Stat[];
  defaultCaption: string;
  heading: string;
  hint: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  // Mirrored into a ref so the scroll listener can compare against the current
  // value without re-subscribing on every change.
  const activeRef = useRef<number | null>(null);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const headers = useRef<(HTMLDivElement | null)[]>([]);
  // Viewport top of the row that is opening, captured before React re-renders,
  // so the layout effect can put it back where the pointer left it.
  const anchorTop = useRef<number | null>(null);
  const suppressUntil = useRef(0);

  const open = useCallback((index: number, anchor: boolean) => {
    // Measured here, from the same ref the layout effect reads back, so the
    // before/after comparison can't drift by an element's padding.
    anchorTop.current = anchor
      ? (headers.current[index]?.getBoundingClientRect().top ?? null)
      : null;
    suppressUntil.current = Date.now() + AUTO_COOLDOWN_MS;
    setActive(index);
  }, []);

  const close = useCallback((index: number) => {
    setActive((current) => (current === index ? null : current));
  }, []);

  // B — pin the row the pointer is on. Only for pointer-driven changes:
  // compensating during a scroll-driven change would fight the user's own
  // scrolling, so anchorTop stays null in that path.
  useLayoutEffect(() => {
    if (active === null || anchorTop.current === null) return;
    const header = headers.current[active];
    if (!header) return;
    const delta = header.getBoundingClientRect().top - anchorTop.current;
    anchorTop.current = null;
    if (Math.abs(delta) < 1) return;
    window.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
    suppressUntil.current = Date.now() + AUTO_COOLDOWN_MS;
  }, [active]);

  // A — open whichever row is nearest the focus line while scrolling. Reads
  // the row headers, which keep their own position when a row expands, so the
  // decision doesn't depend on the thing it causes.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(hover: hover)").matches === false) {
      // Touch: no pointer to fight with, so this is the only opener.
    }

    const selectNearest = () => {
      if (Date.now() < suppressUntil.current) return;

      const line = window.innerHeight * FOCUS_LINE;
      let nearest: number | null = null;
      let best = Infinity;

      headers.current.forEach((header, index) => {
        if (!header) return;
        const rect = header.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const distance = Math.abs(rect.top + rect.height / 2 - line);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });

      if (nearest === null || nearest === activeRef.current) return;
      suppressUntil.current = Date.now() + AUTO_COOLDOWN_MS;
      anchorTop.current = null;
      setActive(nearest);
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        selectNearest();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const activeRow = active === null ? null : rows[active];

  return (
    <>
      <StatsBand
        stats={activeRow ? activeRow.metrics : siteStats}
        caption={activeRow ? activeRow.title : defaultCaption}
      />

      {/* No onMouseLeave reset: closing everything when the pointer wanders
          off fought the scroll-driven opening, and leaving the last row open
          keeps the band showing what the visitor was just reading. */}
      <section
        id="work"
        className="mx-auto w-full max-w-5xl px-6 py-8 md:px-11 md:py-9"
      >
        <Reveal className="flex items-baseline justify-between">
          <h2 className="m-0 text-[15px] font-bold tracking-[0.02em]">
            {heading}
          </h2>
          <span className="text-muted-foreground font-mono text-[11px] md:text-[11.5px]">
            {hint}
          </span>
        </Reveal>

        <div className="mt-1.5">
          {rows.map((row, index) => (
            <ProjectRow
              key={row.slug}
              {...row}
              last={index === rows.length - 1}
              open={active === index}
              onOpen={(anchor) => open(index, anchor)}
              onClose={() => close(index)}
              registerHeader={(element) => {
                headers.current[index] = element;
              }}
            />
          ))}
        </div>
      </section>
    </>
  );
}
