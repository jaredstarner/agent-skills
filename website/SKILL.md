---
name: website
description: >-
  Plan, design, build, and launch a website end to end: discovery, visual direction, stack and hosting choice, design tokens, pages and content, rendered QA, SEO and social cards, deploy, DNS cutover, and releases. Use this whenever the user wants to build or rebuild a website or landing page (a personal site, a small business or LLC site, a creator or hobby site such as a bookstagram, a product or business-idea landing page, or a site for someone else), wants help choosing between a code-based static site and a hosted builder, or is mid-build and needs the launch, SEO, favicon, social image, or domain steps, even if they never say "skill" or name a framework.
---

# Website

A phased workflow for building small websites that their owner can trust: content that is true, a look the owner actually chose, and a launch that does not surprise anyone. The default is a code-based static site (Astro on GitHub Pages is the proven path), but phase 1 checks whether the request really fits that before anything is built.

This skill was distilled from a full build of a personal site over 8 sessions. Most of the corrections in that build came from the owner looking at rendered pages, from copy that claimed more than the source supported, and from launch steps done out of order. The phases below are ordered to prevent those.

## How to use this skill

Work in phases. Each phase ends at a gate: show the owner the output, get an explicit yes, then move on. Phases can be short for a small site, but do not skip a gate, because the cheapest time to change a decision is before the next phase builds on it.

Read the reference file named in each phase when you reach it, not all up front.

| Phase | Read |
|---|---|
| 1. Discovery | `references/discovery-questions.md`, `references/stack-choice.md` |
| 2. Visual direction | `references/style-discovery.md` |
| 3. Stack and scaffold | `references/stack-choice.md`, plus `references/stacks/astro.md` and `references/hosts/github-pages.md` if chosen |
| 4. Design system | `references/style-discovery.md` (tokens section) |
| 5. Pages and content | `references/content-and-privacy.md` |
| 6. QA | `references/qa-checklist.md` |
| 7. Launch | `references/launch-checklist.md`, plus the host file |
| 8. Release | `references/launch-checklist.md` (releases section) |
| Any multi-session build | `references/continuity.md` |
| Before calling anything done | `references/pitfalls.md` |

## Phase 0: Preflight

Before asking setup questions, check the toolchain and accounts so the questions are informed: node, package manager, git, gh (and `gh auth status`), the global git identity and signing setup, Chrome (for the scripts), and the target directory. If the machine was used for an employer or another person, confirm which identity commits should carry before the first commit; changing it later means rewriting history.

## Phase 1: Discovery

Goal: a short written brief the owner approves. Use the question bank in `references/discovery-questions.md`; ask in numbered groups the owner can answer inline, each with a recommended default.

The brief covers: purpose and audience, page list, content sources (and who supplies them), who updates the site after launch and how often, domain and registrar status, forms and other dynamic needs, analytics and the third-party request policy, privacy limits, what "live" and "1.0" mean, and any prior notes, chats, or reference sites. Ask for those references explicitly; a prior chat that never gets shared is lost direction.

Then run the fit check in `references/stack-choice.md`. It decides between a static site (default), static plus a few hosted services (forms, email signup, analytics), or a hosted builder. Hosting is part of it: GitHub Pages terms rule out sites primarily for commercial transactions, so a business site that sells may need a different host. Present the result as a recommendation with the reason, and let the owner decide.

**Gate:** the owner approves the brief and the fit-check result.

## Phase 2: Visual direction

Goal: an approved look, decided from rendered previews, before tokens exist in the repo.

- Collect references (sites, images, games, brands) and mine the ones already supplied before asking for more.
- For every constraint ("no animation", "minimal", "retro"), ask what it guards against. The owner's literal rule and the intent behind it often differ.
- Build throwaway previews in a scratch folder: palette swatches with contrast ratios, a font comparison with real headings, a landing-page mock. Show 2 to 4 discrete, named options; do not assume your recommendation wins.
- Novelty or display fonts must be seen rendered at real size before they are adopted.

**Gate:** the owner picks a palette, type pairing, and overall direction from rendered previews.

## Phase 3: Stack and scaffold

