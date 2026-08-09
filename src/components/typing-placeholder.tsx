"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const TYPE_MS = 55;
const ERASE_MS = 28;
const HOLD_MS = 1800;

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * A placeholder that types itself out and clears, cycling through prompts.
 *
 * Rendered as an overlay rather than by animating the `placeholder` attribute:
 * a changing placeholder is re-announced by screen readers on every character,
 * which would be unusable. This layer is aria-hidden — the field's own <label>
 * is what actually names it — and it yields the moment the field is focused or
 * has any content, so it never competes with what the visitor is typing.
 */
export function TypingPlaceholder({ phrases }: { phrases: string[] }) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [erasing, setErasing] = useState(false);

  // useSyncExternalStore rather than reading matchMedia during render: it
  // gives a stable server snapshot, so the first client render matches the
  // server's and there's no hydration mismatch to paper over.
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    if (reducedMotion) return;

    const phrase = phrases[phraseIndex % phrases.length] ?? "";

    // Every branch defers its state change into the timer callback — a
    // synchronous setState here would cascade a render on each keystroke.
    let delay = erasing ? ERASE_MS : TYPE_MS;
    let advance = () =>
      setText((current) =>
        erasing ? current.slice(0, -1) : phrase.slice(0, current.length + 1),
      );

    if (!erasing && text === phrase) {
      delay = HOLD_MS;
      advance = () => setErasing(true);
    } else if (erasing && text === "") {
      delay = 0;
      advance = () => {
        setErasing(false);
        setPhraseIndex((index) => (index + 1) % phrases.length);
      };
    }

    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [text, erasing, phraseIndex, phrases, reducedMotion]);

  return (
    <span
      aria-hidden
      // /55 measured at ~3:1 against the field background — below the 4.5:1
      // WCAG AA floor for 14px text. /75 lands at ~4.75:1.
      className="text-muted-foreground/75 pointer-events-none absolute top-3 left-3.5 text-sm select-none"
    >
      {reducedMotion ? (phrases[0] ?? "") : text}
      {!reducedMotion && (
        <span className="ember-pulse ml-px inline-block h-[1.05em] w-px translate-y-[0.18em] bg-current align-baseline" />
      )}
    </span>
  );
}
