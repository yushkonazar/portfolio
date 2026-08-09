import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SiteBackground } from "@/components/site-background";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "PrivacyPage" });

  return {
    title: t("title"),
    description: t("intro"),
    alternates: {
      canonical: `/${locale}/privacy`,
      languages: { en: "/en/privacy", uk: "/uk/privacy" },
    },
  };
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("PrivacyPage");

  const sections = [
    ["collectionHeading", "collectionBody"],
    ["usageHeading", "usageBody"],
    ["analyticsHeading", "analyticsBody"],
    ["retentionHeading", "retentionBody"],
    ["contactHeading", "contactBody"],
  ] as const;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
          <h1 className="text-3xl font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            {t("intro")}
          </p>

          <div className="mt-10 flex flex-col gap-8">
            {sections.map(([heading, body]) => (
              <section key={heading}>
                <h2 className="text-sm font-medium tracking-wide uppercase">
                  {t(heading)}
                </h2>
                <p className="text-muted-foreground mt-3 leading-relaxed">
                  {t(body)}
                </p>
              </section>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
