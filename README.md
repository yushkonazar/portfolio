# Yushko Nazar — Developer Portfolio

Bilingual portfolio and case-study site. Statically generated with Next.js, served from Cloudflare Workers.

**Live:** [yushko.dev](https://yushko.dev)

<!-- Hero screenshot goes here once it exists:
![The home page](public/readme-hero.jpg)
-->

## Six runtime dependencies

```
clsx  next  next-intl  react  react-dom  tailwind-merge
```

Two of those are React. Nothing else ships to the browser, which is the point rather than a coincidence — everything below is written here instead of installed:

| | Instead of | Where |
|---|---|---|
| A QR encoder — byte mode, Reed–Solomon over GF(256), all eight mask patterns scored on the four penalty rules, BCH format bits | `qrcode`, `qr-code-styling` | [`src/lib/qr.ts`](src/lib/qr.ts) |
| A canvas fracture field — traces route on a 45°/90° lattice, arrest on contact via a spatial hash, branch, hold, fade | `three`, a particles library | [`src/components/site-background.tsx`](src/components/site-background.tsx) |
| Tilt and flip on the portrait, eased per frame with `requestAnimationFrame` | `framer-motion` | [`src/components/portrait-card.tsx`](src/components/portrait-card.tsx) |
| Open Graph cards drawn at request time in the site's own typeface | a screenshot service | [`src/lib/og.tsx`](src/lib/og.tsx) |
| A command overlay with completion, history and a fixed route table | a terminal emulator package | [`src/components/terminal.tsx`](src/components/terminal.tsx) |

## What's in it

- **Two languages, all the way down.** `next-intl` routes `/uk` and `/en`, detected from the browser on a first visit and switchable from the header. Every string exists in both — including the case studies, the resume and the 404. The two message catalogues are checked for identical key sets.
- **Prerendered, no origin.** Every page comes out of `generateStaticParams` at build time and is deployed by `@opennextjs/cloudflare`. The only dynamic route is the contact endpoint.
- **A contact form that can't be a spam relay.** Recipient and sender are hardcoded constants; the Turnstile token is verified server-side against both the solving hostname and `CF-Connecting-IP`; the subject is stripped of control characters before it reaches a header; the reply-to is pattern-matched. Delivered by Resend, stored nowhere.
- **Security headers, including for the paths Next never sees.** CSP with third-party origins named explicitly, HSTS, `frame-ancestors 'none'`, a `Permissions-Policy` — plus a [`_headers`](public/_headers) file covering the static assets served straight off the Workers asset binding.
- **A QR generator on the back of the portrait.** Type a link, watch it print top to bottom, then open or download it. The download is rasterised to PNG rather than saving the SVG on screen, because an SVG runs whatever script it carries when it's opened.
- **Motion that takes no for an answer.** Every animation is gated on `prefers-reduced-motion`, in CSS and again in JS where a component decides for itself. The canvas stops when the tab is hidden and thins out on a touch device.
- **Keyboard and screen-reader paths that were tested, not assumed.** Real `<button>`s with `aria-expanded` over the collapsible rows, `inert` on anything facing away or behind a modal, focus returned to whatever opened a dialog, and no focus ring removed without a replacement.
- **A terminal.** `` ` `` or the `>_` mark in the footer. `help` lists it.

## Stack

| | |
|---|---|
| [Next.js 16](https://nextjs.org) | App Router, TypeScript, Turbopack |
| [Tailwind CSS v4](https://tailwindcss.com) | CSS-first config, no `tailwind.config.js` |
| [next-intl 4](https://next-intl.dev) | routing, message catalogues |
| [Cloudflare Workers](https://developers.cloudflare.com/workers/) | via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) |
| [Turnstile](https://developers.cloudflare.com/turnstile/) + [Resend](https://resend.com) | contact form |

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site runs without any environment variable set — the contact form reports that it isn't configured, and the Svitanok status line simply doesn't render.

For the contact form locally, copy `.dev.vars.example` to `.dev.vars` and use Cloudflare's Turnstile **test** keys, which pass on any hostname:

| | |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` |
| `TURNSTILE_SECRET_KEY` | `1x0000000000000000000000000000000AA` |

Both halves have to be test keys; a real site key and a test secret never verify together.

`NEXT_PUBLIC_SVITANOK_STATUS_URL` is read at build time and its origin is appended to `connect-src`, so changing it needs a rebuild rather than a redeploy.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm start` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run preview` | Build for Cloudflare and preview through Wrangler |
| `npm run deploy` | Build for Cloudflare and deploy |
| `npm run cf-typegen` | Regenerate `cloudflare-env.d.ts` from `wrangler.jsonc` |

CI runs `tsc --noEmit`, ESLint and a full build on every push — the build step because the first two pass happily on code that can't ship.

## Structure

```
src/
  app/
    [locale]/          uk + en routes, layout, OG images, icons
      projects/[slug]/  case studies
      resume/           resume page
      privacy/          privacy page
    api/contact/       the one dynamic route
    not-found.tsx      renders its own document — no locale in scope
    globals.css        Tailwind theme, keyframes, component layer
  components/
    layout/            header, footer, locale switcher, terminal mark
    …                  hero, portrait card, QR panel, project rows, terminal
  i18n/                routing, navigation, request config
  lib/                 content data and the QR encoder
messages/              uk.json, en.json — identical key sets
public/                images, _headers, .well-known/security.txt
```

## Deploying

```bash
npm run deploy
```

Needs `wrangler` authenticated against the account holding the `portfolio` Worker. Secrets (`TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`) live in the Worker's own secret store, not in `wrangler.jsonc`; the one non-secret, `CONTACT_ALLOWED_HOSTNAME`, is in `vars` there.

Prerendered HTML is served with a long `s-maxage`, so a fresh deploy can take a minute or two to appear at the edge.

## License

MIT — see [LICENSE](LICENSE).
