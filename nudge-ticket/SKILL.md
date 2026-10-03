---
name: nudge-ticket
description: >-
  Turns a stalled or unowned ticket into an actionable comment that gives engineers a concrete push to execute: pulls the full ticket and its linked context (parent epic, sibling/reference tickets, wiki notes), finds the closest already-completed analog implementation in the code host, cross-references the ticket's specific case against that analog to work out what is actually different, simpler, or harder, then drafts a comment with an approach, a step list, and ready-to-adapt starter code. Defaults to Jira and GitHub; works with another tracker or code host when the user names one. Always drafts first and waits for explicit approval before posting. Use when the user shares a ticket link or key and asks to "nudge" it, "give it a push", "add context to get this moving", "post an approach comment", or "unblock this ticket", or says something like "repeat this process for another ticket" after a prior nudge-ticket run.
---

# Nudge Ticket

Give a stalled or unowned ticket a concrete, evidence-based push: a comment that lays out *why*
the work is more tractable than it looks, a step-by-step approach, and starter code the assignee
can paste in and adapt. This is not a generic "please pick this up" comment. It only has value if
it's backed by real cross-referencing of the ticket's linked context and an actual completed
analog elsewhere in the org.

Input: a ticket key or URL. If not provided, ask for one.

## Requirements

- **Ticket tracker** with read/write access: Jira by default (Atlassian MCP connector, which also
  covers Confluence reads). Any other tracker needs its own MCP connector or CLI.
- **bash** with the `gh` CLI for code access: GitHub by default. Use the equivalent CLI for another
  code host (e.g. `glab` for GitLab).

Prefer the `gh` CLI over a GitHub MCP connector for repo and file reads; it is more reliable for
bulk file and PR access. If the tracker or code host the ticket needs has no available tool, stop
and tell the user. Do not substitute a different source or skip the step.

### Using a tracker or code host other than Jira / GitHub
This skill is written in Jira and GitHub vocabulary. If the user names a different tracker or code
host, map the concepts used below (issue links such as "relates to" / "clones" / "blocks", parent
epic, comments, PRs, CI status) to that system, name the tool you'll use for it, and confirm with
the user before Phase 1. Ask rather than guess when a concept has no clear equivalent.

---

## Phase 1: Understand the target ticket

1. Resolve the Jira `cloudId`: try the site hostname directly (e.g. `yourcompany.atlassian.net`)
   before calling `getAccessibleAtlassianResources`.
2. `getJiraIssue(issueIdOrKey, fields: ["*all"], responseContentFormat: "markdown")`: get the full
   description, comments, status, priority, and `issuelinks`.
3. Read the description closely for:
   - Background/why this ticket exists
   - Any linked repo or file URLs (these are almost always the actual subject of the work)
   - Any linked wiki pages (working sessions, decisions, scoping notes)
4. Read the comments for:
   - Why it's stalled (on hold, blocked, needs ownership, carried over sprints)
   - Any PR links already dropped by someone who worked it partially
5. Scan `issuelinks` for:
   - Parent epic
   - "relates to" / "clones" / "is cloned by" siblings: these are usually the SAME pattern applied
     to a different service/repo. Look specifically for ones marked **Done**.
   - "blocks" / "is blocked by": these tell you what infra/prerequisite work is or isn't finished.

## Phase 2: Map the reference implementation

The goal is to find a **sibling ticket that already did this exact kind of work**, not just a
ticket that mentions the same epic.

1. Open the parent epic and any "pattern" ticket (often the first ticket in the series, referenced
   by "relates to" links, holding the general acceptance criteria).
2. Among Done siblings, find the closest analog to the target ticket's specifics (same
   language/framework, same deployment style; e.g. an in-house Helm chart is a better analog for
   another in-house chart than a third-party values-only chart is).
3. Fetch that analog ticket in full too. Comments often contain the merged PR link and sometimes
   a written comparison doc. That doc is gold when it exists: look for anything like an
   "X-VS-Y-COMPARISON.md" or migration writeup linked in a comment.
4. Fetch any linked wiki working-session notes for scoping context and decisions that don't show
   up in ticket text (e.g. "the legacy auth proxy is a separate workstream, out of scope here").

## Phase 3: Pull the actual code

```bash
gh api repos/<owner>/<repo>/contents/<path> --jq '.content' | base64 -d
gh api repos/<owner>/<repo>/contents/<dir> --jq '.[].name'   # list a directory
gh pr view <number> --repo <owner>/<repo> --json title,body,files,url
```

Fetch, in this order:
1. The current state of whatever the target ticket needs to change (e.g. the existing
   template/config file).
2. The equivalent file(s) in the reference analog **before and after** its change, plus any
   written comparison doc.
3. Any values/config files needed to know environment-specific details for the target service
   (flags, hostnames, which environments it actually runs in: dev/prod, cloud provider, etc.).
   These specifics are what let you say something concrete like "this case is simpler because
   flag X is always true here" instead of generic advice.
