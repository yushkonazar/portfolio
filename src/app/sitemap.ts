import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { projects } from "@/lib/projects";

const SITE_URL = "https://yushko.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "",
    "/resume",
    "/privacy",
    ...projects.map((project) => `/projects/${project.slug}`),
  ];

  return routing.locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((altLocale) => [
            altLocale,
            `${SITE_URL}/${altLocale}${path}`,
          ]),
        ),
      },
    })),
  );
}
