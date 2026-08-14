"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { QrPanel } from "./qr-panel";

/**
 * The hero photograph, with the two things it was missing: a response to the
 * pointer, and a second side.
 *
 * The card had an entrance, a slow drift and a sheen, but nothing that
 * acknowledged the visitor — it was the one element on the page without a
 * state. Tilt fixes that on hover; the flip turns it into something worth
 * clicking, and gives three facts a place to live that a hero paragraph
 * couldn't hold.
 *
 * Layering matters here and is deliberate: `portrait-enter` stays on the outer
 * element, `portrait-drift` stays on the image itself, and tilt/flip act on the
 * frame in between. Three transforms, three elements, no contention.
 */

/**
 * Maximum rotation on either axis. Past roughly this the photograph stops
 * reading as a card catching light and starts reading as a page turning.
 */
const MAX_TILT_DEG = 7;

/** How far the highlight travels, as a share of the card, against the tilt. */
const MAX_GLARE_PCT = 26;

/**
 * How far the card closes the gap to the cursor's angle each frame. This is the
 * whole feel of the tilt: writing the target angle straight out teleports the
 * card under the pointer every frame, which reads as a snap however small the
 * angle is. Easing it in software rather than with a CSS transition is what
 * makes coming to rest as smooth as setting off — a transition would restart
 * itself on every frame and lag behind instead.
 */
const TILT_SMOOTHING = 0.12;

/** Close enough to level to stop the loop and write exact zeroes. */
const SETTLED = 0.03;

/** Must match the flip duration in globals.css. */
const FLIP_MS = 600;

/**
 * What the card's own code points at. Deliberately not the page you're already
 * standing on in spirit — but the site is what the design specified, and one
 * line changes it to the GitHub profile if that reads more useful on a phone.
 */
const OWNER_URL = "https://yushko.dev";

/**
 * The back's texture, hand-placed: `left, top, size, colour, radius`. Fixed
 * rather than random because the card is the same object on every visit.
 */
const BACK_BLOCKS: [number, number, number, string, number][] = [
  [10, 26, 44, "#0e0e0e", 6],
  [120, 14, 28, "#0c0c0c", 4],
  [196, 58, 46, "#101010", 6],
  [24, 296, 52, "#0d0d0d", 7],
  [162, 326, 38, "#111", 5],
  [98, 344, 30, "#0c0c0c", 4],
];

type Tilt = { tiltX: number; tiltY: number; glareX: number; glareY: number };
const LEVEL: Tilt = { tiltX: 0, tiltY: 0, glareX: 0, glareY: 0 };
const AXES = ["tiltX", "tiltY", "glareX", "glareY"] as const;

