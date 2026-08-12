import type { Locale } from "@/i18n/routing";

type LocalizedText = Record<Locale, string>;

/** Numbers read the same in both languages; words don't. */
type MaybeLocalized = string | LocalizedText;

export function resolveText(value: MaybeLocalized, locale: Locale) {
  return typeof value === "string" ? value : value[locale];
}

export type Metric = { value: MaybeLocalized; label: LocalizedText };

export type ProjectMeta = {
  /** One-line version of the tagline, used in the collapsed row. */
  short: LocalizedText;
  /**
   * The expanded row's paragraph — a short presentation of the project rather
   * than an engineering write-up. It has to land for a prospective client and
   * a technical reviewer at once, so it names what the thing does and the one
   * non-obvious property worth knowing, and leaves the architecture to the
   * case-study page. Deliberately not project.approach, which stays technical.
   */
  pitch: LocalizedText;
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
      en: "A personal assistant in Telegram that runs itself every day.",
      uk: "Персональний асистент у Telegram, який щодня працює сам.",
    },
    pitch: {
      en: "Every morning it assembles weather, calendar, news and exchange rates into a single message. Through the day it takes instructions in plain chat — move a meeting, add a reminder, check the mail — and keeps the results on its own dashboard. It has been doing that unattended since June.",
      uk: "Щоранку збирає погоду, календар, новини й курси валют в одне повідомлення. Протягом дня приймає вказівки звичайним текстом — перенести зустріч, додати нагадування, перевірити пошту — і показує результат на власному дашборді. Робить це без нагляду з червня.",
    },
    statusShort: { en: "In production", uk: "У продакшені" },
    metrics: [
      { value: "548", label: { en: "commits", uk: "комітів" } },
      { value: "1,300+", label: { en: "tests", uk: "тестів" } },
      { value: "~27.7k", label: { en: "lines", uk: "рядків" } },
      {
        value: { en: "Jun 2026", uk: "Черв 2026" },
        label: { en: "daily since", uk: "щодня з" },
      },
    ],
    // Addressed to the visitor, not to me — the previous wording was a TODO
    // that every reader of the flagship project got to see.
    screenshotPlaceholder: {
      en: "Dashboard preview coming shortly",
      uk: "Прев'ю дашборда — незабаром",
    },
  },
  moviehouse: {
    short: {
      en: "A film search engine that also tells you where to watch.",
      uk: "Пошук фільмів, який ще й підказує, де дивитися.",
    },
    pitch: {
      en: "Search by title, or narrow things down by genre, year and rating until something looks right — then go straight to the streaming service that has it. Popular lists and repeat searches come back instantly, because results are cached rather than re-fetched on every request.",
      uk: "Шукати за назвою або звужувати за жанром, роком і рейтингом, доки не знайдеться потрібне — і одразу перейти до сервісу, де фільм можна подивитись. Популярні добірки й повторні пошуки відкриваються миттєво: результати кешуються, а не запитуються щоразу заново.",
    },
    statusShort: { en: "Live", uk: "У проді" },
    metrics: [
      {
        value: { en: "5-min", uk: "5 хв" },
        label: { en: "response cache", uk: "кеш відповідей" },
      },
      {
        value: { en: "Rate-limited", uk: "Ліміт запитів" },
        label: { en: "+ Helmet headers", uk: "+ заголовки Helmet" },
      },
      { value: "Zod", label: { en: "on every input", uk: "на кожному вводі" } },
    ],
  },
  "modern-blog": {
    short: {
      en: "A publishing platform where posts save without a page reload.",
      uk: "Платформа для публікацій, де дописи зберігаються без перезавантаження.",
    },
    pitch: {
      en: "Write, edit and publish posts from the browser. Changes land the moment you save them — no page reload, no spinner — because the form talks to the server directly instead of going through a separate API layer. Built on the current Next.js data model rather than the one it replaced.",
      uk: "Писати, редагувати й публікувати дописи просто в браузері. Зміни з'являються в момент збереження — без перезавантаження й очікування — бо форма звертається до сервера напряму, а не через окремий API-шар. Зроблено на актуальній моделі даних Next.js, а не на тій, яку вона замінила.",
    },
    statusShort: { en: "Live", uk: "У проді" },
    metrics: [
      {
        value: { en: "Optimistic", uk: "Миттєве" },
        label: { en: "writes", uk: "оновлення UI" },
      },
      {
        value: { en: "Auth-gated", uk: "Під входом" },
        label: { en: "CRUD", uk: "CRUD" },
      },
      {
        value: { en: "Strict", uk: "Строгий" },
        label: { en: "TypeScript", uk: "TypeScript" },
      },
    ],
  },
};
