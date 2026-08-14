import type { Metadata } from "next";
import Script from "next/script";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { manrope } from "../fonts";
import { PageTexture } from "@/components/page-texture";
import { Terminal } from "@/components/terminal";
import { TypeSizeScript } from "@/components/layout/type-size";
import "../globals.css";

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
        // Where a search engine should send everyone whose language isn't one
        // of the two. Without it, a Polish or German visitor gets whichever
        // alternate the crawler happened to index.
        "x-default": "/en",
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
    // The home page's inline intro script marks this element before React
    // hydrates, which is the whole point of it — so the server HTML and the
    // client render differ here by design, and React is told not to report it.
    // Scoped to this element's own attributes, and the only ones it renders are
    // `lang` and the font class, neither of which varies.
    <html lang={locale} className={manrope.variable} suppressHydrationWarning>
      <body>
        {/* First thing in the body, so a reader who chose a larger size never
            sees the page at the default and then watches it jump. */}
        <TypeSizeScript />
        {/* Before the content div so it lands under z-10, and under the trace
            canvas too — page colour, surface, traces, content. */}
        <PageTexture />
        <NextIntlClientProvider>
          <div className="relative z-10">{children}</div>
          {/* A sibling of the content rather than inside it, which is what lets
              it make everything else inert while it's up — see the effect that
              does. Every page, because the mark that opens it is in every
              footer. */}
          <Terminal />
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
