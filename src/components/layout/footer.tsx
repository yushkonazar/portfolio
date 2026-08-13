import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { TerminalMark } from "./terminal-mark";

// Contact links deliberately live only in the contact section now — having
// the same three in both places meant neither read as the place to act.
export async function Footer() {
  const t = await getTranslations("PrivacyPage");

  return (
    <footer className="border-t border-white/[0.08]">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-8 text-sm md:px-11">
        <span>© {new Date().getFullYear()} Yushko Nazar</span>
        {/* The prompt mark sits with the privacy link rather than alone: two small
            things at the end of a page read as a set, one reads as a stray. */}
        <div className="flex items-center gap-3">
          <Link
            href="/privacy"
            className="focus-visible:outline-accent-bright hover:text-foreground rounded transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {t("title")}
          </Link>
          <TerminalMark />
        </div>
      </div>
    </footer>
  );
}
