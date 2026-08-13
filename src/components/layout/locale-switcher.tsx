"use client";

import { useLocale, useTranslations } from "next-intl";
import { routing, type Locale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * One control rather than two words.
 *
 * As two bare buttons this read as a pair of links that happened to be next to
 * each other, and which of them was live was carried only by their colour. A
 * segmented pill says "pick one of these" by its shape, and the lit half says
 * which is picked without relying on a hue.
 *
 * Deliberately not a popover with a trigger and a menu, which is what "a
 * separate button with a custom picker" would usually mean: for two options that
 * costs `aria-expanded`, a listbox pattern, Escape, outside-click and focus
 * return, to end up showing both choices the pill already shows. Two options is
 * the case where a segmented control *is* the custom picker.
 */
export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Header");

  const active = routing.locales.indexOf(locale as Locale);

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="relative flex items-center rounded-full border border-white/[0.12] p-[3px]"
    >
      {/* The lit half travels with a transform, so one element moves and it
          composites — restyling both buttons on every change would repaint them
          and could not be animated between two states anyway.

          The arithmetic is exact rather than approximate: this sits in the
          container's padding box, so `50% - 3px` resolves to exactly one
          button's width, and `translateX(100%)` is exactly one button across. */}
      {/* The transition is a utility, not an inline style: inline would outrank
          `motion-reduce:transition-none` and the travel would keep happening for
          someone who asked for no motion. Which half is lit is information, and
          it still moves — it just arrives. Only the transform is inline, because
          it is the one value that changes. */}
      <span
        aria-hidden
        className="bg-accent/[0.14] ring-accent/35 pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-full ring-1 transition-transform duration-[320ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(${Math.max(active, 0) * 100}%)` }}
      />

      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          // The current item within a set, which is what this is. Not
          // `aria-pressed`: these navigate rather than toggle a setting.
          aria-current={loc === locale ? "true" : undefined}
          className={cn(
            // `flex-1` so the halves are equal by construction. Both codes are
            // two characters in a monospaced face, so they already match — but
            // then the indicator's "half the width" would be true by coincidence
            // rather than by the layout, and a three-letter code would break it.
            "focus-visible:outline-accent-bright relative z-1 flex-1 cursor-pointer rounded-full px-2.5 py-[3px] font-mono text-[11px] leading-none tracking-[0.1em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
            loc === locale
              ? "text-accent-bright"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {loc}
        </button>
      ))}
    </div>
  );
}
