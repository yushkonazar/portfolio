import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { projects, getProject } from "@/lib/projects";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const project = getProject(slug);
  if (!project) {
    notFound();
  }

  const t = await getTranslations("ProjectPage");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="text-3xl font-semibold">{project.title}</h1>
        <p className="text-muted-foreground mt-4">{project.summary}</p>

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

        {project.links && (
          <div className="mt-10 flex gap-4 text-sm">
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
        )}
      </main>
      <Footer />
    </div>
  );
}
