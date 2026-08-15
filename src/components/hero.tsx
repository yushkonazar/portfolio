import type { CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { PortraitCard } from "./portrait-card";
import { SiteBackground } from "./site-background";

type HeroProps = {
  name: string;
  role: string;
  availability: string;
  intro: string;
  ctaContact: string;
  ctaResume: string;
  replyNote: string;
};

export function Hero({
  name,
  role,
  availability,
  intro,
  ctaContact,
  ctaResume,
  replyNote,
}: HeroProps) {
  return (
    // Padding lives on the inner container, not here: every other section on
    // the page pads inside its max-width box, and putting it on the section
    // left the hero's text a full gutter to the left of everything below it.
    // The absolute layers below still span the section edge to edge.
    <section className="relative overflow-hidden">
      {/* The fracture animation, confined to the hero and masked away from the
          headline so it never fights the type. */}
      {/* `avoid` names the portrait so the first-entry trace is routed clear of
          it. The mask keeps this canvas off the headline, but nothing kept it
          out from behind the photograph, which covers 66% to 87% of the width
          for all but the top 42px — so the one scripted moment on the site spent
          most of its run behind an opaque object. Ambient traces still pass
          behind it, which is the texture doing its job. */}
      <div className="hero-crack-mask pointer-events-none absolute inset-0">
        <SiteBackground
          scoped
          region="right"
          bursts={2}
          cap={16}
          choreo
          avoid=".portrait-frame"
        />
      </div>
      {/* No warm blob behind the portrait any more. A radial sitting where an
          opaque object stands does not light it — it silhouettes it, which is
          why the card read as a sticker with a lamp behind it. The same thing
          happened to the cut-out earlier for the same reason.

          The warmth is still here, and now every bit of it has a source: the
          traces, the card's own lit corner, the availability dot and the
          primary button. */}
      {/* The arrangement lives in globals.css as `.hero-layout` — two sets of
          grid areas, one per breakpoint. The DOM order here is the reading order:
          availability, name and role, paragraph, buttons, portrait. That is what a
          screen reader gets, and what the page looks like with no CSS at all. */}
      <div className="hero-layout relative mx-auto w-full max-w-5xl gap-x-4 gap-y-0 px-6 pt-8 pb-10 md:gap-x-10 md:px-11 md:pt-9 md:pb-11">
        <div className="hero-badge flex items-center gap-3">
          <span className="text-accent-bright flex min-w-0 items-center gap-2 font-mono text-[0.6875rem] tracking-[0.16em] uppercase">
            <span className="bg-accent-bright ember-pulse h-1.5 w-1.5 rounded-full" />
            {availability}
          </span>
        </div>

        <div className="hero-name min-w-0">
          {/* Split into words so the intro can stagger them, which costs the
              headline its own accessible name — a screen reader would read a
              list of fragments. The label on the h1 restores the whole thing and
              the spans step out of the way. */}
          <h1
            aria-label={name}
            className="mt-4 text-[2.75rem] leading-[0.98] font-extrabold tracking-[-0.035em] md:text-[5.375rem] md:leading-[0.94] md:tracking-[-0.04em]"
          >
            {name.split(" ").map((word, index) => (
              <span
                key={word}
                aria-hidden
                className="intro-word block"
                style={{ "--word": index } as CSSProperties}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* The name's rise carries on down the hero — these lift half as far,
              in order, so the whole block arrives instead of one line of it.
              `--lift` is their place in the queue. */}
          <p
            className="intro-lift mt-4 text-base font-medium md:mt-[18px] md:text-[1.1875rem]"
            style={{ "--lift": 0 } as CSSProperties}
          >
            {role}
          </p>
        </div>

        <p
          className="hero-intro intro-lift text-muted-foreground mt-4 max-w-[500px] text-sm leading-relaxed text-pretty md:mt-2 md:text-[0.9375rem]"
          style={{ "--lift": 1 } as CSSProperties}
        >
          {intro}
        </p>

        {/* Both buttons on one line, at every width. They fit: measured at 375,
            the pair plus its gap comes to 280 of the 327 available. */}
        <div
          className="hero-cta intro-lift mt-6 flex flex-row items-center gap-3 md:mt-[26px]"
          style={{ "--lift": 2 } as CSSProperties}
        >
          <a
            href="#contact"
            className="bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright flex h-12 shrink-0 items-center justify-center rounded-lg px-6 text-[0.90625rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-[2.875rem]"
          >
            {ctaContact}
          </a>
          {/* The resume is a page on this site, so it navigates like one — the
              locale comes from the routing config rather than being spliced into
              the href by hand. */}
          <Link
            href="/resume"
            className="border-border hover:border-muted-foreground focus-visible:outline-accent-bright flex h-12 shrink-0 items-center justify-center rounded-lg border px-5 text-[0.90625rem] font-semibold transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-[2.875rem]"
          >
            {ctaResume}
          </Link>
          <span className="text-muted-foreground hidden font-mono text-[0.71875rem] leading-[1.5] whitespace-pre-line lg:block">
            {replyNote}
          </span>
        </div>

        {/* Framed, not cut out. The cut-out only worked while the page was a flat
            near-black it could dissolve into; over a textured surface a
            silhouette reads as a sticker no matter how its edge is tuned. Since
            the photo's own background is already black, the frame can stay a
            hairline instead of becoming a mount.

            Its own component because tilt and flip need state and the rest of the
            hero is static. The wide, soft shadow that puts the card on a surface
            rather than on a backdrop lives in there too. */}
        <PortraitCard name={name} className="hero-card" />
      </div>
    </section>
  );
}
