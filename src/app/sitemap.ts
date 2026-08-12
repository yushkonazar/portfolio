import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { projects } from "@/lib/projects";

const SITE_URL = "https://yushko.dev";

/**
 * Bumped by hand when the content actually changes. `new Date()` stamped every
 * page as modified on every build, which claims a hundred edits nobody made —
 * exactly the signal a crawler learns to stop reading.
 */
const LAST_RELEASE = "2026-08-12";

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
      lastModified: LAST_RELEASE,
      alternates: {
        languages: {
          ...Object.fromEntries(
            routing.locales.map((altLocale) => [
              altLocale,
              `${SITE_URL}/${altLocale}${path}`,
            ]),
          ),
          // The fallback for any language that isn't one of the two.
          "x-default": `${SITE_URL}/${routing.defaultLocale}${path}`,
        },
      },
    })),
  );
}
