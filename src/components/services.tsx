import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

/**
 * Sits between the hero and the work, in the slot the stats band used to hold.
 *
 * The page says who I am, what I've built and how to reach me; nothing on it
 * said what I can do for the person reading. A recruiter infers that from the
 * projects — a prospective client can't, and it's the only question they came
 * with. Plain wording on purpose: it has to land without the reader knowing
 * what any of the tools underneath are.
 */
export async function Services() {
  const t = await getTranslations("Services");

  const items = [
    { title: t("buildTitle"), body: t("buildBody") },
    { title: t("improveTitle"), body: t("improveBody") },
    { title: t("automateTitle"), body: t("automateBody") },
  ];

  return (
    // Translucent rather than the #080808 it used to be. Over the page colour
    // it composites to the same tone, but an opaque band would black out the
    // fixed frame behind it and make the vignette blink on and off as the
    // page scrolls past this section.
    <section className="border-border/40 border-y bg-white/[0.012]">
      <div className="mx-auto w-full max-w-5xl px-6 pt-3 md:px-11">
        <h2 className="text-muted-foreground m-0 font-mono text-[0.625rem] font-normal tracking-[0.16em] uppercase">
          {t("caption")}
        </h2>
      </div>
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 md:grid-cols-3">
        {items.map((item, index) => (
          <Reveal
            key={item.title}
            delay={index * 90}
            className={cn(
              "px-6 py-5 md:py-6",
              index > 0 && "border-t border-white/[0.08] md:border-t-0",
              index > 0 && "md:border-l md:border-white/[0.08]",
              index === 0 && "md:pl-11",
              index === items.length - 1 && "md:pr-11",
            )}
          >
            <h3 className="m-0 text-[0.9375rem] leading-[1.25] font-bold tracking-[-0.02em] text-balance md:text-[1.125rem]">
              {item.title}
            </h3>
            <p className="text-muted-foreground mt-2 m-0 text-[0.84375rem] leading-relaxed text-pretty md:text-sm">
              {item.body}
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
