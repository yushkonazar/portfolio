"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ProjectMedia } from "@/lib/projects";

export type ProjectRowLink = { label: string; href: string; accent?: boolean };

/**
 * Hover has to mean "I stopped here", not "I passed through". Without this
 * pause, dragging the pointer down to a link inside an open panel trips every
 * row on the way and the list churns. Long enough to filter a traversal,
 * short enough that a deliberate hover still feels immediate.
 */
const HOVER_INTENT_MS = 110;

/**
 * How long a metric takes to count from zero to its value. Slow enough to be
 * read as counting: at 600ms with an ease-out the digits were at their final
 * value before the eye had found them.
 */
const COUNT_UP_MS = 1400;

/**
 * The row and its panel both ease on `cubic-bezier(.4,.05,.2,1)`, written out
 * literally at each use site because Tailwind only generates classes it can find
 * as literal strings in the source. It replaces `cubic-bezier(.2,.8,.2,1)`,
 * which covered about four fifths of its distance in the first third of its
 * time — that lands as a snap followed by a crawl. This one spends its speed in
 * the middle, where the eye is actually following the movement.
 */

/** Shared by the linked and unlinked frame so the two are pixel-identical. */
const MEDIA_FRAME_CLASS =
  "skeleton relative h-[150px] w-full shrink-0 overflow-hidden rounded-[10px] border border-white/[0.12] md:h-[184px] md:w-[340px]";

export type ProjectRowProps = {
  /** Namespaces the button/panel ids that wire the two together. */
  slug: string;
  title: string;
  status: string;
  statusTone: "live" | "production";
  short: string;
  description: string;
  metrics: { value: string; label: string }[];
  stack: string[];
  media?: ProjectMedia;
  /**
   * Where the media frame leads, and what a screen reader should call it. The
   * parent supplies the name because the row can't phrase it in two languages.
   */
  mediaLink?: { href: string; label: string };
  screenshotPlaceholder?: string;
  links: ProjectRowLink[];
  note?: string;
  last?: boolean;
  open: boolean;
  /**
   * `anchor` asks the parent to pin this row where it is while the list
   * resizes. The parent does the measuring — it owns the header ref, so
   * measuring there guarantees the before/after readings are of the same
   * element. Measuring the row here instead was off by the row's padding.
   */
  onOpen: (anchor: boolean) => void;
  onClose: () => void;
  registerHeader: (element: HTMLElement | null) => void;
};

/**
 * One row of the work list. Open/closed state is owned by the parent so only
 * one row is ever open and so the parent can compensate the scroll position
 * when heights change — a row expanding above the cursor used to drag the
 * whole list out from under it.
 */
