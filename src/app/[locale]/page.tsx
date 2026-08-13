import { getTranslations, setRequestLocale } from "next-intl/server";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ContactForm } from "@/components/contact-form";
import { Hero } from "@/components/hero";
import { Services } from "@/components/services";
import { FeaturedWork } from "@/components/featured-work";
import { BurstHint } from "@/components/burst-hint";
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
      {/* Runs while the parser is still above the hero, so the marker is on
          <html> before any of it is painted and there is no frame in which the
          page has already settled and then re-animates.

          A data attribute rather than a class, so `class` stays entirely
          React's. Either way the element differs from what the server sent,
          which is why the layout marks <html> suppressHydrationWarning — React
          19 reconciles added attributes on hydrated hosts too, not just the
          props it rendered.

          It decides everything about the intro and then gets out of the way:
          seen already, or reduced motion, or storage unavailable, and no class
          is set — which is the same page anyone gets with JS switched off. The
          flag is written before the class, so a reload during the intro counts
          as having seen it. The three listeners are what makes the sequence
          interruptible; they clear themselves once it can no longer be
          interrupted — which is after the last word has landed, not before. At
          1400ms they outlived the sequence they were watching by less than they
          were cut short by it, and a click in the final 400ms did nothing.

          Inline, and therefore leaning on the CSP's documented 'unsafe-inline'
          for scripts — the same trade-off the RSC payload already needs. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{
var r=document.documentElement;
if(sessionStorage.getItem("intro-seen"))return;
if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
sessionStorage.setItem("intro-seen","1");
r.setAttribute("data-intro","");
var d=function(){removeEventListener("pointerdown",s);removeEventListener("keydown",s);removeEventListener("wheel",s)};
var s=function(){r.setAttribute("data-intro-skip","");d()};
addEventListener("pointerdown",s,{passive:true});
addEventListener("keydown",s);
addEventListener("wheel",s,{passive:true});
setTimeout(d,2200);
}catch(e){}})();`,
        }}
      />
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
        />
        {/* Between the hero and the proof: the one question the work itself
            doesn't answer for a visitor who can't read the work. */}
        <Services />
        <FeaturedWork locale={currentLocale} />
        <ContactForm />
      </main>

      <Footer />

      {/* The hint points at the canvas the hero runs, so it has nothing to say
          anywhere else. The terminal moved to the locale layout: its answers are
          about the work, the stack and how to reach me, none of which is
          home-page-specific, and the mark that opens it is in the footer of every
          page. Leaving it here made that mark dead on four routes out of six. */}
      <BurstHint />
    </div>
  );
}