Goal: a repo that builds, with the decisions and agent docs in place from the first commit.

- Scaffold the chosen stack. Pin versions that the build depends on, and look up current versions of actions and packages with a tool rather than from memory.
- Rewrite any template-generated `AGENTS.md` / `CLAUDE.md` immediately with real project context, so later sessions load it automatically.
- Create `docs/decisions.md` and log every intentional choice and exception as it is made, so later work does not "fix" it.
- Add `.gitattributes` (`* text=auto eol=lf`) before the first push on Windows.
- Gate deploys on a type or lint check if the build itself does not check.

**Gate:** clean build, repo created, the owner has seen the structure.

## Phase 4: Design system

Goal: tokens and components that make the approved look cheap to apply everywhere.

- Layer tokens: raw palette, semantic roles per mode (bg, surface, text, muted, border, accent, focus), and scale (space, type, radius). Components reference roles, never raw palette values.
- Run `scripts/contrast.mjs` over every text and border pairing in every mode (including card surfaces and colored bands), and fix failures before building pages.
- Build a noindex `/styleguide` page that demos every token and component, and links every page that is not in the nav (404, drafts, demos) so they stay reviewable.
- If there is a dark mode, apply the saved theme in an inline head script before first paint.

**Gate:** rendered review of the styleguide in every mode at desktop and phone widths (`scripts/screenshot.mjs`).

## Phase 5: Pages and content

Goal: pages whose every claim the owner can stand behind.

Read `references/content-and-privacy.md` first. The core rules:

- Never invent facts, figures, dates, or quotes. Put `[TBD]` where a fact is missing, and report drafts in three groups: from the source, my guesses (please confirm), still TBD.
- Collect content with numbered intake questions per page or section.
- Ask the owner's voice rules early (first person or not, bullet punctuation, tone), and apply dictated wording verbatim.
- Keep structured content as data (collections, JSON) so pages stay consistent.
- Screen everything for privacy before it ships: photo EXIF/GPS (`scripts/photo-intake.mjs`), document metadata, home-location hints, family details, and HTML comments that ship in the built output.

**Gate:** the owner reviews the pages one at a time, rendered, and approves each.

## Phase 6: QA

Run `references/qa-checklist.md` after every visual batch, not only at the end. The single most important lesson from the source build: builds and greps do not catch visual bugs. Take screenshots at desktop and phone widths in each mode, read them back, and make sure the check could actually show the bug you are looking for. End every report with an explicit "not checked" list (real devices, Safari/Firefox, touch, real-speed animation).

## Phase 7: Launch

Finish the pre-launch half of `references/launch-checklist.md` **before** DNS points at the site: custom 404, favicon set, per-page meta descriptions, social image, sitemap, robots, canonical rules, and a placeholder audit. In the source build, DNS went live first, and placeholders and the host's default 404 were public for a day.

Then deploy, cut DNS over with the host file's procedure, wait for HTTPS, and run the post-launch audit. Social cards can only be validated after deploy, by the owner, with each platform's inspector.

**Gate:** live, HTTPS enforced, post-launch audit clean, owner has checked the social previews.

## Phase 8: Release

Ask what a release means for this site (version bump, changelog, git tag, hosted release, announcement) before doing any of it. Draft the changelog for approval before committing it.

## Scripts

All scripts are Node (22+), dependency-free unless noted, and locate Chrome automatically (override with the `CHROME` env var). Run any script with `--help` for usage.

| Script | Use |
|---|---|
| `scripts/screenshot.mjs` | Headless screenshots across widths and color schemes via the Chrome DevTools Protocol; true phone widths, full-page, optional injected script |
| `scripts/contrast.mjs` | WCAG contrast check over token pairs, resolving CSS custom properties per mode |
| `scripts/og-image.mjs` | 1200x630 social image rendered from an HTML template with the site's own fonts and colors |
| `scripts/favicon.mjs` | favicon.svg, favicon.ico (16/32/48), and apple-touch-icon.png from a pixel grid, an SVG, or a PNG logo |
| `scripts/photo-intake.mjs` | Resize or crop photos and strip EXIF/GPS/XMP before they enter the repo (needs `sharp`) |
