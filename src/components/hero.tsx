import Image from "next/image";
import { SiteBackground } from "./site-background";

type HeroProps = {
  name: string;
  role: string;
  availability: string;
  intro: string;
  ctaContact: string;
  ctaResume: string;
  replyNote: string;
  resumeHref: string;
};

export function Hero({
  name,
  role,
  availability,
  intro,
  ctaContact,
  ctaResume,
  replyNote,
  resumeHref,
}: HeroProps) {
  return (
    // Padding lives on the inner container, not here: every other section on
    // the page pads inside its max-width box, and putting it on the section
    // left the hero's text a full gutter to the left of everything below it.
    // The absolute layers below still span the section edge to edge.
    <section className="relative overflow-hidden">
      {/* The fracture animation, confined to the hero and masked away from the
          headline so it never fights the type. */}
      <div className="hero-crack-mask pointer-events-none absolute inset-0">
        <SiteBackground scoped region="right" bursts={2} cap={16} />
      </div>
      {/* The single warm source in this corner. The portrait used to cast its
          own amber shadow on top of this one and the two stacked into a muddy
          blob; now this sits where light would fall on the lit half of the
          face. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 right-24 h-[560px] w-[480px] bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.22),rgba(217,119,6,0)_62%)]"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-start gap-8 px-6 pt-8 pb-10 md:flex-row md:items-end md:gap-10 md:px-11 md:pt-9 md:pb-11">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {/* Phones never see the portrait, so they get a face here instead
                — cropped from the photo the cut-out was taken from, so the two
                viewports show the same shot. Not the cut-out itself: its
                transparent margin would punch holes in a rounded-full disc. */}
            <Image
              src="/avatar-sm.webp"
              alt=""
              width={128}
              height={128}
              loading="lazy"
              className="h-11 w-11 shrink-0 rounded-full border border-white/15 md:hidden"
            />
            <span className="text-accent-bright flex min-w-0 items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
              <span className="bg-accent-bright ember-pulse h-1.5 w-1.5 rounded-full" />
              {availability}
            </span>
          </div>

          <h1 className="mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.035em] md:text-[86px] md:leading-[0.94] md:tracking-[-0.04em]">
            {name.split(" ").map((word) => (
              <span key={word} className="block">
                {word}
              </span>
            ))}
          </h1>

          <p className="mt-4 text-base font-medium md:mt-[18px] md:text-[19px]">
            {role}
          </p>
          <p className="text-muted-foreground mt-2 max-w-[500px] text-sm leading-relaxed text-pretty md:text-[15px]">
            {intro}
          </p>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:mt-[26px]">
            <a
              href="#contact"
              className="bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright flex h-12 items-center justify-center rounded-lg px-6 text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-[46px]"
            >
              {ctaContact}
            </a>
            <a
              href={resumeHref}
              className="border-border hover:border-muted-foreground focus-visible:outline-accent-bright flex h-12 items-center justify-center rounded-lg border px-5 text-[14.5px] font-semibold transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-[46px]"
            >
              {ctaResume}
            </a>
            <span className="text-muted-foreground hidden font-mono text-[11.5px] leading-[1.5] whitespace-pre-line sm:block">
              {replyNote}
            </span>
          </div>
        </div>

        {/* Framed, not cut out. The cut-out only worked while the page was a
            flat near-black it could dissolve into; over a textured surface a
            silhouette reads as a sticker no matter how its edge is tuned. A
            stated edge is the honest answer where a hidden one would be a
            losing fight — and since the photo's own background is already
            black, the frame can stay a hairline instead of becoming a mount.

            width/height are the file's real 640x960. With `w-auto` the browser
            sizes from the attribute ratio, so a stale value here stretches the
            photo rather than merely reserving the wrong box.

            `priority`, not lazy: a real PageSpeed run named this element the
            desktop LCP candidate, and lazy-loading the LCP image is exactly
            the mistake that diagnostic exists to catch. */}
        <div className="portrait-enter relative hidden shrink-0 md:block">
          {/* Cast onto the texture rather than floating over it: a wide, very
              soft shadow is what puts the card on a surface instead of on a
              backdrop. */}
          <div className="relative overflow-hidden rounded-xl shadow-[0_26px_70px_-12px_rgba(0,0,0,0.85)]">
            <Image
              src="/portrait.webp"
              alt={name}
              width={640}
              height={960}
              priority
              className="portrait-drift block h-[380px] w-auto"
            />

            {/* Sinks the photograph's own edges so it reads as printed into
                the card rather than pasted on top of it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(0,0,0,0.6)]"
            />

            {/* The amber in the hero comes from the upper left; this is what
                that light would do to a glossy surface facing it. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(150deg,rgba(245,158,11,0.13),rgba(245,158,11,0)_38%)]"
            />

            {/* The sheen. Kept to white at 7% — the subject is lit from one
                side and mostly in shadow, so anything stronger stops looking
                like light on skin and starts looking like a swipe effect. */}
            <div
              aria-hidden
              className="portrait-sheen pointer-events-none absolute -inset-x-1/4 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,0.07)_45%,rgba(255,255,255,0))]"
            />

            {/* Hairline last, so neither the vignette nor the sheen paints
                over it and softens the card's edge. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-xl border border-white/[0.14]"
            />
            {/* One lit edge along the top, the way a physical print catches a
                room light — a uniform border reads as a UI box. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,0.32),rgba(255,255,255,0))]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