export function PortraitCard({ name }: { name: string }) {
  const t = useTranslations("PortraitCard");
  const frame = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const hovering = useRef(false);
  const current = useRef<Tilt>({ ...LEVEL });
  const rafId = useRef(0);
  const flipTimer = useRef<number | null>(null);
  /**
   * Half-turns taken, not a boolean. Toggling 0°↔180° made the card rewind
   * itself — the return was the first flip played backwards. Counting up means
   * every flip carries on the way it was already going, so the second one
   * finishes the revolution instead of undoing it.
   */
  const [turns, setTurns] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const flipped = turns % 2 === 1;
  // Mirrored so the animation loop, which outlives any one render, reads the
  // current side rather than whichever one it closed over.
  const turnsRef = useRef(0);
  const flippedRef = useRef(false);
  const flippingRef = useRef(false);
  const plate = useRef<HTMLButtonElement>(null);
  /** Set only by a deliberate flip, so the first render doesn't grab focus. */
  const flipAsked = useRef(false);

  // Read per gesture rather than once: a laptop with a touchscreen can answer
  // this differently depending on which input the visitor reached for.
  //
  // Never while the card is turned. The front is a photograph and tilting it is
  // the whole point; the back is a form, and a form that leans away from the
  // pointer is a form you cannot use. At 7° a 26px button travels several pixels
  // between mousedown and mouseup, which is enough for the two to land on
  // different elements and produce no click at all — and enough to walk out from
  // under a hover and back, over and over, as the cursor moves.
  const tiltable = useCallback(
    () =>
      !flippedRef.current &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const write = useCallback((value: Tilt) => {
    const element = frame.current;
    if (!element) return;
    element.style.setProperty("--tilt-x", `${value.tiltX}deg`);
    element.style.setProperty("--tilt-y", `${value.tiltY}deg`);
    element.style.setProperty("--glare-x", `${value.glareX}%`);
    element.style.setProperty("--glare-y", `${value.glareY}%`);
  }, []);

  const stopFrame = useCallback(() => {
    if (!rafId.current) return;
    cancelAnimationFrame(rafId.current);
    rafId.current = 0;
  }, []);

  /** Where the card wants to be right now — level unless a cursor is on it. */
  const goal = useCallback((): Tilt => {
    const element = frame.current;
    const point = pointer.current;
    if (!element || !point || !hovering.current || flippingRef.current) {
      return LEVEL;
    }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return LEVEL;

    // -1 to 1 from the centre of the card.
    const nx = ((point.x - rect.left) / rect.width) * 2 - 1;
    const ny = ((point.y - rect.top) / rect.height) * 2 - 1;
    // Facing the back means facing a mirror image, so the horizontal component
    // has to invert with it or the card leans away from the cursor.
    const direction = flippedRef.current ? -1 : 1;

    return {
      tiltX: -ny * MAX_TILT_DEG,
      tiltY: nx * MAX_TILT_DEG * direction,
      // Anti-phase: tilting a glossy print sweeps its highlight the other way.
      glareX: -nx * MAX_GLARE_PCT,
      glareY: -ny * MAX_GLARE_PCT,
    };
  }, []);

  /**
   * One loop for both directions. It keeps running while the pointer is on the
   * card and then for as long as it takes to ease back to level, which is why
   * arriving and leaving feel the same — there is no second mechanism for the
   * return, just the same easing with a target of zero.
   */
  const run = useCallback(() => {
    const element = frame.current;
    if (!element || rafId.current) return;
    element.dataset.tilting = "true";

    // A hoisted local rather than a memoised callback that schedules itself:
    // a self-referencing useCallback can only see the version of itself that
    // existed when it was created.
    function tick() {
      rafId.current = 0;
      // Re-read rather than closing over the element: a hoisted declaration is
      // callable before the null check above, so TypeScript drops that
      // narrowing here — and reading the ref per frame is honest anyway.
      const live = frame.current;
      if (!live) return;

      const want = goal();
      const at = current.current;
      const next: Tilt = { ...at };
      let moving = false;
      for (const axis of AXES) {
        const delta = want[axis] - at[axis];
        if (Math.abs(delta) > SETTLED) {
          next[axis] = at[axis] + delta * TILT_SMOOTHING;
          moving = true;
        } else {
          next[axis] = want[axis];
        }
      }
      current.current = next;
      write(next);

      if (moving || hovering.current) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        live.dataset.tilting = "false";
      }
    }

    rafId.current = requestAnimationFrame(tick);
  }, [goal, write]);

  useEffect(
    () => () => {
      stopFrame();
      if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
    },
    [stopFrame],
  );

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!tiltable()) return;
    // Only the coordinates are taken here. Measuring the card on every pointer
    // event would read layout far more often than the screen can show it, so
    // the rect and the maths wait for the frame.
    pointer.current = { x: event.clientX, y: event.clientY };
    hovering.current = true;
    run();
  }

  function onPointerLeave() {
    // No jump to level: the loop keeps going and eases there.
    hovering.current = false;
    run();
  }

  /**
   * Focus follows the card round. Whichever control did the turning goes inert
   * on the side now facing away, and without this a keyboard user is left on
   * the document body halfway through their own gesture.
   */
  useEffect(() => {
    if (!flipAsked.current) return;
    flipAsked.current = false;
    if (!flipped) {
      plate.current?.focus();
      return;
    }
    const field = frame.current?.querySelector<HTMLInputElement>(
      ".portrait-back input",
    );
    // Selected, not just focused. The field arrives carrying the owner's link,
    // and a caret parked in front of it means the first thing anyone who wants
    // their own code has to do is clear someone else's — so typing replaces it
    // and a click still places the caret normally.
    field?.focus();
    field?.select();
  }, [flipped]);

  /**
   * Turns the card back over if the viewport drops below the width that can hold
   * its back.
   *
   * The flip plate is hidden below `md`, so there is no way *in* down there, but
   * nothing undid a flip that had already happened: a browser dragged across 768
   * while turned lands on a 146px-wide QR panel. Escapable — the back's own footer
   * control is not gated by width — but not worth showing in the first place.
   *
   * Only ever turns towards the front, and only from a back that is already
   * facing, so it cannot fight a deliberate flip.
   *
   * Unverified in the browser I test in: `matchMedia` change events do not fire
   * there, along with `ResizeObserver`, `IntersectionObserver` and
   * `requestAnimationFrame`. The four lines are what they look like.
   */
  useEffect(() => {
    const wide = window.matchMedia("(width >= 48rem)");
    const onChange = () => {
      if (wide.matches || !flippedRef.current) return;
      toggleFlip();
    };
    wide.addEventListener("change", onChange);
    return () => wide.removeEventListener("change", onChange);
  });

  function toggleFlip() {
    flipAsked.current = true;
    // The tilt eases out of the way rather than being cut to zero — a tilt
    // still applied while the card turns reads as a wobble off its axis.
    hovering.current = false;
    flippingRef.current = true;
    run();

    const next = turnsRef.current + 1;
    turnsRef.current = next;
    flippedRef.current = next % 2 === 1;
    setTurns(next);
    setFlipping(true);
    if (flipTimer.current !== null) window.clearTimeout(flipTimer.current);
    flipTimer.current = window.setTimeout(() => {
      flippingRef.current = false;
      setFlipping(false);
    }, FLIP_MS);
  }

  return (
    // `portrait-enter` keeps its own element, above everything the card does.
    // No longer desktop-only. The phone was getting a 44px round crop of the same
    // photograph beside the availability line — a thumbnail standing in for the
    // one object on this page that is meant to be handled.
    <div className="portrait-enter relative shrink-0">
      <div
        ref={frame}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        data-flipping={flipping}
        // The shadow lives out here, on the one element that never rotates: a
        // shadow that turns with the card unsticks it from the surface.
        className="portrait-frame relative rounded-[18px] shadow-[0_26px_70px_-12px_rgba(0,0,0,0.85)]"
        style={{ "--flip": `${turns * 180}deg` } as CSSProperties}
      >
        <div className="portrait-flipper relative">
          {/* Front. Everything that made the card read as a print rather than a
              sticker stays exactly as it was — vignette, amber from the hero's
              light source, sheen, hairline, one lit edge — with the glare added
              as one more layer alongside them.

              width/height are the file's real 640x960. With `w-auto` the browser
              sizes from the attribute ratio, so a stale value here stretches the
              photo rather than merely reserving the wrong box.

              `priority`, not lazy: a real PageSpeed run named this element the
              desktop LCP candidate, and lazy-loading the LCP image is exactly
              the mistake that diagnostic exists to catch. */}
          <div
            aria-hidden={flipped}
            inert={flipped}
            className="portrait-face relative overflow-hidden rounded-[18px]"
          >
            <Image
              src="/portrait.webp"
              alt={name}
              width={640}
              height={960}
              priority
              /* 280 on a phone, 450 from md. The photo is 640x960, so those are
               187 and 300 wide. The larger figure is what the QR panel on the
               back needed: at 253 wide the panel had 204px for its ticket and
               9.5px for its hint, and it read as cramped because it was. At 300
               the ticket is 252 — a quarter more code for the same card. The
               headline keeps 37px of headroom in the column that leaves, measured
               at 768 where that column is narrowest. */
            className="portrait-drift block h-[210px] w-auto md:h-[450px]" 
            />

            {/* Sinks the photograph's own edges so it reads as printed into
                the card rather than pasted on top of it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.6)]"
            />

            {/* The fixed amber wash that used to sit here is gone. It was
                standing in for light from the hero's upper left, but the glare
                below now *is* that light and it moves — two highlights on one
                surface, one of them nailed down, read as a tint on the photo
                rather than as light on it. */}

            {/* The glare that answers the tilt. Soft and wide, because the
                highlight on a print is a region rather than a spot. */}
            <div
              aria-hidden
              className="portrait-glare pointer-events-none absolute inset-0"
            />

            {/* The sheen. Kept to white at 7% — the subject is lit from one
                side and mostly in shadow, so anything stronger stops looking
                like light on skin and starts looking like a swipe effect. */}
            <div
              aria-hidden
              className="portrait-sheen pointer-events-none absolute -inset-x-1/4 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.07)_45%,rgba(255,255,255,0))]"
            />

            {/* Hairline last, so neither the vignette nor the sheen paints
                over it and softens the card's edge. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[18px] border border-white/[0.14]"
            />
            {/* One lit edge along the top, the way a physical print catches a
                room light — a uniform border reads as a UI box. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.32),rgba(255,255,255,0))]"
            />
          </div>

          {/* Back. A working QR generator on paper — the reward for turning the
              card over. `inert`, not just `aria-hidden`: the panel has a text
              field and three controls, and without it Tab lands in an input
              nobody can see, on the side of the card facing away. */}
          <div
            aria-hidden={!flipped}
            inert={!flipped}
            className="portrait-face portrait-back absolute inset-0 overflow-hidden rounded-[18px] border border-white/[0.14] bg-[#0a0a0a] px-6 py-7"
          >
            {/* The page's block texture, placed rather than tiled: at this size
                the shared bitmap would scale into mush. */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              {BACK_BLOCKS.map(([left, top, size, tone, radius]) => (
                <div
                  key={`${left}-${top}`}
                  className="absolute"
                  style={{
                    left,
                    top,
                    width: size,
                    height: size,
                    borderRadius: radius,
                    background: tone,
                  }}
                />
              ))}
            </div>

            <QrPanel ownerUrl={OWNER_URL} onFlipBack={toggleFlip} />
          </div>
        </div>

        {/* The front's flip affordance: a transparent plate over the photograph,
            which has nothing else to click. It goes inert while the card is
            turned, because from there the back's own footer button is what
            flips it and two competing controls would just fight for the tab
            stop.

            Absent below `md`, which is what keeps the QR panel off a phone. Beside
            the text at 375px the card is ~140px wide, so that panel would get
            ~90px for a tool that needs 180 — measured at 194px wide it already
            squeezed its own ticket from a square into 94x142 and wrapped the
            privacy note onto two lines. The photograph is the whole card there;
            the generator waits for a viewport that can hold it. */}
        <button
          ref={plate}
          type="button"
          onClick={toggleFlip}
          aria-pressed={flipped}
          aria-label={t("flip")}
          inert={flipped}
          className="focus-visible:outline-accent-bright absolute inset-0 z-10 hidden cursor-pointer rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 md:block"
        />
      </div>
    </div>
  );
}
