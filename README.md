# Yushko Nazar — Developer Portfolio

Personal developer portfolio built with Next.js, deployed on Cloudflare.

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
