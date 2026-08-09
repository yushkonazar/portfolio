"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ProjectRow, type ProjectRowLink } from "./project-row";
import { Reveal } from "./reveal";

/** How long an open row survives after the pointer leaves the list. */
const AUTO_CLOSE_MS = 2000;

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
  // Which header to keep still while the list resizes, and where it was before
  // React re-rendered. Set on the way in; the layout effect reads it back and
  // clears it. Null means "let the page move" — that's the scroll-driven case.
  const anchor = useRef<{ index: number; top: number } | null>(null);
  const section = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | null>(null);

  const measure = useCallback((index: number) => {
    const top = headers.current[index]?.getBoundingClientRect().top;
    anchor.current = top === undefined ? null : { index, top };
  }, []);

  const open = useCallback(
    (index: number, withAnchor: boolean) => {
      // Measured here, from the same ref the layout effect reads back, so the
      // before/after comparison can't drift by an element's padding.
      if (withAnchor) measure(index);
      else anchor.current = null;
      setActive(index);
    },
    [measure],
  );

  const close = useCallback(
    (index: number) => {
      setActive((current) => {
        if (current !== index) return current;
        return null;
      });
      measure(index);
    },
    [measure],
  );

  // Pin the row the gesture is on. Opening one row collapses another above it,
  // which would otherwise pull the list up from under the cursor; closing one
  // does the same to whatever the visitor has scrolled to below.
  useLayoutEffect(() => {
    const pinned = anchor.current;
    anchor.current = null;
    if (!pinned) return;
    const header = headers.current[pinned.index];
    if (!header) return;
    const delta = header.getBoundingClientRect().top - pinned.top;
    if (Math.abs(delta) < 1) return;
    window.scrollBy({ top: delta, behavior: "instant" as ScrollBehavior });
  }, [active]);

  const cancelAutoClose = useCallback(() => {
    if (closeTimer.current === null) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  // Once the pointer is gone, an open row is just stale state taking up the
  // screen. Keyboard users are exempt: focus inside the list is a deliberate
  // position, and collapsing under it would move the thing they're on.
  const scheduleAutoClose = useCallback(() => {
    cancelAutoClose();
    if (active === null) return;
    closeTimer.current = window.setTimeout(() => {
      closeTimer.current = null;
      const element = section.current;
      if (element && element.contains(document.activeElement)) return;
      close(active);
    }, AUTO_CLOSE_MS);
  }, [active, cancelAutoClose, close]);

  useEffect(() => cancelAutoClose, [cancelAutoClose]);

  return (
    <>
      <section
        id="work"
        ref={section}
        onMouseEnter={cancelAutoClose}
        onMouseLeave={scheduleAutoClose}
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
