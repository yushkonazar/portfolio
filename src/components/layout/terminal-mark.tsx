"use client";

import { useTranslations } from "next-intl";
import { TERMINAL_EVENT } from "@/components/terminal";

/**
 * The one thing that says the terminal exists.
 *
 * It was reachable only by pressing a key nobody was told about, which is the
 * failure mode every hidden feature has: the people who would enjoy it never
 * learn it is there. This is small and in the footer — enough to be found by
 * anyone reading to the bottom of a page, quiet enough not to be an announcement.
 *
 * An event rather than lifted state: the terminal already listens for one to run
 * its click bursts, so this is the mechanism the project has rather than a second
 * one alongside it. It also means the mark doesn't need to be anywhere near the
 * terminal in the tree.
 */
export function TerminalMark() {
  const t = useTranslations("Footer");

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(TERMINAL_EVENT))}
      title={t("terminalHint")}
      aria-label={t("terminal")}
      className="focus-visible:outline-accent-bright hover:text-accent-bright hover:border-accent/40 cursor-pointer rounded border border-white/[0.12] px-1.5 py-0.5 font-mono text-[11px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {/* Not the accessible name — that's on the button, in the reader's own
          language. This is the shape of a prompt, which is the hint. */}
      <span aria-hidden>{">_"}</span>
    </button>
  );
}
