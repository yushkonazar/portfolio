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
    <section className="relative overflow-hidden px-6 pt-8 pb-10 md:px-11 md:pt-9 md:pb-11">
      {/* The fracture animation, confined to the hero and masked away from the
          headline so it never fights the type. */}
      <div className="hero-crack-mask pointer-events-none absolute inset-0">
        <SiteBackground scoped region="right" bursts={2} cap={16} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-16 h-[560px] w-[520px] bg-[radial-gradient(ellipse_at_center,rgba(217,119,6,0.2),rgba(217,119,6,0)_62%)]"
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-start gap-8 md:flex-row md:items-end md:gap-10">
        <div className="min-w-0 flex-1">
          <span className="text-accent-bright flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] uppercase">
            <span className="bg-accent-bright ember-pulse h-1.5 w-1.5 rounded-full" />
            {availability}
          </span>

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

        <Image
          src="/avatar.jpg"
          alt={name}
          width={800}
          height={1200}
          priority
          className="hidden h-[296px] w-[228px] shrink-0 rounded-2xl border border-white/15 object-cover object-[50%_20%] shadow-[0_24px_70px_rgba(217,119,6,0.2)] md:block"
        />
      </div>
    </section>
  );
}
