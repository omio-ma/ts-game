# TS Games

React + TypeScript + Vite static site, deployed to GitHub Pages from `main`
(`.github/workflows/deploy.yml`). The repo is public and everything in the
built bundle is public.

## Rules: no sensitive information

- Never commit secrets: API keys, tokens, passwords, private keys, `.env`
  files, credentials files, or personal data (emails, phone numbers,
  addresses) beyond what is already public in the repo.
- This is a static site with no backend: anything the app uses ends up in the
  browser bundle, so there is no safe place for a secret. Don't add features
  that need one; ask the user instead.
- Vite exposes any `VITE_*` env var to the bundle — never put secrets in them.
- Before every commit, `scripts/check-secrets.sh` runs automatically via the
  Claude Code hook in `.claude/settings.json`. If it blocks a commit, remove
  the finding — never bypass or weaken the check.
- CI runs gitleaks on every push and PR (`.github/workflows/secret-scan.yml`).

## Commands

- `npm run dev` / `npm run build` / `npm run lint`
- `npm run check:secrets` — scan pending changes for secrets
