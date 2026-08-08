import { notFound } from "next/navigation";

// Without this, a locale-prefixed URL that matches nothing (/en/typo) never
// reaches a route at all, so Next can't hand it to the 404 boundary.
export default function CatchAllPage() {
  notFound();
}
