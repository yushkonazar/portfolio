"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * One quiet nudge toward the burst hidden in the background.
 *
 * Clicking anywhere on the page has spawned a cluster of traces since the
 * canvas landed, and there has never been any way to find that out. An easter
 * egg nobody knows about isn't one. This says so once — at the point where the
 * visitor has demonstrably stayed to read rather than bounced — and then never
 * again for the rest of the session.
 */

/**
 * How long after the visitor first moves the mouse the hint appears.
 *
 * It used to wait for half the page to be scrolled as well, which turned out to
 * be both unreliable and pointing at the wrong moment: the burst is most visible
 * in the hero, where the trace field actually runs, and by 50% scroll that's off
 * screen. One condition — a cursor exists and has been still-ish for a beat —
 * fires for every mouse visitor, right where there's something to see.
 */
const DELAY_MS = 3500;

/** How long the label stays up. Matches `hint-flash` in globals.css. */
const VISIBLE_MS = 2600;

const SEEN_KEY = "burst-hint-seen";

export function BurstHint() {
  const t = useTranslations("HomePage");
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    // A hint about clicking the background is for people holding something to
    // click it with.
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (sessionStorage.getItem(SEEN_KEY)) return;

    const listeners = new AbortController();

    const show = () => {
      const point = pointer.current;
      if (!point) return;
      listeners.abort();
      // Written before it's shown, so a reload mid-hint doesn't earn a second.
      sessionStorage.setItem(SEEN_KEY, "1");
      setAt(point);
      timer.current = window.setTimeout(() => setAt(null), VISIBLE_MS);
    };

    // The clock starts on the first sign of a mouse and isn't restarted after
    // that, so the label lands wherever the cursor happens to be by then.
    const track = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      if (timer.current === null) timer.current = window.setTimeout(show, DELAY_MS);
    };

    window.addEventListener("pointermove", track, {
      passive: true,
      signal: listeners.signal,
    });

    return () => {
      listeners.abort();
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  if (!at) return null;

  return (
    // Hidden from assistive tech on purpose: it points at a decorative canvas
    // toy with nothing to operate and no information behind it, and a label
    // appearing unasked in a live region would only interrupt.
    <span
      aria-hidden
      className="burst-hint text-accent-bright pointer-events-none fixed z-40 font-mono text-[11px] tracking-[0.08em] whitespace-nowrap"
      style={{ left: at.x + 16, top: at.y + 18 }}
    >
      {t("burstHint")} ✦
    </span>
  );
}
