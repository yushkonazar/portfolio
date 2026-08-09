import { siteStats } from "@/lib/project-meta";
import type { Locale } from "@/i18n/routing";

export function StatsBand({ locale }: { locale: Locale }) {
  return (
    <section
      aria-label="At a glance"
      className="border-border/40 grid grid-cols-2 border-y bg-[#080808] md:grid-cols-4"
    >
      {siteStats.map((stat, index) => (
        <div
          key={stat.value + stat.label[locale]}
          className={[
            "px-5 py-4 md:px-6 md:py-5",
            index % 2 === 1 ? "border-l border-white/[0.08]" : "",
            index < 2 ? "border-b border-white/[0.08] md:border-b-0" : "",
            index === 2 ? "md:border-l md:border-white/[0.08]" : "",
            index === 0 ? "md:pl-11" : "",
          ].join(" ")}
        >
          <div className="text-2xl font-bold tracking-[-0.03em] md:text-[28px]">
            {stat.value}
          </div>
          <div className="text-muted-foreground mt-1 font-mono text-[10px] tracking-[0.1em] uppercase md:text-[11px]">
            {stat.label[locale]}
          </div>
        </div>
      ))}
    </section>
  );
}
