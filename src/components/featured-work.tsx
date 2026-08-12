import { getTranslations } from "next-intl/server";
import { getProject, getProjectMedia } from "@/lib/projects";
import { featuredOrder, projectMeta, resolveText } from "@/lib/project-meta";
import { SvitanokPulse } from "./svitanok-pulse";
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
    // Locale-less on purpose: the row renders this one through `Link`, which
    // prefixes the active locale itself.
    links.push({
      label: t("caseStudy"),
      href: "/projects/" + project.slug,
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
        media: getProjectMedia(project, locale),
        mediaLink: project.links?.demo
          ? {
              href: project.links.demo,
              label: t("openDemo", { project: project.title }),
            }
          : undefined,
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
      heading={t("selectedWork")}
      hint={t("workHint")}
      statusLine={<SvitanokPulse />}
    />
  );
}
