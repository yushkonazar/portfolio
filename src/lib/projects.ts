import type { Locale } from "@/i18n/routing";

type LocalizedText = Record<Locale, string>;
type LocalizedList = Record<Locale, string[]>;

export type Project = {
  slug: string;
  title: string;
  tagline: LocalizedText;
  status: LocalizedText;
  stack: string[];
  problem: LocalizedText;
  approach: LocalizedText;
  highlights: LocalizedList;
  result: LocalizedText;
  note?: LocalizedText;
  screenshot?: { src: string; width: number; height: number };
  links?: {
    repo?: string;
    demo?: string;
  };
};

export const projects: Project[] = [
  {
    slug: "moviehouse",
    title: "MovieHouse",
    tagline: {
      en: "Full-stack movie discovery app powered by the TMDB API, with search, filtering, and server-side rendering.",
      uk: "Full-stack застосунок для пошуку фільмів на основі TMDB API — з пошуком, фільтрами та серверним рендерингом.",
    },
    status: {
      en: "Live",
      uk: "У проді",
    },
    stack: ["Node.js", "Express.js", "EJS", "Tailwind CSS v4", "Zod", "TMDB API"],
    problem: {
      en: "Built as a hands-on project during a full-stack web development course, with a deliberately real-world brief: a movie-discovery app that feels production-ready, not a toy CRUD exercise — fast search, meaningful filtering, and details worth reading, all on top of a third-party API with its own rate limits and quirks.",
      uk: "Практичний проєкт курсу з full-stack веброзробки, зі свідомо \"дорослим\" технічним завданням: застосунок для пошуку фільмів, який відчувається як готовий продукт, а не навчальна CRUD-вправа — швидкий пошук, змістовна фільтрація й деталі, які варто читати, і все це поверх стороннього API з власними лімітами й особливостями.",
    },
    approach: {
      en: "Solo build, backend-first: Express serves server-rendered EJS views, with a dedicated service layer wrapping the TMDB API so the rest of the app never talks to it directly. Every user input — search terms, filters, pagination — is validated with Zod before it reaches that layer.",
      uk: "Соло-розробка, backend-first: Express віддає серверно-рендерені EJS-сторінки, а окремий сервісний шар інкапсулює звернення до TMDB API — решта застосунку з ним напряму не спілкується. Кожен користувацький ввід — пошуковий запит, фільтри, пагінація — валідується через Zod, перш ніж дійти до цього шару.",
    },
    highlights: {
      en: [
        "5-minute response caching (node-cache) in front of TMDB, so repeated searches and popular-lists don't re-hit the upstream API on every request.",
        "Rate limiting and Helmet security headers, so the app behaves well under load and is reasonably hardened by default.",
        "Advanced filtering (genre, year, rating, sort order), horizontal carousel sliders for popular/top-rated titles, and deep-links out to streaming services.",
        "Custom 404/500 pages and sanitized error messages in production, instead of leaking stack traces.",
      ],
      uk: [
        "Кешування відповідей TMDB на 5 хвилин (node-cache) — повторні пошуки й списки популярного не б'ють по зовнішньому API щоразу.",
        "Rate limiting і security-заголовки Helmet — застосунок коректно поводиться під навантаженням і має розумний захист за замовчуванням.",
        "Розширена фільтрація (жанр, рік, рейтинг, сортування), горизонтальні карусельні слайдери популярного/топового, і прямі посилання на стрімінгові сервіси.",
        "Кастомні сторінки 404/500 і санітизовані повідомлення про помилки в проді — без витоку stack trace.",
      ],
    },
    result: {
      en: "Deployed on Render and running as a public demo. Roadmap items I've deliberately left for later — TV shows, genre pages, watchlists — are tracked openly in the repo rather than left unspoken.",
      uk: "Задеплоєно на Render, працює як публічне демо. Пункти на майбутнє — TV-шоу, сторінки жанрів, списки перегляду — відкрито зазначені в roadmap репозиторію.",
    },
    screenshot: {
      src: "/moviehouse-screenshot.jpg",
      width: 1600,
      height: 731,
    },
    links: {
      repo: "https://github.com/yushkonazar/moviehouse",
      demo: "https://moviehouse-mou1.onrender.com",
    },
  },
  {
    slug: "modern-blog",
    title: "Modern Blog",
    tagline: {
      en: "Full-stack CRUD blog on Next.js 15 App Router, with Server Actions and Clerk-protected authoring.",
      uk: "Full-stack CRUD-блог на Next.js 15 App Router, із Server Actions і авторизацією через Clerk.",
    },
    status: {
      en: "Live",
      uk: "У проді",
    },
    stack: [
      "Next.js 15",
      "TypeScript",
      "Tailwind CSS v4",
      "Server Actions",
      "Zod",
      "Clerk",
    ],
    problem: {
      en: "A second course project, this time aimed squarely at Next.js 15's App Router and Server Actions — a blogging platform where every write operation (create, edit, delete) goes through validated Server Actions and requires authentication, not just a public form.",
      uk: "Другий курсовий проєкт, цього разу зосереджений саме на App Router і Server Actions у Next.js 15 — блог-платформа, де кожна операція запису (створення, редагування, видалення) проходить через валідовані Server Actions і вимагає авторизації, а не просто публічну форму.",
    },
    approach: {
      en: "MVC-style structure on top of the App Router: routes stay thin, business logic lives in dedicated modules, and Clerk handles sign-in and gates the CRUD actions server-side rather than trusting the client. Zod validates every submission before it's persisted.",
      uk: "MVC-структура поверх App Router: роути лишаються тонкими, бізнес-логіка живе в окремих модулях, а Clerk керує входом і закриває CRUD-дії на сервері, а не покладається на клієнт. Zod валідує кожну відправку форми перед збереженням.",
    },
    highlights: {
      en: [
        "Server Actions for create/edit/delete with instant, optimistic UI updates — no separate REST layer to maintain.",
        "Clerk-based authentication gating all write operations; reading the blog stays public.",
        "Responsive UI with glassmorphism styling, pending/loading states, and inline validation errors instead of alert()-style feedback.",
        "TypeScript strict mode throughout.",
      ],
      uk: [
        "Server Actions для створення/редагування/видалення з миттєвим, оптимістичним оновленням UI — без окремого REST-шару для підтримки.",
        "Авторизація через Clerk закриває всі операції запису; читання блогу лишається публічним.",
        "Адаптивний інтерфейс зі стилем glassmorphism, станами завантаження й інлайн-валідацією помилок замість alert()-повідомлень.",
        "TypeScript у строгому режимі (strict mode) по всьому проєкту.",
      ],
    },
    result: {
      en: "Deployed on Render as a working MVP. One deliberate trade-off I'm upfront about: posts persist to a JSON file, not a database, so content resets on redeploy — a real limitation of the file-system approach, not a bug. Migrating to PostgreSQL via Prisma is the next planned step, already scoped in the repo's roadmap.",
      uk: "Задеплоєно на Render як робочий MVP. Один свідомий компроміс, який не приховую: пости зберігаються у JSON-файлі, а не в базі даних, тож контент скидається після редеплою — це реальне обмеження файлового підходу, а не баг. Міграція на PostgreSQL через Prisma — наступний запланований крок, вже занотований у roadmap репозиторію.",
    },
    screenshot: {
      src: "/modern-blog-screenshot.jpg",
      width: 1600,
      height: 728,
    },
    links: {
      repo: "https://github.com/yushkonazar/modern-blog",
      demo: "https://modern-blog-5k8a.onrender.com",
    },
  },
  {
    slug: "svitanok",
    title: "Svitanok",
    tagline: {
      en: "Personal Telegram assistant — a daily morning briefing, LLM-driven task handling, and a Mini App dashboard, in production since day one.",
      uk: "Персональний Telegram-асистент — ранковий брифінг, LLM-керовані задачі та Mini App-дашборд, у продакшені з першого дня.",
    },
    status: {
      en: "In production · personal daily tool",
      uk: "У продакшені · особистий щоденний інструмент",
    },
    stack: [
      "TypeScript",
      "React 19",
      "Cloudflare Workers",
      "Cloudflare KV",
      "Telegram Bot API",
      "Vitest",
      "GitHub Actions",
    ],
    problem: {
      en: "I wanted one thing that actually runs every morning without me touching it: weather, calendar, news, exchange rate, and a daily interview-prep question, delivered as a single Telegram message — plus a conversational assistant that can act on my calendar, mail, and reminders instead of just answering questions about them.",
      uk: "Хотів одну річ, яка реально працює щоранку без мого втручання: погода, календар, новини, курс валют і тренувальне питання для співбесіди — одним повідомленням у Telegram, плюс розмовний асистент, який може діяти з календарем, поштою й нагадуваннями, а не просто відповідати про них.",
    },
    approach: {
      en: "Solo-designed, solo-built, solo-run in production: architecture, implementation, deployment, and monitoring. The briefing runs on a GitHub Actions cron job that talks to a Cloudflare Worker; the Worker is the only thing that touches Cloudflare KV (a single namespace, ~10 keys — deliberately no D1/R2/Durable Objects, since the scale is one user, not a multi-tenant product). A small VPS keeps a long-lived Claude CLI session alive for the assistant, because Workers silently kill background execution around 25-30 seconds — too short for multi-step tool use.",
      uk: "Спроєктовано, побудовано й веду в продакшені самостійно — від архітектури до моніторингу. Брифінг запускається через GitHub Actions cron, який звертається до Cloudflare Worker'а; лише цей Worker торкається Cloudflare KV (один namespace, ~10 ключів — свідомо без D1/R2/Durable Objects, бо масштаб — один користувач, а не мультитенантний продукт). Окремий VPS тримає живою довготривалу сесію Claude CLI для асистента, бо Workers мовчки вбивають фонове виконання приблизно через 25-30с — замало для багатокрокового tool use.",
    },
    highlights: {
      en: [
        "Fixed-schema LLM actions: the assistant picks from a closed set of JSON-defined actions rather than calling arbitrary tools — cheap actions run immediately, risky ones show a before/after diff and wait for explicit confirmation.",
        "Atomic KV writes: the \"confirm\" button submits unsaved edits and the confirmation flag in a single request, because Cloudflare KV has no compare-and-swap and a two-step write would race.",
        "Found and fixed a real authorization bug myself: Mini App requests are authenticated via HMAC-signed Telegram initData, and an earlier version silently degraded that secret to a public constant when the bot token was missing — closed before it shipped anywhere public-facing.",
        "1,300+ Vitest tests covering all business logic, kept side-effect-free by design; typecheck + lint + test gate every merge via GitHub Actions.",
        "A Mini App dashboard (React 19, Vite, TanStack Query, D3) with a job-tracking tab that scores open listings against my own profile, alongside a habit check-in flow and delivery-reliability stats.",
      ],
      uk: [
        "Фіксована схема LLM-дій: асистент обирає дію із закритого набору, описаного в JSON, а не викликає довільні інструменти — дешеві дії виконуються одразу, ризиковані показують діф \"було→стане\" і чекають підтвердження.",
        "Атомарний запис у KV: кнопка \"Підтвердити\" відправляє незбережені зміни й прапорець підтвердження одним запитом, бо Cloudflare KV не має compare-and-swap, і двоетапний запис створив би гонку.",
        "Самостійно знайшов і закрив реальний баг безпеки: Mini App авторизується через HMAC-підпис Telegram initData, і рання версія мовчки вироджувала цей секрет у публічну константу за відсутності bot-токена — закрито до будь-якого публічного використання.",
        "1300+ тестів на Vitest покривають усю бізнес-логіку, свідомо без побічних ефектів за дизайном; typecheck + lint + test — обов'язковий гейт перед кожним мержем через GitHub Actions.",
        "Mini App-дашборд (React 19, Vite, TanStack Query, D3) із вкладкою вакансій, що скорує відкриті позиції під власний профіль, плюс чек-ін звичок і статистика надійності доставки.",
      ],
    },
    result: {
      en: "In daily production use since late June 2026 — roughly a month of intensive development, 548 commits, ~27.7k lines of code outside tests. It's the project I'd point to first for architecture and judgment under real constraints, not just feature count.",
      uk: "У щоденному продакшн-використанні з кінця червня 2026 — приблизно місяць інтенсивної розробки, 548 комітів, ~27.7 тис. рядків коду поза тестами. Це проєкт, яким я б показував архітектурні рішення й інженерне мислення під реальними обмеженнями, а не просто список фіч.",
    },
    note: {
      en: "Private repository — code available on request.",
      uk: "Приватний репозиторій — код доступний за запитом.",
    },
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
