"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { ProjectRow, type ProjectRowLink } from "./project-row";
import { Reveal } from "./reveal";

export type ShowcaseRow = {
  slug: string;
  title: string;
  status: string;
  statusTone: "live" | "production";
  short: string;
  description: string;
  metrics: { value: string; label: string }[];
  stack: string[];
  screenshot?: { src: string; width: number; height: number };
  screenshotPlaceholder?: string;
  links: ProjectRowLink[];
  note?: string;
};

export function WorkShowcase({
  rows,
  heading,
  hint,
}: {
  rows: ShowcaseRow[];
  heading: string;
  hint: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const headers = useRef<(HTMLDivElement | null)[]>([]);
  // Viewport top of the row that is opening, captured before React re-renders,
  // so the layout effect can put it back where the pointer left it.
  const anchorTop = useRef<number | null>(null);

  const open = useCallback((index: number, anchor: boolean) => {
    // Measured here, from the same ref the layout effect reads back, so the
    // before/after comparison can't drift by an element's padding.
    anchorTop.current = anchor
      ? (headers.current[index]?.getBoundingClientRect().top ?? null)
      : null;
    setActive(index);
  }, []);

  const close = useCallback((index: number) => {
    setActive((current) => (current === index ? null : current));
  }, []);

  // Pin the row the pointer is on. Moving from an open row to one below it
  // collapses the first, which would otherwise pull the second up from under
  // the cursor mid-gesture.
  useLayoutEffect(() => {
    if (active === null || anchorTop.current === null) return;
    const header = headers.current[active];
    if (!header) return;
    const delta = header.getBoundingClientRect().top - anchorTop.current;
    anchorTop.current = null;
    if (Math.abs(delta) < 1) return;
    window.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
  }, [active]);

  return (
    <>
      {/* No onMouseLeave reset: collapsing the open row when the pointer
          wanders off jumps the page for no reason the visitor asked for. */}
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
