"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ProjectRow, type ProjectRowLink } from "./project-row";
import { Reveal } from "./reveal";
import type { ProjectMedia } from "@/lib/projects";

/**
 * How long an open row survives after the pointer leaves the list. The section
 * is capped at max-w-5xl, so on a wide monitor "moved the cursor aside so it
 * isn't in the way" and "left the list" are the same gesture — two seconds
 * closed the panel out from under someone who was still reading it.
 */
const AUTO_CLOSE_MS = 5000;

export type ShowcaseRow = {
  slug: string;
  title: string;
  status: string;
  statusTone: "live" | "production";
  short: string;
  description: string;
  metrics: { value: string; label: string }[];
  stack: string[];
  media?: ProjectMedia;
  mediaLink?: { href: string; label: string };
  screenshotPlaceholder?: string;
  links: ProjectRowLink[];
  note?: string;
};

export function WorkShowcase({
  rows,
  heading,
  hint,
  statusLine,
}: {
  rows: ShowcaseRow[];
  heading: string;
  hint: string;
  /**
   * Slot under the heading. Owned by the caller because what belongs there is
   * about a particular project, and this component only knows about rows.
   */
  statusLine?: ReactNode;
}) {
  const [active, setActive] = useState<number | null>(null);
  const headers = useRef<(HTMLElement | null)[]>([]);
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
          {/* Bigger than the rows it introduces and bigger than the services cards
              above it, on a phone. At 15px it was the smallest heading in a
              stack that ran 17px services and 19px project titles — the label
              of the most important section on the page, losing to both.
              Unchanged from md. */}
          <h2 className="m-0 text-[1.3125rem] font-bold tracking-[-0.01em] md:text-[0.9375rem] md:tracking-[0.02em]">
            {heading}
          </h2>
          <span className="text-muted-foreground font-mono text-[0.6875rem] md:text-[0.71875rem]">
            {hint}
          </span>
        </Reveal>

        {statusLine}

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
