# TS Games

A collection of small browser games built with React, TypeScript and Vite.

Live site: https://omio-ma.github.io/ts-game/

## Development

```sh
npm install
npm run dev      # local dev server
npm run build    # type-check and build to dist/
npm run lint
```

## Deployment

Every push to `main` builds the site and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`. Pages must be set to **Source: GitHub Actions**
in the repository settings.

## Install as an app (offline)

The site is a Progressive Web App. On Android, open the live site in Chrome
and tap **⋮ → Install app** (or **Add to Home screen**). It then opens
full-screen from its own icon and works without an internet connection.
Updates download automatically the next time it's opened online.
