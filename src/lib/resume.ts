import type { Locale } from "@/i18n/routing";

type LocalizedText = Record<Locale, string>;

export const summary: LocalizedText = {
  en: "Fourth-year Computer Science student and motivated self-learner with hands-on experience building and deploying full-stack web applications. Comfortable with JavaScript, Node.js, and Express, including REST API integration and server-side security practices. Have several deployed, working projects and a strong drive to keep growing as a developer, currently expanding my stack toward React and PostgreSQL. Open to frontend, backend, or full-stack roles.",
  uk: "Студент четвертого курсу Computer Science і мотивований self-learner із практичним досвідом створення та деплою full-stack веб-застосунків. Впевнено працюю з JavaScript, Node.js та Express, включно з інтеграцією REST API та серверними практиками безпеки. Маю кілька задеплоєних робочих проєктів і сильне прагнення рости як розробник — зараз розширюю стек у бік React і PostgreSQL. Відкритий до frontend, backend або full-stack ролей.",
};

export type SkillGroup = {
  label: LocalizedText;
  items: string[];
};

export const skillGroups: SkillGroup[] = [
  {
    label: { en: "Core", uk: "Основне" },
    items: [
      "JavaScript (ES6+)",
      "Node.js",
      "Express.js",
      "REST API",
      "HTML",
      "CSS",
      "Tailwind CSS v4",
    ],
  },
  {
    label: { en: "Working knowledge", uk: "Робочі знання" },
    items: ["TypeScript", "Next.js 15 (App Router, Server Actions)"],
  },
  {
    label: { en: "Backend tools", uk: "Бекенд-інструменти" },
    items: ["Zod", "Helmet", "express-rate-limit", "Morgan", "node-cache"],
  },
  {
    label: { en: "Platforms & APIs", uk: "Платформи й API" },
    items: [
      "Cloudflare Workers",
      "Cloudflare KV",
      "Telegram Bot API",
      "OAuth 2.0",
      "LLM APIs (Anthropic Claude, OpenAI GPT)",
    ],
  },
  {
    label: { en: "Testing & CI/CD", uk: "Тестування та CI/CD" },
    items: ["Vitest", "GitHub Actions"],
  },
  {
    label: { en: "Dev tools", uk: "Інструменти розробки" },
    items: ["Git", "GitHub", "Render", "Vercel", "GitHub Pages"],
  },
  {
    label: { en: "Learning", uk: "Вивчаю" },
    items: ["React", "PostgreSQL", "Web3 basics"],
  },
];

export const softSkillsLabel: LocalizedText = { en: "Soft skills", uk: "Гнучкі навички" };

export const softSkills: LocalizedText = {
  en: "Attention to detail, communication, problem-solving, eagerness to learn and grow",
  uk: "Увага до деталей, комунікація, розв'язання проблем, прагнення вчитися й розвиватися",
};

export type EducationEntry = {
  institution: string;
  degree: LocalizedText;
  meta: LocalizedText;
};

export const education: EducationEntry[] = [
  {
    institution: "Ivan Franko National University of Lviv",
    degree: {
      en: "BSc Computer Science (122)",
      uk: "Бакалавр, Computer Science (122)",
    },
    meta: {
      en: "Faculty of Electronics and Computer Technologies · 2023–2027 (expected)",
      uk: "Факультет електроніки та комп'ютерних технологій · 2023–2027 (очікується)",
    },
  },
  {
    institution: 'Winter School "Data Engineering and Security 2026"',
    degree: {
      en: "Ivan Franko National University of Lviv",
      uk: "Львівський національний університет ім. Івана Франка",
    },
    meta: {
      en: "120 hours · 4 ECTS credits · Jan 2026 · Partners: SoftServe, EPAM, GlobalLogic, N-iX, Eleks",
      uk: "120 годин · 4 кредити ECTS · Січень 2026 · Партнери: SoftServe, EPAM, GlobalLogic, N-iX, Eleks",
    },
  },
];

export type CourseEntry = {
  name: string;
  provider: string;
};

export const courses: CourseEntry[] = [
  {
    name: "The Complete Web Development Bootcamp",
    provider: "Dr. Angela Yu, Udemy",
  },
];

export type LanguageEntry = {
  name: LocalizedText;
  level: LocalizedText;
};

export const languages: LanguageEntry[] = [
  {
    name: { en: "Ukrainian", uk: "Українська" },
    level: { en: "Native", uk: "Рідна" },
  },
  {
    name: { en: "English", uk: "Англійська" },
    level: { en: "B1", uk: "B1" },
  },
];
