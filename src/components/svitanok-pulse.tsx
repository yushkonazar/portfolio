"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * "In production" as a claim, replaced by "in production" as a reading.
 *
 * Every portfolio says a project is live. This one asks it. The bot's own worker
 * publishes the timestamp of the last briefing it sent; this line reports it,
 * which is the difference between a badge and evidence.
 *
 * The whole component is built around being absent. It is a flourish on a page
 * that has to work without it, so every failure — no endpoint configured, a
 * timeout, CORS, malformed JSON, a stale date — resolves to rendering nothing
 * at all. No skeleton, no error, no gap where something was going to be. A
 * broken liveness indicator is worse than no liveness indicator: it advertises
 * exactly the thing it fails to demonstrate.
 */

/** Inlined at build time. Absent means the feature simply doesn't exist. */
const STATUS_URL = process.env.NEXT_PUBLIC_SVITANOK_STATUS_URL;

const TIMEOUT_MS = 3000;

/** Past this, the line stops being evidence of anything. */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** Tolerance for clock skew between the visitor and the worker. */
const MAX_SKEW_MS = 60 * 60 * 1000;

/** Midnight-to-midnight distance in the reader's own timezone. */
function calendarDaysAgo(when: Date) {
  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startOfDay(new Date()) - startOfDay(when)) / 86400000);
}

export function SvitanokPulse() {
  const t = useTranslations("HomePage");
  const locale = useLocale();
  const [sentAt, setSentAt] = useState<Date | null>(null);
  const [yesterday, setYesterday] = useState(false);

  useEffect(() => {
    if (!STATUS_URL) return;
    let live = true;

    void (async () => {
      try {
        const response = await fetch(STATUS_URL, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) return;

        const data = (await response.json()) as { lastBriefingAt?: unknown };
        if (typeof data.lastBriefingAt !== "string") return;

        const at = new Date(data.lastBriefingAt);
        if (Number.isNaN(at.getTime())) return;

        const age = Date.now() - at.getTime();
        if (age > MAX_AGE_MS || age < -MAX_SKEW_MS) return;

        // Days, not hours: at 01:00 a briefing sent 42 hours ago is inside the
        // 48-hour window but two calendar days back, and calling that
        // "yesterday" would be a lie in the reader's own terms.
        const days = calendarDaysAgo(at);
        if (days > 1) return;

        if (!live) return;
        setSentAt(at);
        setYesterday(days === 1);
      } catch {
        // Timed out, offline, blocked, malformed — one answer for all of them.
      }
    })();

    return () => {
      live = false;
    };
  }, []);

  if (!sentAt) return null;

  // Pinned to 24-hour in both locales. Left to the locale, `en` renders
  // "7:03 AM" — correct for en-US, but this is a delivery timestamp read next to
  // a Ukrainian version that says 07:03, and the two should agree.
  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(sentAt);

  return (
    <p className="text-muted-foreground mt-2 flex items-center gap-2 font-mono text-[0.71875rem] leading-[1.5]">
      <span
        aria-hidden
        className="bg-accent-bright ember-pulse h-1.5 w-1.5 shrink-0 rounded-full"
      />
      {yesterday ? t("pulseYesterday", { time }) : t("pulseToday", { time })}
      <span aria-hidden className="text-emerald-400">
        ✓
      </span>
    </p>
  );
}
