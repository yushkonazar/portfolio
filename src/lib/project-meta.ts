import type { Locale } from "@/i18n/routing";

type LocalizedText = Record<Locale, string>;

export type Metric = { value: string; label: LocalizedText };

export type ProjectMeta = {
  /** One-line version of the tagline, used in the collapsed row. */
  short: LocalizedText;
  /** Badge text for the row — kept separate from project.status, which is
   * the fuller phrase shown on the standalone case-study page and doesn't
   * fit a compact pill (e.g. Svitanok's "In production · personal daily tool"). */
  statusShort: LocalizedText;
  /** Facts shown when the row opens. Numbers come from the projects themselves. */
  metrics: Metric[];
  /** Shown instead of a screenshot while none exists. */
  screenshotPlaceholder?: LocalizedText;
};

/** Strongest work first — this is the order the home page renders. */
export const featuredOrder = ["svitanok", "moviehouse", "modern-blog"] as const;

export const projectMeta: Record<string, ProjectMeta> = {
  svitanok: {
    short: {
      en: "Telegram assistant — morning briefing, LLM-driven tasks, Mini App dashboard.",
      uk: "Telegram-асистент — ранковий брифінг, LLM-задачі, дашборд у Mini App.",
    },
    statusShort: { en: "In production", uk: "У продакшені" },
    metrics: [
      { value: "548", label: { en: "commits", uk: "комітів" } },
      { value: "1,300+", label: { en: "tests", uk: "тестів" } },
      { value: "~27.7k", label: { en: "lines", uk: "рядків" } },
      { value: "Jun 2026", label: { en: "daily since", uk: "щодня з" } },
    ],
    screenshotPlaceholder: {
      en: "Mini App dashboard — screenshot needed",
      uk: "Дашборд Mini App — потрібен скриншот",
    },
  },
  moviehouse: {
    short: {
      en: "Movie discovery on the TMDB API — search, filtering, server-side rendering.",
      uk: "Пошук фільмів на TMDB API — пошук, фільтри, серверний рендеринг.",
    },
    statusShort: { en: "Live", uk: "У проді" },
    metrics: [
      { value: "5-min", label: { en: "response cache", uk: "кеш відповідей" } },
      { value: "Rate-limited", label: { en: "+ Helmet headers", uk: "+ заголовки Helmet" } },
      { value: "Zod", label: { en: "on every input", uk: "на кожному вводі" } },
    ],
  },
  "modern-blog": {
    short: {
      en: "CRUD blog on Next.js 15 App Router — Server Actions, Clerk-protected authoring.",
      uk: "CRUD-блог на Next.js 15 App Router — Server Actions, авторизація через Clerk.",
    },
    statusShort: { en: "Live", uk: "У проді" },
    metrics: [
      { value: "Optimistic", label: { en: "writes", uk: "оновлення UI" } },
      { value: "Auth-gated", label: { en: "CRUD", uk: "CRUD" } },
      { value: "Strict", label: { en: "TypeScript", uk: "TypeScript" } },
    ],
  },
};

/** The numbers in the band under the hero. Keep these true or drop them. */
export const siteStats: Metric[] = [
  { value: "3", label: { en: "shipped projects", uk: "запущені проєкти" } },
  { value: "548", label: { en: "commits on Svitanok", uk: "комітів у Svitanok" } },
  { value: "1,300+", label: { en: "tests written", uk: "написаних тестів" } },
  { value: "27.7k", label: { en: "lines in production", uk: "рядків у проді" } },
];
