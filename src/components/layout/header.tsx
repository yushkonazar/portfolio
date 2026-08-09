import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export async function Header() {
  const locale = await getLocale();
  const t = await getTranslations("Nav");

  // Plain <a> with an absolute, locale-prefixed path rather than a bare
  // "#work": Header renders on every route, and "#work"/"#contact" only
  // resolve to something on the home page — everywhere else they're dead
  // anchors. This still gets a same-page smooth scroll when already home.
  return (
    <header className="border-b border-white/[0.08]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-[15px] md:px-11">
        <Link href="/" className="text-[15px] font-bold tracking-[-0.01em]">
          Yushko Nazar
        </Link>
        <nav className="flex items-center gap-5 text-[13.5px] md:gap-6">
          <a
            href={`/${locale}#work`}
            className="border-accent border-b-[1.5px] pb-[3px] transition-colors"
          >
            {t("work")}
          </a>
          <Link
            href="/resume"
            className="text-muted-foreground hover:text-foreground border-b-[1.5px] border-transparent pb-[3px] transition-colors hover:border-white/30"
          >
            {t("resume")}
          </Link>
          <a
            href={`/${locale}#contact`}
            className="text-muted-foreground hover:text-foreground hidden border-b-[1.5px] border-transparent pb-[3px] transition-colors hover:border-white/30 sm:block"
          >
            {t("contact")}
          </a>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
