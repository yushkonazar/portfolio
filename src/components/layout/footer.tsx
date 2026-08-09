import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Contact links deliberately live only in the contact section now — having
// the same three in both places meant neither read as the place to act.
export async function Footer() {
  const t = await getTranslations("PrivacyPage");

  return (
    <footer className="border-t border-white/[0.08]">
      <div className="text-muted-foreground mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-8 text-sm md:px-11">
        <span>© {new Date().getFullYear()} Yushko Nazar</span>
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          {t("title")}
        </Link>
      </div>
    </footer>
  );
}
