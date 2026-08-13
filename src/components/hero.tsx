import type { CSSProperties } from "react";
import Image from "next/image";
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

          {/* Split into words so the intro can stagger them, which costs the
              headline its own accessible name — a screen reader would read a
              list of fragments. The label on the h1 restores the whole thing and
              the spans step out of the way. */}
          <h1
            aria-label={name}
            className="mt-4 text-[44px] leading-[0.98] font-extrabold tracking-[-0.035em] md:text-[86px] md:leading-[0.94] md:tracking-[-0.04em]"
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

          {/* The name's rise carries on down the hero — these three lift half as
              far, in order, so the whole block arrives instead of one line of
              it. `--lift` is their place in the queue. */}
          <p
            className="intro-lift mt-4 text-base font-medium md:mt-[18px] md:text-[19px]"
            style={{ "--lift": 0 } as CSSProperties}
          >
            {role}
          </p>
          <p
            className="intro-lift text-muted-foreground mt-2 max-w-[500px] text-sm leading-relaxed text-pretty md:text-[15px]"
            style={{ "--lift": 1 } as CSSProperties}
          >
            {intro}
          </p>

          <div
            className="intro-lift mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:mt-[26px]"
            style={{ "--lift": 2 } as CSSProperties}
          >
            <a
              href="#contact"
              className="bg-accent text-accent-foreground hover:bg-accent-bright focus-visible:outline-accent-bright flex h-12 items-center justify-center rounded-lg px-6 text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-[46px]"
            >
              {ctaContact}
            </a>
            {/* The resume is a page on this site, so it navigates like one —
                the locale comes from the routing config rather than being
                spliced into the href by hand. */}
            <Link
              href="/resume"
              className="border-border hover:border-muted-foreground focus-visible:outline-accent-bright flex h-12 items-center justify-center rounded-lg border px-5 text-[14.5px] font-semibold transition-colors hover:bg-white/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-[46px]"
            >
              {ctaResume}
            </Link>
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

            Its own component now, because tilt and flip need state and the rest
            of the hero is static. Cast onto the texture rather than floating
            over it: the wide, very soft shadow that puts the card on a surface
            instead of on a backdrop lives in there too. */}
        <PortraitCard name={name} />
      </div>
    </section>
  );
}
