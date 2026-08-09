import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactForm } from "@/components/contact-form";
import { Hero } from "@/components/hero";
import { StatsBand } from "@/components/stats-band";
import { FeaturedWork } from "@/components/featured-work";
import type { Locale } from "@/i18n/routing";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const currentLocale = locale as Locale;

  const t = await getTranslations("HomePage");

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Nazar Yushko",
    alternateName: "Yushko Nazar",
    jobTitle: t("role"),
    url: "https://yushko.dev",
    sameAs: [
      "https://github.com/yushkonazar",
      "https://linkedin.com/in/nazar-yushko",
    ],
    knowsAbout: [
      "JavaScript",
      "TypeScript",
      "Node.js",
      "Express.js",
      "Next.js",
      "React",
      "Cloudflare Workers",
      "REST API",
    ],
  };

  return (
    <div className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(personSchema).replace(/</g, "\\u003c"),
        }}
      />
      <a
        href="#work"
        className="bg-accent text-accent-foreground sr-only rounded-br-lg px-4 py-2.5 text-sm font-bold focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50"
      >
        {t("skipToWork")}
      </a>

      <Header />

      <main className="flex-1">
        <Hero
          name={t("name")}
          role={t("role")}
          availability={t("availability")}
          intro={t("intro")}
          ctaContact={t("ctaContact")}
          ctaResume={t("ctaResume")}
          replyNote={t("replyNote")}
          resumeHref={"/" + currentLocale + "/resume"}
        />
        <StatsBand locale={currentLocale} />
        <FeaturedWork locale={currentLocale} />
        <ContactForm />
      </main>

      <Footer />
    </div>
  );
}
