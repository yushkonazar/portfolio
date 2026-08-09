"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type ProjectRowLink = { label: string; href: string; accent?: boolean };

/**
 * Hover has to mean "I stopped here", not "I passed through". Without this
 * pause, dragging the pointer down to a link inside an open panel trips every
 * row on the way and the list churns. Long enough to filter a traversal,
 * short enough that a deliberate hover still feels immediate.
 */
const HOVER_INTENT_MS = 110;

export type ProjectRowProps = {
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
  registerHeader: (element: HTMLDivElement | null) => void;
};

/**
 * One row of the work list. Open/closed state is owned by the parent so only
 * one row is ever open and so the parent can compensate the scroll position
 * when heights change — a row expanding above the cursor used to drag the
 * whole list out from under it.
 */
export function ProjectRow({
  title,
  status,
  statusTone,
  short,
  description,
  metrics,
  stack,
  screenshot,
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

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    if (open) onClose();
    else onOpen(false);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      onClose();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onMouseEnter={() => {
        if (!canHover() || open) return;
        cancelIntent();
        intent.current = window.setTimeout(() => {
          intent.current = null;
          onOpen(true);
        }, HOVER_INTENT_MS);
      }}
      onMouseLeave={cancelIntent}
      onFocus={() => onOpen(false)}
      onBlur={onBlur}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        // A click is unambiguous — don't let a pending hover reopen it.
        cancelIntent();
        if (open) onClose();
        else onOpen(true);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        "focus-visible:outline-accent-bright grid cursor-pointer border-t border-white/[0.12] py-4 transition-[grid-template-rows] duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none md:py-[18px]",
        open ? "grid-rows-[auto_1fr]" : "grid-rows-[auto_0fr]",
        last && "border-b border-white/[0.12]",
      )}
    >
      <div
        ref={registerHeader}
        className="pointer-events-none flex items-center gap-3 md:gap-4"
      >
        <span
          className={cn(
            "shrink-0 text-[19px] font-bold tracking-[-0.02em] transition-colors duration-300 md:text-[26px]",
            open && "text-accent-bright",
          )}
        >
          {title}
        </span>
        <span
          className={cn(
            "shrink-0 rounded-[5px] px-2 py-[3px] font-mono text-[10px] leading-[1.5] tracking-[0.06em] md:text-[10.5px]",
            statusTone === "live"
              ? "bg-emerald-500/12 text-emerald-400"
              : "bg-accent/15 text-accent-bright",
          )}
        >
          {status}
        </span>
        <span className="text-muted-foreground hidden min-w-0 flex-1 truncate text-[14.5px] md:block">
          {short}
        </span>
        <span
          aria-hidden
          className={cn(
            "text-muted-foreground ml-auto shrink-0 text-xl transition-transform duration-300 motion-reduce:transition-none md:ml-0",
            open && "text-accent-bright translate-x-1",
          )}
        >
          →
        </span>
      </div>

      <div className="min-h-0 overflow-hidden">
        {/* The panel lags the row's own expansion slightly and rises into
            place, so the two movements read as one gesture rather than a box
            snapping open. */}
        <div
          className={cn(
            "flex flex-col gap-4 pt-4 transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none md:flex-row md:gap-5",
            open
              ? "translate-y-0 opacity-100 delay-[80ms]"
              : "translate-y-2 opacity-0",
          )}
        >
          {screenshot ? (
            <div className="skeleton relative h-[150px] w-full shrink-0 overflow-hidden rounded-[10px] border border-white/[0.12] md:h-[184px] md:w-[340px]">
              <Image
                src={screenshot.src}
                alt={title}
                width={screenshot.width}
                height={screenshot.height}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            </div>
          ) : (
            <div className="placeholder-hatch flex h-[150px] w-full shrink-0 items-center justify-center rounded-[10px] border border-white/[0.12] text-center md:h-[184px] md:w-[340px]">
              <span className="text-muted-foreground max-w-[200px] font-mono text-[11px] leading-[1.5]">
                {screenshotPlaceholder}
              </span>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
            <p className="text-muted-foreground m-0 text-sm leading-relaxed text-pretty md:text-[14.5px]">
              {description}
            </p>

            <div className="text-muted-foreground flex flex-wrap gap-x-6 gap-y-2 text-[13px] md:text-[13.5px]">
              {metrics.map((metric) => (
                <span key={metric.value + metric.label}>
                  <b className="text-foreground font-bold">{metric.value}</b>{" "}
                  {metric.label}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {stack.map((item) => (
                <span
                  key={item}
                  className="text-muted-foreground rounded-[5px] border border-white/[0.14] px-2 py-1 font-mono text-[11px] leading-none"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="pointer-events-auto flex flex-wrap items-center gap-x-3.5 gap-y-2">
              {links.map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  // Every row uses the same label ("Read the case study" etc.)
                  // for a different destination — indistinguishable out of
                  // context for anyone navigating by a links list.
                  aria-label={`${link.label} — ${title}`}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                  // The visible underline stays tight to the text on an inner
                  // span; the tap target itself is padded out on a negative
                  // margin, so touch reaches it well before the row underneath
                  // that toggles open/closed on the same gesture.
                  className="focus-visible:outline-accent-bright group -m-2 inline-flex items-center p-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span
                    className={cn(
                      "border-b pb-px text-[13.5px] font-bold transition-colors",
                      link.accent
                        ? "text-accent-bright border-accent-bright/35 group-hover:border-accent-bright"
                        : "border-white/25 group-hover:border-white",
                    )}
                  >
                    {link.label}
                  </span>
                </a>
              ))}
              {note && (
                <span className="text-muted-foreground font-mono text-[11.5px]">
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
