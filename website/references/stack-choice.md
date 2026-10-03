# Stack choice and fit check

The default is a code-based static site in a git repo the owner controls. This file decides whether that default fits, and if so which pieces to add. Present the outcome as a recommendation with reasons; the owner decides.

## Contents

1. Fit check
2. Static site defaults
3. Static plus services (forms, signups, analytics, payments)
4. When to recommend a hosted builder
5. Hosting choice

## 1. Fit check

Run it after discovery groups A to D. Score each row; any "red" answer means discuss a hosted builder or a different host before building.

| Question | Static fits (green) | Needs services (amber) | Points elsewhere (red) |
|---|---|---|---|
| Who edits after launch? | The owner via Claude/git, or rarely | A non-technical person, occasionally | A non-technical person, often, from a phone |
| Dynamic needs | None | Contact form, email signup, analytics, simple embeds | Store with inventory, bookings, accounts, member content |
| Commercial use | Informational, portfolio, brochure | Links out to a shop or booking service | The site itself takes payments or runs the business |
| Content volume and cadence | Pages change monthly or less | A blog or feed updated weekly by the owner | Daily posting by someone who will not touch git |
| Budget and ownership | Owner wants full control and near-zero hosting cost | Small monthly service fees are fine | Owner wants one vendor to handle everything |

How to read it:

- **All green:** static site, default stack.
- **Any amber, no red:** static plus the specific services in section 3.
- **Any red:** say so plainly and offer the choice: a hosted builder (section 4), a static site with a headless CMS (owner-edited content in a web UI, site rebuilt on publish), or a static site that links out to a hosted shop or booking tool. Do not build until the owner picks.

Name the tradeoff, not just the verdict. Example: "A weekly bookstagram feed edited from a phone is a red on cadence. Options: (a) a hosted builder she edits directly, (b) static site plus a CMS she edits in a browser, (c) static site that embeds or links the Instagram feed and changes rarely. I'd pick (c) if the site's job is to point people at the Instagram account."

## 2. Static site defaults

- **Generator:** Astro (static output, TypeScript, no UI framework) is the proven path; see `stacks/astro.md`. Another static generator is fine if the owner prefers one; the phases do not change.
- **Content as data:** collections or JSON with a schema, so pages render consistently and agents edit data instead of markup.
- **Dependencies:** keep runtime dependencies near zero. CSS, native elements (`details`, `dialog`), Web Audio, and canvas cover most effects without libraries.
- **Fonts:** self-host them (no third-party request, no layout shift from a slow CDN). Check the license (OFL or similar) before adopting.
- **Images:** run every photo through `scripts/photo-intake.mjs` before it enters the repo.

## 3. Static plus services

Add only what discovery asked for. Each service is a third-party request, an account someone must own, and a thing that can change terms or shut down, so record each in `docs/decisions.md` with who owns the account.

| Need | Options to evaluate | Notes |
|---|---|---|
| Contact form | A form-backend service, the host's built-in forms if it has them, or a plain `mailto:` link | `mailto:` needs no service and no spam handling; forms need spam protection. Verify free-tier limits at decision time. |
| Email or waitlist signup | An email newsletter service's embedded form or hosted signup page | Linking to a hosted signup page avoids an embed. Confirm double opt-in and where the list is exported. |
| Analytics | None; a cookieless, privacy-friendly service; self-hosted; or full tracking | Cookieless options usually avoid a consent banner; full tracking usually needs one. If the owner has a "no third-party requests" rule, only self-hosted analytics (which means running a service) or no analytics keeps it. |
| Payments or shop | Link out to a hosted checkout or shop | Keeps the static site informational, which also matters for hosting terms (section 5). |
| Bookings | Link out to a hosted scheduler | Same reasoning as payments. |
| Social feed | A link plus a few curated, self-hosted images | Live feed embeds break with platform API changes and add tracking. |
| Search | A build-time static index | Only worth it past a few dozen pages. |

Do not state a service's pricing, limits, or features from memory. Look them up when the owner is choosing, and cite where the figure came from.

## 4. When to recommend a hosted builder

Recommend one when the fit check has a red that the owner does not want to work around, typically: a non-technical person posting often from a phone, or the site itself running a store. Be honest about the tradeoffs: less control over markup, performance, and portability, monthly cost, and lock-in. In return, the owner edits directly and the vendor handles hosting, forms, and commerce.

If the owner picks a hosted builder, this skill's discovery, style-discovery, content, privacy, QA, and launch (domain, SEO, social image, favicon) guidance still applies; skip the scaffold and repo phases.

## 5. Hosting choice

- **GitHub Pages:** proven path, free, Actions-based deploys; see `hosts/github-pages.md`. GitHub's published limits say Pages is not intended as "a free web-hosting service to run your online business, e-commerce site, or any other website that is primarily directed at either facilitating commercial transactions or providing commercial software as a service (SaaS)" (docs.github.com, "GitHub Pages limits", checked 2026-10-02). An informational site for an LLC or a link-out landing page is a judgment call; a site that takes payments is not a fit. Recheck the current wording before deciding, and say which way you read it.
- Published limits on the same page: 1 GB site size, a soft 100 GB/month bandwidth limit, a 10-minute deploy timeout.
- **Other static hosts:** if the site is commercial or needs host-level forms, evaluate other static hosts. Read their current terms and free-tier limits at decision time instead of relying on memory, and record the choice in `docs/decisions.md`.
- Ownership transfer and handover to a third party are out of scope for this skill.
