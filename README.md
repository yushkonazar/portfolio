# Yushko Nazar — Developer Portfolio

Personal developer portfolio built with Next.js, deployed on Cloudflare.

**Live:** [yushko.dev](https://yushko.dev)

## Features

- **Bilingual, English and Ukrainian** — routed by `next-intl`, detected from the browser on a first visit and switchable in the header. Every string, including the case studies and the resume, exists in both.
- **Statically generated, served from Cloudflare Workers** — every page prerendered through `generateStaticParams` and deployed by `@opennextjs/cloudflare`. No origin server to keep warm.
- **Content-Security-Policy and security headers** — CSP with the third-party origins named explicitly, HSTS, `frame-ancestors 'none'`, a `Permissions-Policy`, and a `_headers` file covering the static assets the Next server never sees.
- **A canvas trace field** — hairline traces that burst from a point, route on a 45°/90° lattice, arrest where they meet, then fade. It stops when the tab is hidden, thins out on a touch device, and doesn't run at all under `prefers-reduced-motion`.
- **Contact form behind Turnstile** — explicit widget render so a failed challenge is a visible fallback rather than a silent dead end, token verified server-side against hostname and remote address, delivered by Resend. Nothing is stored in a database.

## Stack

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com)
- [next-intl](https://next-intl.dev) — bilingual (Ukrainian / English), auto-detected from browser language
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare)

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the local dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build locally |
| `npm run lint` | Lint the codebase |
| `npm run preview` | Build for Cloudflare and preview locally via Wrangler |
| `npm run deploy` | Build and deploy to Cloudflare |

## Project structure

```
src/
  app/[locale]/       # routes (uk/en), layouts, global styles
  components/         # UI components
  i18n/                # next-intl routing, navigation, request config
  lib/                 # utilities and content data
messages/              # translation strings (uk.json, en.json)
```

## License

MIT — see [LICENSE](LICENSE).
