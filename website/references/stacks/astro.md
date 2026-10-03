# Astro notes

Verified during a build on Astro 7.3, pnpm 12.8, TypeScript 6, Node 24 (2026-09 to 2026-10). Versions move; re-check anything version-specific with the installed packages before relying on it.

## Scaffold

- `pnpm create astro@latest` with the minimal template, TypeScript strict, no UI framework, static output. Set `site` in `astro.config` to the canonical URL (apex or www, matching the DNS decision).
- The minimal template creates `AGENTS.md`, a `CLAUDE.md` symlink to it, and `.vscode/`. `find -type f` misses the symlink. The template `AGENTS.md` carries no project context; rewrite it early so new sessions load real context automatically.
- pnpm 12 blocks dependency build scripts until approved: run `pnpm approve-builds esbuild` (and later `sharp`). The template's `allowScripts` field is npm-only.
- `pnpm add -D typescript` can pull a TypeScript major outside `@astrojs/check`'s peer range. Pin the major the checker supports and run `pnpm peers check`.
- `pnpm build` does not type-check. Add `astro check` as `pnpm check` and gate deploys on `pnpm check && pnpm build`.
- In non-interactive shells set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` before pnpm calls. `corepack enable` fails with EPERM when Node is under Program Files on Windows; use an elevated shell or `--install-directory`.

## Fonts and images

- Astro 7 has a built-in fonts API (`fontProviders.local()`, `<Font cssVariable=... preload>`). Source woff2 files from Fontsource and license texts from the font's upstream repo. Declare decorative fonts without preload so they only download when used.
- `astro:assets` `<Image>` under pnpm needs `sharp` as a direct dependency (strict isolation).
- `astro:assets` hashes image filenames, so do not reference processed images by a stable URL (for example in JSON-LD); put stable files in `public/`.

## Content

- Content collections use Zod 4 and the glob loader in Astro 7. Check the installed Zod version before writing schemas.
- Single-quoted YAML frontmatter escapes an apostrophe by doubling it (`''`).

## Gotchas

- **`compressHTML` drops whitespace** where a line ends in text and the next line starts with an inline tag, gluing words together. Use `{' '}` at the line end, and grep `dist/` for the joined words. This hit twice in the source build even after it was documented.
- TypeScript narrows `window` to `never` after `'requestIdleCallback' in window`; use `typeof window.requestIdleCallback === 'function'` (Safari lacks it).
- View Transitions fall back to an instant switch in browsers without support.

## Pages and routes

- `src/pages/404.astro` builds to `dist/404.html`.
- A hand-written `src/pages/sitemap.xml.ts` endpoint is enough for a small site and avoids depending on integration support for a new Astro major. List static routes explicitly and add collection routes from the collection.
- Preview the build with `pnpm preview --port <port>`. Stopping a background preview task can leave the `node ... astro preview` process holding the port; find it by port, confirm its command line, then stop that PID.

## Deploy (GitHub Pages)

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@vN          # look up current majors with gh api, not memory
      - uses: withastro/action@vN
        with:
          build-cmd: pnpm check && pnpm build
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@vN
```

Look up the current major of each action (`gh api repos/<owner>/<repo>/releases/latest --jq .tag_name`) when writing the workflow.