export function ProjectRow({
  slug,
  title,
  status,
  statusTone,
  short,
  description,
  metrics,
  stack,
  media,
  mediaLink,
  screenshotPlaceholder,
  links,
  note,
  last,
  open,
  onOpen,
  onClose,
  registerHeader,
}: ProjectRowProps) {
  const canHover = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches,
    [],
  );

  const intent = useRef<number | null>(null);
  const cancelIntent = useCallback(() => {
    if (intent.current === null) return;
    window.clearTimeout(intent.current);
    intent.current = null;
  }, []);
  useEffect(() => cancelIntent, [cancelIntent]);

  const summary = useRef<HTMLButtonElement | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  /**
   * Escape sends focus back to the summary button, and that button opens the
   * row on focus — so one focus move, and only that one, has to be exempt.
   */
  const skipFocusOpen = useRef(false);

  const summaryId = `${slug}-summary`;
  const panelId = `${slug}-panel`;

  // `preload="none"` keeps a video preview off the wire until someone actually
  // opens the row, which also means nothing but this starts it playing.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (!open) {
      element.pause();
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Autoplay policies can refuse even a muted video; the poster stays up.
    element.play().catch(() => undefined);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !open) return;
    const header = summary.current;
    // Focus may be on a link inside the panel that is about to collapse.
    if (header && document.activeElement !== header) {
      skipFocusOpen.current = true;
      header.focus();
    }
    onClose();
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      onClose();
    }
  };

  return (
    <div
      onMouseEnter={() => {
        if (!canHover() || open) return;
        cancelIntent();
        intent.current = window.setTimeout(() => {
          intent.current = null;
          onOpen(true);
        }, HOVER_INTENT_MS);
      }}
      onMouseLeave={cancelIntent}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={cn(
        // `grid-cols-[minmax(0,1fr)]` is load-bearing, not tidiness. An implicit
        // column is `auto`, which means max-content, and this row's max-content
        // is its title plus its status pill plus the *untruncated* one-liner plus
        // the arrow. Measured at 768px: the grid box was 665px wide while its own
        // column computed to 730px, so the row overflowed the page and an iPad in
        // portrait scrolled sideways by 21px. The one-liner has `min-w-0` and
        // `flex-basis: 0` and truncates — but only against a definite width, and
        // a max-content column never gives it one.
        "grid cursor-pointer grid-cols-[minmax(0,1fr)] border-t border-white/[0.12] py-4 transition-[grid-template-rows] duration-[560ms] ease-[cubic-bezier(.4,.05,.2,1)] motion-reduce:transition-none md:py-[18px]",
        open ? "grid-rows-[auto_1fr]" : "grid-rows-[auto_0fr]",
        last && "border-b border-white/[0.12]",
      )}
    >
      <button
        type="button"
        id={summaryId}
        ref={(element) => {
          summary.current = element;
          registerHeader(element);
        }}
        aria-expanded={open}
        aria-controls={panelId}
        // A button is named by its contents, and this row's contents run to a
        // paragraph. The name says which row this is; the panel below carries
        // the prose, where a screen reader can read it as prose.
        aria-label={`${title} — ${status}`}
        onFocus={(event) => {
          if (skipFocusOpen.current) {
            skipFocusOpen.current = false;
            return;
          }
          // Opening on focus is for keyboard navigation. A pointer press
          // focuses the button too, and honouring that would leave the click
          // arriving right behind it with nothing to do but close the row
          // again — which is how a tap, with no hover to open first, would
          // come to do nothing at all.
          if (!event.currentTarget.matches(":focus-visible")) return;
          onOpen(false);
        }}
        onClick={() => {
          // A click is unambiguous — don't let a pending hover reopen it.
          cancelIntent();
          if (open) onClose();
          else onOpen(true);
        }}
        className="focus-visible:outline-accent-bright flex w-full cursor-pointer items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 md:gap-4"
      >
        <span
          className={cn(
            "shrink-0 text-[1.1875rem] font-bold tracking-[-0.02em] transition-colors duration-300 md:text-[1.625rem]",
            open && "text-accent-bright",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-[5px] px-2 py-[3px] font-mono text-[0.625rem] leading-[1.5] tracking-[0.06em] md:text-[0.65625rem]",
            statusTone === "live"
              ? "bg-emerald-500/12 text-emerald-400"
              : "bg-accent/15 text-accent-bright",
          )}
        >
          {status}
        </span>
        <span className="text-muted-foreground hidden min-w-0 flex-1 truncate text-[0.90625rem] md:block">
          {short}
        </span>
        {/* Pointing down once the panel is out, so "open" is legible from the
            glyph alone rather than from a nudge to the right. */}
        <span
          aria-hidden
          className={cn(
            "text-muted-foreground ml-auto shrink-0 text-xl transition-transform duration-300 motion-reduce:transition-none md:ml-0",
            open && "text-accent-bright rotate-90",
          )}
        >
          →
        </span>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={summaryId}
        className="min-h-0 overflow-hidden"
      >
        {/* The panel lags the row's own expansion slightly and rises into
            place, so the two movements read as one gesture rather than a box
            snapping open.

            `translate`, not `transform`: Tailwind v4 writes `translate-y-*` to
            the standalone `translate` property, so the old
            `transition-[opacity,transform]` never covered it — the rise wasn't
            eased at all, it jumped while only the opacity faded. That was most
            of what made this feel abrupt. */}
        <div
          className={cn(
            "flex flex-col gap-4 pt-4 transition-[opacity,translate] duration-[520ms] ease-[cubic-bezier(.4,.05,.2,1)] motion-reduce:transition-none md:flex-row md:gap-5",
            open
              ? "translate-y-0 opacity-100 delay-[90ms]"
              : "translate-y-3 opacity-0",
          )}
        >
          {media ? (
            // A 340x184 frame of a running product invites a click, and until
            // now there was nothing under it — the image swallowed the click
            // and the row didn't toggle either. Where there's a demo, it goes
            // there; where there isn't, the frame stays inert rather than
            // pretending.
            mediaLink ? (
              <a
                href={mediaLink.href}
                target="_blank"
                rel="noreferrer"
                aria-label={mediaLink.label}
                className={cn(
                  MEDIA_FRAME_CLASS,
                  "hover:border-accent-bright/60 focus-visible:outline-accent-bright block transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                )}
              >
                <MediaInner media={media} title={title} videoRef={video} />
              </a>
            ) : (
              <div className={MEDIA_FRAME_CLASS}>
                <MediaInner media={media} title={title} videoRef={video} />
              </div>
            )
          ) : (
            <div className="placeholder-hatch flex h-[150px] w-full shrink-0 items-center justify-center rounded-[10px] border border-white/[0.12] text-center md:h-[184px] md:w-[340px]">
              <span className="text-muted-foreground max-w-[200px] font-mono text-[0.6875rem] leading-[1.5]">
                {screenshotPlaceholder}
              </span>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
            <p className="text-muted-foreground m-0 text-sm leading-relaxed text-pretty md:text-[0.90625rem]">
              {description}
            </p>

            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] md:text-[0.84375rem]">
              {metrics.map((metric) => (
                <span key={metric.value + metric.label}>
                  <b className="text-foreground font-bold">
                    <CountUp value={metric.value} running={open} />
                  </b>{" "}
                  {metric.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {stack.map((item) => (
                <span
                  key={item}
                  className="text-muted-foreground rounded-[5px] border border-white/[0.14] px-2 py-1 font-mono text-[0.6875rem] leading-none"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2">
              {links.map((link) => {
                // The case study is a page on this site; the demo and the
                // repository are not. Only the first should navigate in place.
                const external = link.href.startsWith("http");
                const label = (
                  <span
                    className={cn(
                      "border-b pb-px text-[0.84375rem] font-bold transition-colors",
                      link.accent
                        ? "text-accent-bright border-accent-bright/35 group-hover:border-accent-bright"
                        : "border-white/25 group-hover:border-white",
                    )}
                  >
                    {link.label}
                  </span>
                );
                const shared = {
                  // Every row uses the same label ("Read the case study" etc.)
                  // for a different destination — indistinguishable out of
                  // context for anyone navigating by a links list.
                  "aria-label": `${link.label} — ${title}`,
                  // The visible underline stays tight to the text on an inner
                  // span; the tap target itself is padded out on a negative
                  // margin, so touch reaches it well before the row underneath
                  // that toggles open/closed on the same gesture.
                  className:
                    "focus-visible:outline-accent-bright group -m-2 inline-flex items-center p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                };

                return external ? (
                  <a
                    key={link.href + link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    {...shared}
                  >
                    {label}
                  </a>
                ) : (
                  <Link key={link.href + link.label} href={link.href} {...shared}>
                    {label}
                  </Link>
                );
              })}
              {note && (
                <span className="text-muted-foreground font-mono text-[0.71875rem]">
                  {note}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The frame's contents, identical whether or not the frame is a link. */
function MediaInner({
  media,
  title,
  videoRef,
}: {
  media: ProjectMedia;
  title: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  if (media.type === "video") {
    return (
      <video
        ref={videoRef}
        src={media.src}
        poster={media.poster}
        width={media.width}
        height={media.height}
        aria-label={title}
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover object-top"
      />
    );
  }
  return (
    <Image
      src={media.src}
      alt={title}
      width={media.width}
      height={media.height}
      loading="lazy"
      className="absolute inset-0 h-full w-full object-cover object-top"
    />
  );
}

/**
 * Splits a metric into the part that can count and the parts that can't. The
 * number has to lead — "Jun 2026" holds a number, but counting up to a year is
 * nonsense — so a leading "~" is the only thing allowed in front of it.
 * Anything without a number at all ("Zod", "Auth-gated") never matches.
 */
const COUNTABLE = /^(~?)([\d,]+(?:\.\d+)?)(\D*)$/;

type Countable = {
  prefix: string;
  suffix: string;
  target: number;
  /** Reproduces the source's own decimals and thousands separators. */
  format: (value: number) => string;
};

function parseCountable(value: string): Countable | null {
  const match = COUNTABLE.exec(value);
  if (!match) return null;

  const [, prefix, digits, suffix] = match;
  const decimals = (digits.split(".")[1] ?? "").length;
  const grouped = digits.includes(",");
  const target = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;

  return {
    prefix,
    suffix,
    target,
    format: (current) =>
      grouped
        ? current.toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          })
        : current.toFixed(decimals),
  };
}

/**
 * Counts a numeric metric up from zero when its row opens. The final frame
 * hands rendering back to the original string rather than reformatting it, so
 * what settles on screen is always exactly what the data says.
 */
function CountUp({ value, running }: { value: string; running: boolean }) {
  const countable = useMemo(() => parseCountable(value), [value]);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!countable || !running) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - started) / COUNT_UP_MS);
      if (progress >= 1) {
        setShown(null);
        return;
      }
      // Smoothstep rather than a cubic ease-out: an ease-out reaches its last
      // few percent almost immediately, so the number looked final long before
      // it stopped. This spins up, runs, and settles.
      const eased = progress * progress * (3 - 2 * progress);
      setShown(countable.format(countable.target * eased));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [countable, running]);

  if (!running || shown === null || !countable) return <>{value}</>;
  return (
    <>
      {countable.prefix}
      {shown}
      {countable.suffix}
    </>
  );
}
