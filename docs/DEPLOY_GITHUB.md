# GitHub Pages (GitHub Actions)

This project builds with Vite; the static output in `dist/` is deployed with [`.github/workflows/pages.yml`](../.github/workflows/pages.yml).

## One-time setup

1. Push the repo to GitHub (default branch `main` or `master` — the workflow runs on both).
2. **Settings** → **Pages** → under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).
3. Run the **Deploy to GitHub Pages** workflow (it runs automatically on push to the default branch, or use **Actions** → **Run workflow**).

## URLs

- **Project site** (`<user>.github.io/<repo>/`): the workflow sets `GITHUB_BASE=/<repo>/` so assets resolve correctly.
- **User/organization site** (repo named `<user>.github.io`): the workflow sets `GITHUB_BASE=/`.

Local `npm run dev` / `npm run build` with no `GITHUB_BASE` still uses a relative `base` suitable for `vite preview` and ad-hoc static hosting.

## Checklist

- [ ] `package-lock.json` is committed so `npm ci` works in CI.
- [ ] First successful run may require approving **Pages** deployment the first time (environment protection).
