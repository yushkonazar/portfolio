import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Turnstile ships a script and an iframe; the analytics beacon loads from a
// separate host and reports back to a third. Everything else is same-origin —
// fonts are self-hosted via next/font, images live in public/.
const TURNSTILE = "https://challenges.cloudflare.com";
const BEACON = "https://static.cloudflareinsights.com";
const BEACON_REPORT = "https://cloudflareinsights.com";

// 'unsafe-inline' for scripts is the honest trade-off here: the App Router
// inlines the RSC payload, and nonce-ing it needs per-request middleware that
// @opennextjs/cloudflare can't currently run. Restricting origins still blocks
// the realistic attack (loading code from somewhere else).
// React needs eval() in development for debugging (reconstructing callstacks,
// source maps). It never uses eval in production, so this stays dev-only.
const devEval = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

// The Svitanok status endpoint lives on another origin, so the fetch that reads
// it has to be named in connect-src or CSP refuses it. Resolved here because
// NEXT_PUBLIC_* values are inlined at build time anyway — the same moment this
// header is assembled. An unset or unparseable value leaves connect-src as it
// was, which is exactly the outcome the component is built to survive.
const SVITANOK_ORIGIN = (() => {
  const url = process.env.NEXT_PUBLIC_SVITANOK_STATUS_URL;
  if (!url) return "";
  try {
    return ` ${new URL(url).origin}`;
  } catch {
    console.warn(
      `NEXT_PUBLIC_SVITANOK_STATUS_URL is not a valid URL (${url}); leaving it out of connect-src.`,
    );
    return "";
  }
})();

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${devEval} ${TURNSTILE} ${BEACON}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self' ${BEACON_REPORT} ${TURNSTILE}${SVITANOK_ORIGIN}`,
  `frame-src ${TURNSTILE}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // `interest-cohort` stays for the browsers that still honour it, but FLoC
    // was replaced by the Topics API — `browsing-topics` is the directive that
    // actually opts out today.
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    // No Cloudflare Images binding configured — serving pre-optimized
    // static assets directly instead of routing through Next's
    // Node-based optimizer, which @opennextjs/cloudflare doesn't run on Workers.
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
