import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export async function Header() {
  const t = await getTranslations("ResumePage");

  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-medium tracking-tight">
          Yushko Nazar
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/resume"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {t("title")}
          </Link>
          <LocaleSwitcher />
        </nav>
      </div>
    </header>
  );
}
