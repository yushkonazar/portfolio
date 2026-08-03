import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Link } from "@/i18n/navigation";
import { projects } from "@/lib/projects";

export default function Home() {
  const t = useTranslations("HomePage");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <h1 className="px-6 py-24 text-center text-3xl font-semibold">
          {t("title")}
        </h1>

        <section className="mx-auto max-w-3xl px-6 pb-24">
          <h2 className="text-sm font-medium tracking-wide uppercase">
            {t("featuredProjects")}
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {projects.map((project) => (
              <li key={project.slug}>
                <Link
                  href={`/projects/${project.slug}`}
                  className="border-border hover:border-accent block cursor-pointer rounded-lg border px-4 py-3 transition-colors"
                >
                  <span className="font-medium">{project.title}</span>
                  <span className="text-muted-foreground block text-sm">
                    {project.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <Footer />
    </div>
  );
}
