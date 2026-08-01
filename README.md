# tandemcommander-web

Website for **Tandem Commander** — an open source two-pane file manager.

Currently a single "coming soon" page, built from the project's design manual and hosted on
[Cloudflare Workers](https://developers.cloudflare.com/workers/static-assets/) as a static site.

Project repository: <https://github.com/tandemcommander/tandemcommander>

## Structure

```
public/                        # everything in here is served as-is
  index.html                   # coming soon page
  404.html                     # not found page
  favicon.svg                  # brand icon (vector)
  favicon-32.png
  apple-touch-icon.png         # 180x180
  robots.txt
  sitemap.xml
  _headers                     # security and cache headers
  assets/
    icon-256.png
    icon-512.png
    og-image.png               # 1200x630 social preview
  fonts/                       # Archivo, self-hosted (SIL OFL)
wrangler.jsonc                 # Cloudflare Worker configuration
package.json
```

There is no build step. What is in `public/` is what gets served.

## Local development

```bash
npm install
npm run dev          # http://localhost:8787
```

`wrangler dev` runs the real Cloudflare runtime locally, so what works here works in production.

Validate the configuration without deploying:

```bash
npm run check
```

## Deployment

Pushing to `main` triggers an automatic deploy through Cloudflare Workers Builds.

Manual deploy from your machine:

```bash
npm run deploy
```

The Cloudflare Worker is named **`tandemcommander-web`**. This name must stay in sync between
`wrangler.jsonc` and the Cloudflare dashboard — a mismatch is the most common cause of a failed build.

## Domain

The site is served from **<https://tandemcommander.org>**, attached to the Worker as a Custom Domain
in the Cloudflare dashboard (Worker → Settings → Domains & Routes). Cloudflare manages the DNS
record and the TLS certificate — do not add a DNS record for the apex by hand.

The domain appears in these files; keep them in sync if it ever changes:

- `public/index.html` — `<link rel="canonical">`, `og:url`, `og:image`
- `public/robots.txt` — the `Sitemap:` line
- `public/sitemap.xml` — the `<loc>` element

`www.tandemcommander.org` should redirect to the apex with a 301 (Cloudflare → Rules → Redirect Rules)
so search engines do not index the site twice.

## Brand

Colours, typography and logo usage follow the Tandem Commander design manual:

- Background `#0A1424`, text `#EAF2FB`, muted `#8FA6C4`
- Brand orange `#F97316` (highlight `#FFB35C`, deep `#EA6A0B`)
- Typeface: Archivo — 800 for the wordmark, 600 for body text

The logo lockup is inlined in `index.html` unmodified, so the self-hosted Archivo webfont renders
the wordmark exactly as specified. Do not recolour the gradients or rebuild the composition.

## Licence

Site code: MIT. Brand assets (logo, icon, wordmark) are not covered — they belong to the
Tandem Commander project. Archivo is licensed under the SIL Open Font License; see
`public/fonts/`.
