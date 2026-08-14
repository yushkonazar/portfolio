"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GlobeIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { HEADER_CONTROL, HEADER_ICON } from "./control-styles";

/**
 * Each language named in itself, which is the one rule a language list has: a
 * reader looking for their own language is looking for the word they would use
 * for it, not for our translation of it. So these are not in the message
 * catalogue — "English" is not localised into Ukrainian here, it is the label.
 */
const NATIVE: Record<Locale, string> = {
  uk: "Українська",
  en: "English",
};

/**
 * One button that opens the list.
 *
 * A disclosure holding two buttons rather than `role="menu"`: a menu promises
 * arrow-key navigation and typeahead, and a menu role without them is a worse
 * lie than no role at all. The trigger says `aria-expanded` and owns the panel,
 * Tab walks the options and leaves, Escape closes and hands focus back.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Header");

  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) trigger.current?.focus();
  }, []);

  // A press anywhere else closes it. `pointerdown` rather than `click`, so the
  // panel is gone before whatever was clicked underneath begins to act.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Opening moves focus onto the first option, so the keyboard lands in the
  // thing that just appeared instead of behind it.
  useEffect(() => {
    if (open) panel.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      close(true);
    }
  }

  // Tab out of the last option should close it, and only when focus has actually
  // left this control — `relatedTarget` is what tells those two apart.
  function onBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (!event.relatedTarget || !wrap.current?.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  function choose(next: Locale) {
    // Closed before navigating, and without taking focus back to a trigger the
    // next render replaces anyway.
    setOpen(false);
    if (next !== locale) router.replace(pathname, { locale: next });
  }

  return (
    <div
      ref={wrap}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      className="relative"
    >
      {/* The same box as the GitHub mark beside it, from the same constant, so
          the pair reads as one set and cannot drift apart. That makes it
          icon-only: the locale code it used to show is the one thing lost, and
          it is carried by the label for assistive tech, by the marked option in
          the list, and — for anyone who can see the page at all — by the language
          the page is written in. */}
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="locale-list"
        aria-label={`${t("language")}: ${NATIVE[locale as Locale]}`}
        className={cn(HEADER_CONTROL, open && "text-accent-bright")}
      >
        <GlobeIcon className={HEADER_ICON} />
      </button>

      {/* Kept out of the DOM while closed rather than hidden: there is nothing
          in here worth pre-rendering, and an element that is only invisible is
          the way a control ends up reachable by Tab while it looks shut. */}
      {open && (
        <div
          ref={panel}
          id="locale-list"
          className="absolute top-[calc(100%+7px)] right-0 z-50 min-w-[9.5rem] overflow-hidden rounded-lg border border-white/[0.12] bg-[#0b0b0b] py-1 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.9)]"
        >
          {routing.locales.map((loc) => {
            const current = loc === locale;
            return (
              <button
                key={loc}
                type="button"
                lang={loc}
                onClick={() => choose(loc)}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "focus-visible:outline-accent-bright flex w-full cursor-pointer items-center gap-2 px-3 py-[7px] text-left text-[0.8125rem] transition-colors focus-visible:-outline-offset-2 focus-visible:outline-2",
                  current
                    ? "text-accent-bright"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.05]",
                )}
              >
                {/* A mark, not a colour, carries which one is live — the colour
                    is the same information again for anyone who can see it. */}
                <span aria-hidden className="w-3 shrink-0 text-center">
                  {current ? "·" : ""}
                </span>
                {NATIVE[loc]}
                <span
                  aria-hidden
                  className="ml-auto font-mono text-[0.625rem] tracking-[0.1em] uppercase opacity-45"
                >
                  {loc}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