4. Any merged reference PR cited in ticket comments, for the broader infra piece the target ticket
   depends on.

**Branch check: the work may already exist.** Before assuming net-new implementation, search the
pattern ticket's and target ticket's comments (and the target repo's open PRs if in doubt:
`gh pr list --repo <owner>/<repo> --search "<keyword>"`) for a PR that already implements this.
A struck-through item in a pattern ticket's description is a strong signal someone already did it.
If an open PR exists, pull its diff, review state, and CI status
(`gh pr view <n> --repo <owner>/<repo> --json reviews,statusCheckRollup,state,files` and
`gh pr diff <n>`). This changes the comment's shape entirely: see Phase 5.

## Phase 4: Cross-reference and find the actual delta

This is the analytical step that makes the comment worth posting. Don't skip to drafting without
it. Diff the target ticket's specifics against the reference analog and identify:

- What's **identical** and can be copied near-verbatim
- What's **simpler** here (e.g. fewer hostnames, a flag that eliminates a whole code branch,
  no need for a capability the reference case required)
- What's **harder or different** here (call this out honestly; don't oversell)
- What's **already solved globally** by prior infra work (so the target ticket doesn't need to
  re-solve it)
- What's **explicitly out of scope** (naming conventions like "(non-X)" in ticket titles usually
  signal a companion ticket/effort handles the excluded piece; don't touch it)

## Phase 5: Draft the comment

Save the draft to a scratch `.md` file and show the **full rendered text** in chat before
touching the tracker. Never post without explicit user approval. This is a hard rule, not a
suggestion.

**Two comment shapes, depending on the Phase 3 branch check:**
- **Net-new work** (no existing PR): the default structure below, with a "Starter code" section.
- **Existing PR found**: drop starter code (don't rewrite what exists); the comment becomes a
  state assessment + remaining runway instead. Lead with the PR's status (approved? checks green?
  merged or just sitting?), then a "Current state vs the PR" section comparing the PR against the
  live config, then the remaining steps to actually land it (merge, staged enable, validate,
  cutover, cleanup). Diff the PR against live config carefully; this is where real gaps worth
  flagging show up (e.g. a route that is auth-protected today but unprotected in the PR, hostname
  strategy, behavior deltas the PR introduces vs preserves). Frame genuine gaps as scope decisions
  with options, not as criticism of the PR author.

**Structure** (adjust headers to fit the domain, but keep this shape):
- Open directly with the context/why. No redundant title header restating "implementation
  approach" or similar; the ticket title already says what this is.
- Bullet what prerequisite work is already done, each with a link and the ticket that tracked it.
- A short subhead naming the comparison to the reference case, phrased with appropriate hedging
  (e.g. "X's case seems fairly straightforward compared to Y's", not an overconfident claim you
  haven't fully verified).
- Bulleted comparison findings from Phase 4.
- A one-line "Net:" summary of what the delta boils down to.
- Numbered "Proposed steps."
- "Starter code", adapted to the target's actual values/shape, not a generic template. Keep new
  code close to the existing repo's conventions (e.g. if the current implementation uses a
  `host/paths` shape, don't introduce a different `rules/matches` shape just because the reference
  analog used one). Call out any non-obvious type/field mapping gotchas explicitly (e.g. "Ingress
  `pathType: Prefix` maps to Gateway API `PathPrefix`, not `Prefix`").
- "References" as a flat bullet list linking back to source tickets by key with a one-line note
  each. No summary table; the tracker already displays linked and child issues natively.

**Style rules (defaults; confirm with the user if a request implies changing them):**
- No em-dashes. Use commas, semicolons, or hyphens instead.
- No ownership/status/blocker commentary in the comment unless the user explicitly asks for it.
  Stick to technical content that helps someone execute.
- Don't restate what's already obvious from the ticket title or the tracker's own UI.

**Before finalizing, ask the user if scope is ambiguous:** e.g. whether to comment on the
hold/ownership status, whether to suggest an assignee, or which of several possible approaches to
lead with. Don't assume.

## Phase 6: Review and iterate

Treat the first draft as a starting point. When the user requests edits (wording, tone, structural
changes), apply them directly to the scratch file and re-render the full comment for a second
look. Don't post on the first pass even if the user seems satisfied, unless they explicitly say
to post.

## Phase 7: Post

Only after explicit approval:

```
addCommentToJiraIssue(cloudId, issueIdOrKey, commentBody: <markdown>, contentFormat: "markdown")
```

**Known rendering gotcha (Jira):** a code span inside link text (e.g. ``[`FILENAME.md`](url)``)
silently fails in Jira's markdown-to-ADF conversion: the link is dropped and it renders as plain
code text, while plain `[text](url)` links on the same comment (including ones adjacent to bold)
render fine. So never put backticks inside `[...]` link text. Spot-check the tool's response body
after posting and flag to the user if any link appears to have been dropped.

Report back with the ticket URL and any rendering quirks observed.
