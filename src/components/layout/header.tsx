import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { GitHubIcon } from "@/components/icons";
import { HEADER_CONTROL, HEADER_ICON } from "./control-styles";
import { LocaleSwitcher } from "./locale-switcher";

// A monogram rather than the full name: on the home page the wordmark sat
// directly above the same name at 86px, which read as a duplication. Work and
// Contact only scrolled the home page, and Resume is already a button in the
// hero — so the one thing that earns a place up here is the GitHub mark, which
// is otherwise a full scroll away at the bottom of the page.
export async function Header() {
  const t = await getTranslations("Header");

  return (
    <header className="border-b border-white/[0.08]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-[15px] md:px-11">
        {/* Pulled left by its own padding and border so the glyphs — not the
            box around them — land on the same vertical line as every heading
            below. */}
        <Link
          href="/"
          aria-label={t("home")}
          className="border-accent/40 hover:border-accent hover:text-accent-bright focus-visible:outline-accent-bright -ml-[9px] rounded-md border px-2 py-1 font-mono text-[13px] font-bold tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          YN
        </Link>

        {/* gap-2, not gap-1.5: 6px between two adjacent targets is under the 8px
            that keeps a tap from landing on the wrong one. */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/yushkonazar"
            target="_blank"
            rel="noreferrer"
            aria-label={t("github")}
            className={HEADER_CONTROL}
          >
            <GitHubIcon className={HEADER_ICON} />
          </a>
          <LocaleSwitcher />
        </div>
      </div>
    </header>
  );
}
