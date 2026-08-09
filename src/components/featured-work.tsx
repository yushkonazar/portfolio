import { getTranslations } from "next-intl/server";
import { getProject } from "@/lib/projects";
import { featuredOrder, projectMeta } from "@/lib/project-meta";
import { ProjectRow, type ProjectRowLink } from "./project-row";
import type { Locale } from "@/i18n/routing";

export async function FeaturedWork({ locale }: { locale: Locale }) {
  const t = await getTranslations("HomePage");
  const tp = await getTranslations("ProjectPage");

  const rows = featuredOrder
    .map((slug) => ({ project: getProject(slug), meta: projectMeta[slug] }))
    .filter((row) => row.project && row.meta);

  return (
    <section id="work" className="mx-auto w-full max-w-5xl px-6 py-8 md:px-11 md:py-9">
      <div className="flex items-baseline justify-between">
        <h2 className="m-0 text-[15px] font-bold tracking-[0.02em]">
          {t("selectedWork")}
        </h2>
        <span className="text-muted-foreground font-mono text-[11px] md:text-[11.5px]">
          {t("workHint")}
        </span>
      </div>

      <div className="mt-1.5">
        {rows.map(({ project, meta }, index) => {
          if (!project || !meta) return null;

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

          return (
            <ProjectRow
              key={project.slug}
              title={project.title}
              status={meta.statusShort[locale]}
              statusTone={project.slug === "svitanok" ? "production" : "live"}
              short={meta.short[locale]}
              description={project.approach[locale]}
              metrics={meta.metrics.map((metric) => ({
                value: metric.value,
                label: metric.label[locale],
              }))}
              stack={project.stack.slice(0, 4)}
              screenshot={project.screenshot}
              screenshotPlaceholder={meta.screenshotPlaceholder?.[locale]}
              links={links}
              note={project.note?.[locale] ?? (project.links?.demoColdStart ? tp("coldStart") : undefined)}
              last={index === rows.length - 1}
            />
          );
        })}
      </div>
    </section>
  );
}
