import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    // No Cloudflare Images binding configured — serving pre-optimized
    // static assets directly instead of routing through Next's
    // Node-based optimizer, which @opennextjs/cloudflare doesn't run on Workers.
    unoptimized: true,
  },
};

initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
