import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Script from "next/script";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SiteBackground } from "@/components/site-background";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const SITE_URL = "https://yushko.dev";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    keywords: t("keywords")
      .split(",")
      .map((keyword) => keyword.trim()),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        uk: "/uk",
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      siteName: "Yushko Nazar",
      locale: locale === "uk" ? "uk_UA" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const cfBeaconToken = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN;

  return (
    <html lang={locale} className={manrope.variable}>
      <body>
        <SiteBackground />
        <NextIntlClientProvider>
          <div className="relative z-10">{children}</div>
        </NextIntlClientProvider>
        {cfBeaconToken && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${cfBeaconToken}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
