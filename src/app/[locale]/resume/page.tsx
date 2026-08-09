import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SiteBackground } from "@/components/site-background";
import { Link } from "@/i18n/navigation";
import { projects } from "@/lib/projects";
import { contactLinks } from "@/lib/contacts";
import {
  summary,
  skillGroups,
  softSkillsLabel,
  softSkills,
  education,
  courses,
  languages,
} from "@/lib/resume";
import type { Locale } from "@/i18n/routing";

const CV_PATH = "/Nazar-Yushko-CV.pdf";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ResumePage" });
  const home = await getTranslations({ locale, namespace: "HomePage" });

  const title = `${t("title")} — ${home("name")}`;
  const description = summary[locale as Locale];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/resume`,
      languages: {
        en: "/en/resume",
        uk: "/uk/resume",
      },
    },
    openGraph: { title, description, url: `/${locale}/resume`, type: "profile" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ResumePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = locale as Locale;

  const t = await getTranslations("ResumePage");
  const home = await getTranslations("HomePage");

  return (
    <div className="flex min-h-screen flex-col">
      <SiteBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-semibold">{home("name")}</h1>
              <p className="text-muted-foreground mt-1">{home("role")}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {contactLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    {...("external" in link && link.external
                      ? { target: "_blank", rel: "noreferrer" }
                      : {})}
                    className="text-accent-bright hover:underline"
                  >
                    {link.text}
                  </a>
                ))}
              </div>
            </div>
            <a
              href={CV_PATH}
              download
              className="border-border hover:border-accent shrink-0 cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
            >
              {t("downloadPdf")}
            </a>
          </div>

          <section className="mt-12">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("summary")}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {summary[currentLocale]}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("skills")}
            </h2>
            <dl className="mt-3 flex flex-col gap-3">
              {skillGroups.map((group) => (
                <div
                  key={group.label.en}
                  className="flex flex-col gap-1 sm:flex-row sm:gap-4"
                >
                  <dt className="w-44 shrink-0 font-medium">
                    {group.label[currentLocale]}
                  </dt>
                  <dd className="text-muted-foreground">
                    {group.items.join(", ")}
                  </dd>
                </div>
              ))}
              <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                <dt className="w-44 shrink-0 font-medium">
                  {softSkillsLabel[currentLocale]}
                </dt>
                <dd className="text-muted-foreground">
                  {softSkills[currentLocale]}
                </dd>
              </div>
            </dl>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("projects")}
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {projects.map((project) => (
                <li key={project.slug}>
                  <Link
                    href={`/projects/${project.slug}`}
                    className="border-border hover:border-accent block cursor-pointer rounded-lg border px-4 py-3 transition-colors"
                  >
                    <h3 className="font-medium">{project.title}</h3>
                    <span className="text-muted-foreground block text-sm">
                      {project.tagline[currentLocale]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("education")}
            </h2>
            <div className="mt-3 flex flex-col gap-4">
              {education.map((entry) => (
                <div key={entry.institution}>
                  <p className="font-medium">
                    {entry.institution} — {entry.degree[currentLocale]}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {entry.meta[currentLocale]}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("courses")}
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {courses.map((course) => (
                <p key={course.name}>
                  <span className="font-medium">{course.name}</span>
                  <span className="text-muted-foreground"> — {course.provider}</span>
                </p>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-sm font-medium tracking-wide uppercase">
              {t("languages")}
            </h2>
            <p className="mt-3">
              {languages.map((lang, i) => (
                <span key={lang.name.en}>
                  {i > 0 && <span className="text-muted-foreground"> · </span>}
                  <span className="font-medium">{lang.name[currentLocale]}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — {lang.level[currentLocale]}
                  </span>
                </span>
              ))}
            </p>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
