"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { HEADER_CONTROL, HEADER_ICON } from "./control-styles";

/**
 * The disclosure behind the header's two menus.
 *
 * Extracted when the second one arrived rather than left as a pattern to copy:
 * two hand-written copies of "close on outside press, close on Escape, hand focus
 * back, close when focus leaves" are two chances for one of them to quietly stop
 * doing one of those things.
 *
 * A disclosure holding buttons, not `role="menu"`. A menu promises arrow-key
 * navigation and typeahead, and a menu role without them is a worse lie than no
 * role at all.
 *
 * Plain nodes rather than render props, so nothing here needs a function passed
 * across a client boundary — the panel closes on any click that reaches it, and
 * the only clickable things inside are the options, so a click *is* a selection.
 */
export function HeaderPopover({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  /** The trigger's accessible name — already carrying the current value. */
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const dismiss = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }, []);

  // A press anywhere else closes it. `pointerdown` rather than `click`, so the
  // panel is gone before whatever was pressed underneath begins to act.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Opening moves focus into the thing that just appeared rather than leaving it
  // behind the thing that appeared.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  return (
    <div
      ref={wrap}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return;
        event.preventDefault();
        dismiss(true);
      }}
      // Tab out of the last option closes it, and only when focus has actually
      // left this control — `relatedTarget` is what tells those two apart.
      onBlur={(event) => {
        if (!event.relatedTarget || !wrap.current?.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
      className="relative"
    >
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        className={cn(HEADER_CONTROL, open && "text-accent-bright")}
      >
        {icon}
      </button>

      {/* Unmounted while closed rather than hidden. There is nothing in here
          worth pre-rendering, and an element that is only invisible is how a
          control ends up reachable by Tab while looking shut. */}
      {open && (
        <div
          ref={panel}
          id={id}
          onClick={() => setOpen(false)}
          className="absolute top-[calc(100%+7px)] right-0 z-50 min-w-[9.5rem] overflow-hidden rounded-lg border border-white/[0.12] bg-[#0b0b0b] py-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]"
        >
          {children}
        </div>
      )}
    </div>
  );
}

/** The icon size both triggers draw at — re-exported so callers don't have to
 * know which module the header's shared classes live in. */
export { HEADER_ICON };

/**
 * One row in a header popover. A mark carries the live state as well as colour,
 * because colour alone is the same information twice for anyone who can see it
 * and none at all for anyone who can't.
 */
export function HeaderPopoverItem({
  current,
  onSelect,
  lang,
  label,
  trailing,
}: {
  current: boolean;
  onSelect: () => void;
  lang?: string;
  label: string;
  trailing?: string;
}) {
  return (
    <button
      type="button"
      lang={lang}
      onClick={onSelect}
      aria-current={current ? "true" : undefined}
      className={cn(
        "focus-visible:outline-accent-bright flex w-full cursor-pointer items-center gap-2 px-3 py-[7px] text-left text-[0.8125rem] transition-colors focus-visible:-outline-offset-2 focus-visible:outline-2",
        current
          ? "text-accent-bright"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
      )}
    >
      <span aria-hidden className="w-3 shrink-0 text-center">
        {current ? "·" : ""}
      </span>
      {label}
      {trailing && (
        <span
          aria-hidden
          className="ml-auto font-mono text-[0.625rem] tracking-[0.1em] uppercase opacity-45"
        >
          {trailing}
        </span>
      )}
    </button>
  );
}
