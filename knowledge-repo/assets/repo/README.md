---
type: Readme
title: {{repo_name}}
description: Personal knowledge bundle in Open Knowledge Format (OKF) v0.2, shared by agent sessions across projects.
tags: [okf, knowledge-base]
generated: { by: {{actor}}, at: {{now}} }
---

# {{repo_name}}

Coordination knowledge, not project files. Each concept describes one thing (a project, an approach, a preference, a reference), says where it lives via `resource:`, and records where the knowledge came from via `sources:`. Project artifacts stay in their own repos and folders.

The repo root is the bundle root. Format: [OKF v0.2](/references/open-knowledge-format.md).

# Start here

* [index.md](index.md) - top-level listing; read one level at a time
* [log.md](log.md) - newest-first history of changes
* [projects/knowledge.md](/projects/knowledge.md) - conventions and the filing procedure

# Tools

* `tools/okf_check.py` - conformance check; `--fix` rebuilds every `index.md`
* `tools/knowledge.json` - settings for the checker, hooks, and upkeep runs
