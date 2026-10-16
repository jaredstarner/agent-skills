---
type: Reference
title: Open Knowledge Format (OKF) v0.2
description: Vendor-neutral spec for knowledge as markdown files with YAML frontmatter; the format this bundle follows.
resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
tags: [okf, spec, format]
generated: { by: {{actor}}, at: {{now}} }
stale_after: {{now_plus_90d}}
sources:
  - id: okf-spec
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
    title: OKF v0.2 specification
    author: team:GoogleCloudPlatform
---

# Summary

A bundle is a directory of markdown concepts with YAML frontmatter. Only `type` is required.[^okf-spec] `stale_after` here is a reminder to check for a newer spec version.

# Rules this bundle relies on

| Area | Rule |
|------|------|
| Required | `type` on every non-reserved `.md` file; free-form values, not registered centrally |
| Recommended | `title`, `description` (one sentence, feeds `index.md`), `resource` (URI of the thing described), `tags` |
| Extensions | Any extra keys allowed; consumers must preserve and tolerate them |
| Reserved files | `index.md` (listing, no frontmatter except `okf_version` at root) and `log.md` (newest-first, `## YYYY-MM-DD` headings) |
| Provenance | `sources:` list; each entry needs `resource`, optional `id`, `title`, `author`, `usage_count`, `last_modified`. Cite claims with footnotes keyed by `id` |
| Trust | `generated: { by, at }` = who wrote the current content; `verified: [{ by, at }]` = who confirmed it |
| Trust tiers | No `verified` = unverified; non-human verifiers only = machine-confirmed; any `human:` verifier = human-reviewed |
| Actors | `<producer>/<version>` for agents, `human:<id>` for people, `process:<id>` for automation |
| Lifecycle | `status: draft \| stable \| deprecated` (absent = stable); `stale_after` = absolute UTC instant |
| Links | Markdown links; bundle-relative (`/projects/x.md`) recommended; broken links tolerated |
| Timestamps | ISO 8601 with explicit offset, e.g. `2026-10-04T16:45:00Z` |

[^okf-spec]: OKF v0.2 specification
