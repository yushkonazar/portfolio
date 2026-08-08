import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";
import { projects, getProject } from "@/lib/projects";
import type { Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = getProject(slug);
  const currentLocale = locale as Locale;

  if (!project) {
    return {};
  }

  const title = `${project.title} — Yushko Nazar`;
  const description = project.tagline[currentLocale];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/projects/${slug}`,
      languages: {
        en: `/en/projects/${slug}`,
        uk: `/uk/projects/${slug}`,
      },
    },
    openGraph: {
      title,
      description,
      url: `/${locale}/projects/${slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const currentLocale = locale as Locale;

  const project = getProject(slug);
  if (!project) {
    notFound();
  }

  const t = await getTranslations("ProjectPage");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link
          href="/#projects"
          className="text-muted-foreground hover:text-foreground mb-8 inline-block text-sm transition-colors"
        >
          ← {t("backToProjects")}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold">{project.title}</h1>
          <span className="text-accent-bright border-accent/40 rounded-full border px-2.5 py-0.5 text-xs font-medium">
            {project.status[currentLocale]}
          </span>
        </div>
        <p className="text-muted-foreground mt-4 text-lg">
          {project.tagline[currentLocale]}
        </p>

        {project.screenshot && (
          <Image
            src={project.screenshot.src}
            alt={project.title}
            width={project.screenshot.width}
            height={project.screenshot.height}
            className="border-border/60 mt-8 w-full rounded-xl border"
          />
        )}

        <h2 className="mt-10 text-sm font-medium tracking-wide uppercase">
          {t("stack")}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {project.stack.map((tech) => (
            <li
              key={tech}
              className="border-border rounded-full border px-3 py-1 text-sm"
            >
              {tech}
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-8">
          <section>
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("problem")}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {project.problem[currentLocale]}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("approach")}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {project.approach[currentLocale]}
            </p>
          </section>

          <section>
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("highlights")}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {project.highlights[currentLocale].map((item) => (
                <li
                  key={item}
                  className="text-muted-foreground flex gap-2 leading-relaxed"
                >
                  <span className="text-accent-bright shrink-0">–</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("result")}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {project.result[currentLocale]}
            </p>
          </section>
        </div>

        {project.links && (
          <div className="mt-10">
            <div className="flex gap-4 text-sm">
              {project.links.demo && (
                <a
                  href={project.links.demo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-bright cursor-pointer hover:underline"
                >
                  {t("liveDemo")}
                </a>
              )}
              {project.links.repo && (
                <a
                  href={project.links.repo}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent-bright cursor-pointer hover:underline"
                >
                  {t("sourceCode")}
                </a>
              )}
            </div>
            {project.links.demoColdStart && (
              <p className="text-muted-foreground mt-2 text-sm">
                {t("coldStart")}
              </p>
            )}
          </div>
        )}
        {project.note && (
          <p className="text-muted-foreground mt-10 text-sm italic">
            {project.note[currentLocale]}
          </p>
        )}
      </main>
      <Footer />
    </div>
  );
}
