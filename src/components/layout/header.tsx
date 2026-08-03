import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

export function Header() {
  return (
    <header className="border-border border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-medium tracking-tight">
          Yushko Nazar
        </Link>
        <LocaleSwitcher />
      </div>
    </header>
  );
}
