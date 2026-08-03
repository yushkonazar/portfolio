import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["uk", "en"],
  defaultLocale: "en",
  localeDetection: true,
});

export type Locale = (typeof routing.locales)[number];
