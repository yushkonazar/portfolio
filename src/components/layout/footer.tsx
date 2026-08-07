import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("PrivacyPage");

  return (
    <footer className="border-border border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-8 text-sm">
        <span>© {new Date().getFullYear()} Yushko Nazar</span>
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          {t("title")}
        </Link>
      </div>
    </footer>
  );
}
