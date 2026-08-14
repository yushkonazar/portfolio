"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { TypeSizeIcon } from "@/components/icons";
import { HeaderPopover, HeaderPopoverItem, HEADER_ICON } from "./header-popover";

/**
 * Reader-set type size.
 *
 * The steps are percentages of the browser's default rather than absolute sizes,
 * so this multiplies whatever the reader already chose instead of replacing it —
 * see globals.css. "default" carries no attribute at all.
 */
const STEPS = ["default", "large", "larger"] as const;
type Step = (typeof STEPS)[number];

/** Persisted across visits, not just this tab: a reading preference is not a
 * property of a session. */
export const TYPE_KEY = "type-size";

/**
 * Runs before the parser reaches any content, so a reader who chose "larger"
 * never sees the page at the default and then watches it jump. A static literal
 * with nothing interpolated but a module constant — the same trade-off on CSP's
 * `unsafe-inline` that the RSC payload already needs.
 *
 * Both documents need it: the locale layout, and the 404, which renders its own
 * <html> outside the [locale] segment and would otherwise ignore the setting.
 */
export function TypeSizeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{
var v=localStorage.getItem("${TYPE_KEY}");
if(v==="large"||v==="larger")document.documentElement.setAttribute("data-type",v);
}catch(e){}})();`,
      }}
    />
  );
}

/**
 * The stored choice, read through `useSyncExternalStore` rather than into state
 * from an effect.
 *
 * The obvious shape — `useState("default")` corrected by a `useEffect` — is what
 * this was, and it is both a lint error here and the wrong tool: the value lives
 * outside React, the server cannot read it, and rendering it directly would be a
 * hydration mismatch. This is the API for exactly that, and subscribing to
 * `storage` while we're here means changing the size in one tab moves the others.
 */
const listeners = new Set<() => void>();

function subscribe(notify: () => void) {
  listeners.add(notify);
  // `storage` fires in *other* tabs only, so same-tab changes go through
  // `listeners` and cross-tab ones through the event.
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", notify);
  };
}

function getSnapshot(): Step {
  try {
    const value = localStorage.getItem(TYPE_KEY);
    return value === "large" || value === "larger" ? value : "default";
  } catch {
    return "default";
  }
}

/** The server has no storage, and neither does the first client render. */
function getServerSnapshot(): Step {
  return "default";
}

export function TypeSize() {
  const t = useTranslations("Header");
  const step = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function choose(next: Step) {
    const root = document.documentElement;
    if (next === "default") root.removeAttribute("data-type");
    else root.setAttribute("data-type", next);

    try {
      if (next === "default") localStorage.removeItem(TYPE_KEY);
      else localStorage.setItem(TYPE_KEY, next);
    } catch {
      // A refused write costs the choice its persistence and nothing else: the
      // attribute is already set, so this visit reads at the chosen size.
    }
    for (const notify of listeners) notify();
  }

  return (
    <HeaderPopover
      id="type-size-list"
      label={`${t("typeSize")}: ${t(`typeSize_${step}`)}`}
      icon={<TypeSizeIcon className={HEADER_ICON} />}
    >
      {STEPS.map((option) => (
        <HeaderPopoverItem
          key={option}
          current={option === step}
          onSelect={() => choose(option)}
          label={t(`typeSize_${option}`)}
        />
      ))}
    </HeaderPopover>
  );
}
