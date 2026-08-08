import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { contactLinks } from "@/lib/contacts";

export async function Footer() {
  const t = await getTranslations("PrivacyPage");

  return (
    <footer className="border-border border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {contactLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              {...("external" in link && link.external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className="hover:text-accent-bright transition-colors"
            >
              {link.text}
            </a>
          ))}
        </nav>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            href="/privacy"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span>© {new Date().getFullYear()} Yushko Nazar</span>
        </div>
      </div>
    </footer>
  );
}
