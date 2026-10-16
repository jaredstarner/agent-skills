---
type: Project
title: {{repo_name}}
description: This bundle; conventions, frontmatter rules, and the filing procedure for keeping it current.
resource: {{repo_url}}
local_path: {{repo_path}}
tags: [okf, knowledge-base, conventions]
status: stable
generated: { by: {{actor}}, at: {{now}} }
stale_after: {{now_plus_90d}}
sources:
  - id: setup
    resource: "Setup session, {{date}} (knowledge-repo skill)"
    title: Setup decisions agreed with {{owner_name}}
    author: human:{{owner_id}}
---

# Purpose

Coordination knowledge for agent sessions, in [OKF v0.2](/references/open-knowledge-format.md). Concepts describe things and point to them; they don't hold them.[^setup]

| Belongs here | Does not |
|--------------|----------|
| Projects: what, where, rules, decisions, open items | Project artifacts: docs, binaries, images, code |
| Work approaches, with employer and customer names removed | Secrets, tokens, config files |
| Distilled research findings | Active change notes or work in progress |
| References to external specs | Copies of docs that already live in a repo (point to them) |
| Preferences and profile (via `memory/`) | Live state: versions, release lists, issue and PR lists, next steps |
| Where to read live state (a "Live state" table of commands or paths) | |

{{privacy_rules}}

# Layout

| Path | Holds | Type |
|------|-------|------|
{{layout_rows}}

Directories are created when their first concept lands. Their one-line descriptions live in `tools/knowledge.json` under `areas`.

# Frontmatter

```yaml
---
type: Project                      # required
title: Display name
description: One sentence; feeds index.md.
resource: https://...              # canonical URI of the thing described
local_path: /path/on/this/machine  # extension key: local location, when there is one
tags: [a, b]
status: stable                     # draft | stable | deprecated
generated: { by: <actor>, at: <UTC now> }
verified: { by: human:{{owner_id}}, at: <UTC> }   # only when {{owner_name}} explicitly approves the content
stale_after: <UTC>
sources:
  - id: short-key                  # cite claims with [^short-key] footnotes
    resource: URL, bundle path, or scope descriptor
    title: Label
    author: actor
    last_modified: <UTC>
---
```

- **Actors**: `<agent>/<model-id>` for an agent session (for example `claude-code/<model-id>`); `knowledge-upkeep/<model-id>` for content merged by an upkeep run; `<agent>/unknown` where the model wasn't recorded; `human:{{owner_id}}` for {{owner_name}}
- **Trust**: `verified` is added only when {{owner_name}} explicitly approves the content; re-confirming bumps its `at`
- **Freshness defaults**: projects 30 days, references 90 days. Volatile facts aren't copied in, so concepts only age as rules and decisions change. Past `stale_after`, re-check the `resource` before trusting, then update and bump
- **Handoffs vs concepts**: a project's handoff notes hold in-flight work and next steps; the concept holds what stays true across sessions. When a session settles a decision, rule, or gotcha, it moves into the concept. If notes and git disagree, git wins
- **Organize by purpose, not by event**: fold a narrow fact into the concept it belongs to instead of giving it its own file
- **Secrets**: never file tokens, keys, or credentials; `okf_check.py` fails on common token patterns
- **Lifecycle**: `draft` while incomplete; `deprecated` when superseded (keep the file for links)

# Memory

{{memory_section}}

# Filing procedure

1. Find the home: read `index.md` down the tree; update an existing concept before creating a new one. Re-read a concept right before editing it: other sessions may change it mid-session
2. Write the concept with the frontmatter above; bump `generated.at`; record where the knowledge came from in `sources`
3. Add an entry to the root `log.md` under today's date (newest first)
4. {{commit_step}}

{{commit_approval}}

# Reading procedure

When a task touches a project, approach, or topic: read the root `index.md`, open only the relevant concept, check `stale_after`, and verify against `resource` if stale.

# Upkeep

{{upkeep_section}}

[^setup]: Setup decisions agreed with {{owner_name}}
