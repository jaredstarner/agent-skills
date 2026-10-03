# Launch checklist

Finish part 1 before DNS points at the site. In the source build DNS went first, so placeholders, broken downloads, internal pages, and the host's default 404 were public for about a day.

## Contents

1. Pre-launch (before DNS)
2. Head tags reference
3. Deploy and DNS cutover
4. Post-launch
5. Releases

## 1. Pre-launch (before DNS)

**Pages and content**
- [ ] No `[TBD]` left, or the owner has explicitly accepted the ones that remain.
- [ ] Downloads exist, open, and passed the document audit in `content-and-privacy.md`.
- [ ] Internal pages (styleguide, demos) are noindex and out of the main nav, or the owner chose to show them.
- [ ] Privacy screen done (`content-and-privacy.md` section 4).

**404**
- [ ] A custom 404 page exists. Without one, the host may serve its own generic page (GitHub Pages does). On GitHub Pages, a top-level `404.html` in the output is used for every missing path.
- [ ] The 404 page is noindex and has no canonical (its own path, `/404/`, is not a real URL).
- [ ] If the owner wants several 404 variants, build one page that picks a variant client-side; the host serves a single file.
- [ ] Link the 404 from the styleguide so it stays reviewable.

**Favicon set** (`scripts/favicon.mjs`)
- [ ] `favicon.svg`, `favicon.ico` (16, 32, 48), and a 180x180 `apple-touch-icon.png` with a full, opaque background.
- [ ] `<link rel="icon" href="/favicon.ico" sizes="32x32">` plus `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`; the `sizes` attribute lets browsers that support SVG prefer it.
- [ ] Reviewed at 16 px on light and dark tab bars. A dark tile behind the glyph reads on both.
- [ ] Expect browsers to cache favicons hard; test in a fresh profile.

**SEO**
- [ ] Every page has its own `<title>` and meta description. Offer 2 or 3 lettered drafts per page with character counts; descriptions were the item most often still missing at review time in the source build.
- [ ] Canonical URL on every indexable page, matching the chosen apex or www host.
- [ ] `robots.txt` allows crawling and points at the sitemap. Keep noindex pages crawlable so crawlers can read their noindex tag.
- [ ] `sitemap.xml` lists indexable pages only. A hand-written endpoint is fine for a small site; count its URLs against the pages that emit a canonical.
- [ ] Structured data only where it fits: `Person` on a personal home page, `Organization` or `LocalBusiness` for a business. Keep it minimal and true, and escape `<` in inline JSON-LD.
- [ ] `lang` on `<html>`.

**Social image** (`scripts/og-image.mjs`)
- [ ] One site-wide 1200x630 image unless the owner wants per-page images.
- [ ] No text that can go stale (dates, roles, "now open"). Legible at thumbnail size.
- [ ] Built from the site's own tokens and fonts.
- [ ] Explicit `og:*` and `twitter:*` tags (see section 2). Do not rely on a platform falling back from one set to the other; that behavior was never verified in the source build.
- [ ] Alt text for the image (`og:image:alt`, `twitter:image:alt`).

**Build audit**
- [ ] Grep the built output for every tag in section 2 on every page.
- [ ] Internal links resolve; external links return success.
- [ ] Full QA pass (`qa-checklist.md`, milestone section).

## 2. Head tags reference

```html
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page | Site</title>
<meta name="description" content="...">
<link rel="canonical" href="https://example.com/page/">          <!-- omit on noindex pages -->
<meta name="robots" content="noindex">                             <!-- noindex pages only -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Site">
<meta property="og:title" content="Page | Site">
<meta property="og:description" content="...">
<meta property="og:url" content="https://example.com/page/">      <!-- omit on noindex pages -->
<meta property="og:image" content="https://example.com/og.png">   <!-- absolute URL -->
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="...">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Page | Site">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="https://example.com/og.png">
<meta name="twitter:image:alt" content="...">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

## 3. Deploy and DNS cutover

Follow the host file (`hosts/github-pages.md` for Pages). General rules that held regardless of host:

- **Split the work:** the owner does browser steps (registrar, host settings); you do the repo and the verification.
- **Click-level registrar steps by default,** including details like the registrar auto-appending the domain to the host field.
- **Ask for a paste of the registrar's actual zone** before changing it. Resolver lookups miss records that registrars add by default (an HTTPS/SVCB record, type 65, broke the source cutover). Query type 65 and CAA up front.
- **Explain the preview story before DNS changes:** once a custom domain is set, the host's default URL may redirect to it.
- **When the owner reports an error, query the authoritative nameserver first** to see what is actually published; the change may not be saved yet.
- **Set expectations on caching:** host DNS checkers and resolvers can hold the old TTL for hours. Say so before asking the owner to "check again".
- **Stop browser testing mid-cutover.** Until the certificate is issued, browsers only show cache effects (HSTS errors, redirect loops between old and new hosts).
- **Do not state registrar or host behavior from memory** (propagation speed, header behavior, certificate timing). Check with `curl -I`, DNS queries, and the host's API, or say it is unverified.

## 4. Post-launch

- [ ] HTTPS enforced; apex and www both resolve, one redirecting to the other.
- [ ] Confirm the deploy for the exact commit succeeded before calling it live.
- [ ] "Now public and not ready" audit: placeholders, broken downloads, internal pages exposed, indexing of pages that should not be indexed.
- [ ] After any deploy that changes CSS, warn the owner that a hard refresh may be needed: cached HTML can point at a replaced, hashed stylesheet and render unstyled.
- [ ] Social previews checked by the owner with each platform's inspector (for example LinkedIn's Post Inspector, which also refreshes its cache), a Slack paste, and an X preview. These can only be checked after deploy.
- [ ] Search console verification and sitemap submission, if the owner wants it.

## 5. Releases

Ask what a release means before doing any of it: version bump, `CHANGELOG.md`, a git tag (signed?), a hosted release, an announcement. The source build chose everything except the announcement, kept releases manual, and updated the changelog only at releases.

Procedure that worked (signed, manual):

1. Draft the changelog section and show it to the owner; commit only approved text.
2. Bump the version in the package manifest.
3. Commit, push, and confirm the deploy.
4. `git tag -s vX.Y.Z -m "vX.Y.Z"`, then `git tag -v vX.Y.Z`, then push the tag.
5. Extract that version's changelog section and create the hosted release from the verified tag (for GitHub: `gh release create vX.Y.Z --verify-tag --notes-file <file>`).

Release bots (semantic-release, release-please) were considered and declined in the source build because they tag unsigned; revisit only if the owner wants automation.
