import { getTranslations } from "next-intl/server";
import { getProject } from "@/lib/projects";
import {
  featuredOrder,
  projectMeta,
  resolveText,
  siteStats,
} from "@/lib/project-meta";
import { WorkShowcase, type ShowcaseRow } from "./work-showcase";
import type { ProjectRowLink } from "./project-row";
import type { Locale } from "@/i18n/routing";

export async function FeaturedWork({ locale }: { locale: Locale }) {
  const t = await getTranslations("HomePage");
  const tp = await getTranslations("ProjectPage");

  const rows: ShowcaseRow[] = featuredOrder.flatMap((slug) => {
    const project = getProject(slug);
    const meta = projectMeta[slug];
    if (!project || !meta) return [];

    const links: ProjectRowLink[] = [];
    if (project.links?.demo) {
      links.push({ label: tp("liveDemo"), href: project.links.demo, accent: true });
    }
    if (project.links?.repo) {
      links.push({ label: tp("sourceCode"), href: project.links.repo });
    }
    links.push({
      label: t("caseStudy"),
      href: "/" + locale + "/projects/" + project.slug,
      accent: !project.links?.demo,
    });

    return [
      {
        slug: project.slug,
        title: project.title,
        status: meta.statusShort[locale],
        statusTone: project.slug === "svitanok" ? "production" : "live",
        short: meta.short[locale],
        description: meta.pitch[locale],
        metrics: meta.metrics.map((metric) => ({
          value: resolveText(metric.value, locale),
          label: metric.label[locale],
        })),
        stack: project.stack.slice(0, 4),
        screenshot: project.screenshot,
        screenshotPlaceholder: meta.screenshotPlaceholder?.[locale],
        links,
        note:
          project.note?.[locale] ??
          (project.links?.demoColdStart ? tp("coldStart") : undefined),
      },
    ];
  });

  return (
    <WorkShowcase
      rows={rows}
      siteStats={siteStats.map((stat) => ({
        value: resolveText(stat.value, locale),
        label: stat.label[locale],
      }))}
      defaultCaption={t("atAGlance")}
      heading={t("selectedWork")}
      hint={t("workHint")}
    />
  );
}
