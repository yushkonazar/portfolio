import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

// A monogram rather than the full name: on the home page the wordmark sat
// directly above the same name at 86px, which read as a duplication. Nothing
// else lives here either — Work and Contact only scrolled the home page, and
// Resume is already a button in the hero.
export function Header() {
  return (
    <header className="border-b border-white/[0.08]">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-[15px] md:px-11">
        <Link
          href="/"
          aria-label="Yushko Nazar — home"
          className="border-accent/40 hover:border-accent hover:text-accent-bright rounded-md border px-2 py-1 font-mono text-[13px] font-bold tracking-[0.08em] transition-colors"
        >
          YN
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
