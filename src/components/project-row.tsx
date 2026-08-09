"use client";

import { useCallback, useState, type FocusEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export type ProjectRowLink = { label: string; href: string; accent?: boolean };

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
};

/**
 * One row of the work list. Pointer devices open it on hover; touch and
 * keyboard open it on tap/Enter — the row is a real button with aria-expanded,
 * so it is never a hover-only affordance.
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
}: ProjectRowProps) {
  const [open, setOpen] = useState(false);

  const canHover = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover)").matches,
    [],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    setOpen((value) => !value);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={open}
      onMouseEnter={() => canHover() && setOpen(true)}
      onMouseLeave={() => canHover() && setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={onBlur}
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen((value) => !value);
      }}
      onKeyDown={onKeyDown}
      className={cn(
        "focus-visible:outline-accent-bright grid cursor-pointer border-t border-white/[0.12] py-4 transition-[grid-template-rows] duration-[450ms] ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:outline-2 focus-visible:outline-offset-4 md:py-[18px]",
        open ? "grid-rows-[auto_1fr]" : "grid-rows-[auto_0fr]",
        last && "border-b border-white/[0.12]",
      )}
    >
      <div className="pointer-events-none flex items-center gap-3 md:gap-4">
        <span className="shrink-0 text-[19px] font-bold tracking-[-0.02em] md:text-[26px]">
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
            "text-muted-foreground ml-auto shrink-0 text-xl transition-transform duration-300 md:ml-0",
            open && "translate-x-1",
          )}
        >
          →
        </span>
      </div>

      <div className="min-h-0 overflow-hidden">
        <div className="flex flex-col gap-4 pt-4 md:flex-row md:gap-5">
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
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                  className={cn(
                    "focus-visible:outline-accent-bright border-b pb-px text-[13.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                    link.accent
                      ? "text-accent-bright border-accent-bright/35 hover:border-accent-bright"
                      : "border-white/25 hover:border-white",
                  )}
                >
                  {link.label}
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
