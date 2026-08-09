import { cn } from "@/lib/utils";

export type Stat = { value: string; label: string };

/**
 * The band under the hero. It has two jobs: say something worth knowing to a
 * visitor with no technical background, and become a readout of whichever
 * project is open below.
 *
 * The swap animation is a keyed remount plus a CSS enter animation rather than
 * a state machine — the values aren't all numbers ("Solo", "< 24h"), so a
 * counting animation would only work on some cells and look broken on the rest.
 */
export function StatsBand({
  stats,
  caption,
}: {
  stats: Stat[];
  caption: string;
}) {
  return (
    <section
      aria-label={caption}
      className="border-border/40 border-y bg-[#080808]"
    >
      <div className="mx-auto w-full max-w-5xl px-6 pt-3 md:px-11">
        <span
          key={caption}
          aria-hidden
          className="stat-enter text-muted-foreground inline-block font-mono text-[10px] tracking-[0.16em] uppercase"
        >
          {caption}
        </span>
      </div>
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 md:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={caption + stat.value + index}
            className={cn(
              "stat-enter px-6 py-4 md:py-5",
              index % 2 === 1 ? "border-l border-white/[0.08]" : "",
              index < 2 ? "border-b border-white/[0.08] md:border-b-0" : "",
              index === 2 ? "md:border-l md:border-white/[0.08]" : "",
              index === 0 ? "md:pl-11" : "",
            )}
            style={{ animationDelay: `${index * 45}ms` }}
          >
            <div className="text-2xl font-bold tracking-[-0.03em] md:text-[28px]">
              {stat.value}
            </div>
            <div className="text-muted-foreground mt-1 font-mono text-[10px] tracking-[0.1em] uppercase md:text-[11px]">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
