---
name: requirements-breakdown
description: >-
  Engineering manager pre-refinement workflow: turns product requirements (from a ticket tracker, wiki, Figma, document stores such as SharePoint or Google Drive, Word/Excel/PDF files, plain text, or any mix) into a structured Epic with child Tasks, Spikes, and placeholder tasks, complete with descriptions, blocking links, source cross-references, codebase-sourced implementation hints, and a critical path comment. Defaults to Jira; works with another tracker when the user names one. Runs before Sprint Refinement. Use when the user shares requirements in any form; says "break this down", "create tickets", "set up the epic", "intake this", "pre-refinement", "work breakdown", "requirements breakdown", or "prep this for the team"; or pastes several ticket, wiki, design, or doc links together.
---

# Requirements Breakdown

Pre-refinement workflow for Engineering Managers. Translates product requirements, delivered in
whatever form the PM or stakeholder uses, into a well-structured Epic with child Tasks and Spikes,
ready for Sprint Refinement.

The engineering parent issue is **always an Epic** (or the tracker's equivalent parent container).
Child work items need a parent that tracks their progress as a group.

## Requirements

- **Ticket tracker** with read/write access: Jira by default (Atlassian MCP connector, which also
  covers Confluence). Any other tracker needs its own MCP connector or CLI.
- **Figma** connector, when Figma links are provided.
- **Document store** connector (Microsoft 365 for SharePoint/OneDrive, Google Drive, or similar),
  when hosted documents are referenced.
- **bash** with the `gh` CLI and ripgrep, for codebase research in Phase 6.

If a connector the inputs need is missing, stop and tell the user. Do not substitute a different
source or skip the input silently.

---

## Phase 0: Setup & Configuration

### First-time use
On first run, ask the EM for their configuration:

1. **Tracker:** Jira unless they name another (Linear, GitHub Issues, Azure DevOps, etc.)
2. **Project / space key:** e.g. `ENG`, `PLATFORM`
3. **Site or workspace:** e.g. `yourcompany.atlassian.net`
4. **Code host org and repos:** e.g. `myorg/backend, myorg/frontend`, or `myorg` for the whole org

Store these for the session. If already present in conversation context, use them without re-asking.

### Subsequent runs
Confirm briefly: > "Using **{tracker}** project **{KEY}** on **{site}**, proceed?"

### Using a tracker other than Jira
This skill is written in Jira vocabulary and Jira tool calls. If the EM names a different tracker,
map each concept below to that tracker, present the mapping, and get confirmation before Phase 2.
Also confirm which tool (MCP connector or CLI) to use for it. Do not guess at a mapping the tracker
does not support; ask.

| Concept in this skill | Jira (default) | Other trackers |
|---|---|---|
| Epic (parent) | Epic | The container that holds child work items and tracks their progress (e.g. a parent issue with sub-issues, a project, an Epic or Feature) |
| Task | Task | The standard work item type |
| Spike | Spike issue type | A Spike type if one exists; otherwise a Task titled `Spike: ...` with a `spike` label |
| Blocking link | "Blocks" link type | The tracker's native blocking/dependency relation; if none, a "Blocked by" line in the description |
| Source link | "Relates" link type | The tracker's native "related" relation; if none, the Sources section of the description |
| Critical path comment | Issue comment | Comment on the parent item |
| Rich text | `contentFormat: "markdown"` | Whatever format the tracker's tool accepts |

---

## Phase 1: Input Gathering

### Step 1.1: Fetch all provided inputs (in parallel)

| Input type | How to fetch |
|---|---|
| Jira ticket (any space) | `getJiraIssue(key, responseContentFormat: "markdown")` |
| Jira Epic children | `searchJiraIssuesUsingJql(jql: "parent = {key} ORDER BY created ASC", fields: ["summary","description","status","issuetype","priority"], responseContentFormat: "markdown", maxResults: 100)` |
| Confluence page / PRD | `getConfluencePage(pageId, contentFormat: "markdown")` |
| Ticket or doc in another tracker or wiki | That tool's read call |
| Figma design / spec | Figma connector: read frames, components, annotations |
| SharePoint / OneDrive document | Microsoft 365 connector: search or read the resource by URL |
| Google Doc / Sheet / Drive file | Google Drive connector: read the file content |
| Uploaded Word / Excel / PDF / plain text | Use as-is from context |

**Do not proceed until all provided/linked inputs are fetched.** Flag anything inaccessible and
ask whether to proceed without it.

### Step 1.2: Prompt for missing source link
If requirements were provided without a linkable source (e.g. pasted text only), ask:

> "Do you have a source for these requirements: a ticket, wiki page, Figma file, shared doc, or
> similar? I'll reference it in the Epic so the team can trace back to it. Even a named person,
> team, or document title works if there's no URL."

If the EM provides a link, fetch it. If they provide a name or title only, record it as-is.
If they have nothing, proceed without a source reference. Do not fabricate one.

### Step 1.3: Requirements Summary & Circuit Breaker (present to EM)
Synthesize and present before touching the tracker:

- Feature name / working title
- Core user problem being solved
- Key functional requirements extracted
- Known constraints or dependencies
- ⚠️ Open questions / ambiguities, flagged explicitly
- Source materials identified (with links where available)

**Circuit breaker: raise concerns before proceeding.**
Before confirming with the EM, evaluate the requirements critically. Concerns fall into two tiers:

**🚫 Tier 1: Insufficient detail (hard stop):**
If the requirements as a whole are too thin, vague, or incomplete to produce meaningful tasks
(writing acceptance criteria would be guesswork), do not proceed with breakdown. Instead:

```
🚫 These requirements don't include enough detail to break this work down into meaningful tasks.

Specifically:
- [What is missing or too vague to act on]
- [What questions must be answered before engineering work can be defined]

Two options:
  A) I can produce a list of what's needed and the questions that must be answered,
     which you can share back with the PM/stakeholder to get the requirements to a
     workable state.
  B) I can proceed on a best-effort basis, making assumptions where needed and flagging
     them clearly in the Epic and tasks, with the understanding that Refinement will
     need to resolve them before work begins.

How would you like to proceed?
```

Wait for the EM's choice before continuing. Do not silently assume option B.

**⚠️ Tier 2: Specific concerns (proceed with direction):**
If the requirements are workable overall but contain specific issues, surface them clearly:

- **Incomplete scope:** Something is clearly missing that will require engineering effort
  (e.g. authentication assumed but not specified, error handling unaddressed, an implied
  dependency on another system not described). Name the gap; ask whether to scope in,
  defer, or treat as a known unknown.

- **Effort / cost concerns:** The request implies significant complexity, cross-team
  coordination, infrastructure changes, or rework that may not be visible to the requester.
  Flag plainly, e.g. "This implies rebuilding the permissions layer, which is likely
  several sprints of work. Is that understood?"

- **Conflicting or inconsistent requirements:** Requirements that contradict each other,
  conflict with existing product behavior, or conflict across sources.

- **Scope that seems misplaced:** Work belonging to another team, system, or Epic, or
  that duplicates something already built or in progress.

- **Unclear acceptance bar:** Requirements so vague that acceptance criteria cannot be
  written for a specific item. Name what needs to be defined.

Format Tier 2 concerns clearly, separate from the summary:

```
⚠️  Concerns before proceeding:

1. [MISSING SCOPE] Authentication flow is referenced but not specified. Will this use
   existing SSO or require a new integration? This affects task count and effort significantly.

2. [EFFORT FLAG] "Real-time sync" implies a WebSocket or polling infrastructure change.
   If this doesn't exist today, it's non-trivial. Is that in scope for this Epic?

3. [AMBIGUITY] "Admins can manage preferences": does this mean on behalf of any user,
   or only within their own organization? Acceptance criteria cannot be written without this.
```

After raising Tier 2 concerns, ask:
> "How would you like to handle these? I can continue with assumptions noted, wait for
> clarification, or loop in the PM/stakeholder if needed."

Do not proceed to Phase 2 until the EM has acknowledged concerns and given direction.
If no concerns exist, say so briefly:

> "No concerns with these requirements. Does this summary look right before I proceed?"

---

## Phase 2: Epic Description Update

### Step 2.1: Write the description

Every Epic description contains these **five baseline sections**, always present, always in this
order:

```markdown
## Overview
[2-4 sentences: what this feature does, why it's being built, who it serves.
 Include links or named references to source materials: tickets, PRDs, Figma files,
 shared docs, named documents, or named individuals/teams who provided the requirements.
 If no source was identified, omit the source reference. Do not fabricate one.]

## Requirements
[Functional scope of the feature. Organize in whatever grouping best reflects the engineering
 work: by domain, by workflow step, by system layer, by user role, etc. Do not blindly mirror
 how the PM organized it; choose the structure most useful to an engineer picking this up.
 Where a requirement traces to a specific source, reference it inline:
 e.g. (PM-86), (PRD §3.2), (Figma: "Connectors step")]

## Out of Scope
[Anything explicitly excluded. Surfaces assumptions early and prevents scope creep.
 If nothing is explicitly out of scope, write "Not yet defined; to be confirmed in Refinement."]

## Open Questions / Risks
[Ambiguities, unknowns, or risks identified during intake that need resolution before or during
 Refinement. If none, write "None identified at this time."]

## Source Materials
- [Input 1: type + link or name, e.g. "PM Epic: PM-85 (link)"]
- [Input 2: type + name, e.g. "PRD: Product Strategy Doc v2 (shared doc link)"]
- [Input 3: type + link, e.g. "Design: Figma, Notification Preferences (link)"]
- [If named but no link: e.g. "Requirements: provided by Jane Smith, Product Manager"]
- [Omit this section entirely if no source of any kind was identified]
```

### Extended sections (add when relevant)
Append any of the following **after** the five baseline sections when the feature warrants it.
Use judgment: add what genuinely helps an engineer, skip what adds noise.

| Section | When to add |
|---|---|
| `## User Roles / Personas` | When behavior differs meaningfully by role or user type |
| `## Non-Functional Requirements` | When there are real constraints on performance, security, retention, access control, or integrations |
| `## Schema / Data Model` | When a new data structure is central to the feature |
| `## Workflow / Sequence` | When a step-by-step flow or state machine is core to understanding the work |
| `## Dependencies` | When the feature relies on another team, system, or in-flight Epic |
| `## Glossary` | When domain-specific terms need definition for the engineering team |

### Simplicity exception
If the feature request is minimal or straightforward, use a lighter-weight description. The goal
is to give engineers what they need, not to fill sections for the sake of completeness. A simple
bug fix or small enhancement may need only Overview, Requirements, and Source Materials. Use
judgment: would a developer benefit from the extra structure, or would it just be noise?

### Step 2.2: Present for review
**Do not call `editJiraIssue` (or the tracker's equivalent) until the EM confirms.**

> "Here's the proposed Epic description. Review it and confirm when ready. Small tweaks directly
> in the tracker afterward are fine."

### Step 2.3: Apply
```
editJiraIssue(
  issueIdOrKey: engineering_epic,
  fields: { description: <proposed_description> },
  contentFormat: "markdown"
)
```

---

## Phase 3: Work Breakdown Ideation

### Step 3.1: Breakdown principles
Decompose requirements into Tasks using engineering judgment, not a 1:1 mapping to requirements
or source stories. The task list may be smaller than the requirements (consolidation) or larger
(placeholder tasks for implied work). Apply these principles:

1. **Infrastructure before features.** State, storage, schema, write-path, and orchestration tasks
   are always separate. They are the dependency root everything else waits on.

2. **Shared mechanisms get their own task.** Any component, API, or layer used by 2+ downstream
   tasks gets isolated so it can be built and reviewed before its consumers depend on it.

3. **Consolidate by pattern.** Requirements that share an identical implementation pattern belong
   in one task. The work is configuration of a shared mechanism, not N separate implementations.

4. **Isolate unique complexity.** A requirement with a sub-step, role gate, non-standard trigger,
   or security sensitivity gets its own task.

5. **Non-functional concerns stay separate.** Access control, retention, external integrations:
   never merged into feature tasks, even when small.

6. **Aim for sprint-sized tasks:** roughly 1-5 days of effort for a Senior Software Engineer.
   The task should remain completable by a mid-level engineer given the implementation notes and
   context provided.

7. **Simple features need simple breakdowns.** Not every feature needs a blocking chain or
   infrastructure task. A flat list of independent tasks is the right answer when that's what the
   work actually is.

8. **Create placeholder tasks for implied work.** If engineering knowledge or codebase context
   reveals work that is clearly necessary but absent from the requirements, create a placeholder
   task. This is the EM's responsibility; requirements are never complete.

   Placeholder tasks are appropriate when:
   - Infrastructure or setup work is assumed but unspecified (e.g. DB migration, feature flags,
     environment config, third-party credentials)
   - Testing, QA, or E2E coverage is not mentioned but the feature warrants it
   - Logging, monitoring, or alerting is unaddressed for a production-critical path
   - A dependency on another system or team needs a coordination/handoff task
   - Technical debt or cleanup is a prerequisite the PM would not think to specify
   - The requirements imply a capability that doesn't yet exist in the codebase (e.g. "send an
     email" when no email service integration exists)

   Placeholder tasks must be clearly marked and explained so the EM can accept, reject, or
   adjust them before creation. They are a signal to the PM that the stated requirements are
   not the full picture of engineering effort.

9. **Create Spikes for technical unknowns.** A Spike is a time-boxed research task for unknowns
   that must be resolved before implementation work can be confidently estimated or started.
   Spikes are a distinct issue type from Tasks; they are not placeholder tasks.

   Create a Spike (instead of a Task) when:
   - The implementation approach has two or more plausible paths with meaningfully different
     effort or complexity tradeoffs, and a decision must be made before building begins
   - A requirement depends on a technology, API, or integration the team hasn't used before
   - A third-party service needs to be evaluated before committing to it
   - Performance, scale, or security constraints exist but no proven solution is established
   - A requirement is understood at the product level but technically unclear at the
     engineering level: the team doesn't yet know how to build it

   Spikes produce outputs (a decision, a proof of concept, a recommendation, a tech design doc),
   not shippable software. The engineer who runs the Spike determines what follow-on Tasks or
   further Spikes result from it. Spikes are time-boxed, not pointed.

### Step 3.2: Present proposed breakdown
```
Proposed breakdown (N tasks):

[Tasks derived from requirements]
T1 - [Foundation/infrastructure task]       [no blockers]
T2 - [Shared component or next layer]       [blocked by T1]
T3 - [Feature area A]                       [blocked by T2]   → PM-86 / PRD §3.1
T4 - [Feature area B, consolidated]         [blocked by T2]   → PM-88, PM-89

[Placeholder tasks: implied work not in requirements]
T5 - [e.g. "Feature flag setup & rollout config"]       [no blockers]      📋 PLACEHOLDER
     Reason: No rollout strategy specified; assumed needed for safe production deployment.
T6 - [e.g. "E2E test coverage for notification flow"]   [blocked by T3]    📋 PLACEHOLDER
     Reason: User-facing flow; warrants automated coverage not mentioned in requirements.

[Spikes: time-boxed research for technical unknowns]
S1 - [e.g. "Spike: Evaluate real-time delivery options (WebSocket vs. SSE vs. polling)"]
     [no blockers]    🔬 SPIKE, recommended timebox: 2 days
     Reason: Requirements specify real-time sync but no approach is defined. Two materially
     different paths exist; a decision is needed before T2 can be estimated.

Blocking chain: T1 → T2 → T3, T4 (parallel) → T6
Note: T2 should not begin until S1 is resolved.
```

> "Does this breakdown look right? I've flagged placeholder tasks for implied work and spikes
> for technical unknowns. Let me know which to keep, remove, or adjust."

**Do not create any issues until the EM confirms.**

---

## Phase 4: Prerequisites (parallel fetch)

Before creating issues, fetch in parallel:
- `getIssueLinkTypes(cloud_id)`: confirm the exact names of the blocking and relates link types
  on this instance. Names vary between instances (e.g. "Relates" vs. a customized name); always
  use the names returned here, never assume them.
- `getJiraProjectIssueTypesMetadata(cloud_id, projectIdOrKey: engineering_space_key)`: confirm
  both "Task" and "Spike" issue types are available

For other trackers, confirm the equivalent: the available relation types and work item types.

---

## Phase 5: Issue Creation & Linking

### Step 5.1: Create all Tasks (parallel batch)
```
createJiraIssue(
  projectKey: engineering_space_key,
  issueTypeName: "Task",
  parent: engineering_epic,
  summary: <title>,
  description: <description>,
  contentFormat: "markdown"
)
```

Each Task description:
```markdown
## Overview
[What this task delivers and why it exists as its own task.
 If this is a placeholder task, state that explicitly:
 "📋 Placeholder task: this work is not explicitly stated in the requirements but is
 necessary for [reason]. Confirm scope with EM before development begins."]

## Scope
- [What is included]
- [Explicitly excluded, if relevant]

## Acceptance Criteria
- [ ] [Testable condition 1]
- [ ] [Testable condition 2]

## Implementation Notes
[Populated in Phase 6 after codebase research]

## Sources
[References to the specific requirements this task implements.
 Use whatever form is available: ticket key, wiki section, Figma frame, or
 "Derived from Epic overview" if no finer-grained source exists.
 For placeholder tasks: "Implied by requirements, not explicitly specified."]
```

### Step 5.2: Create all Spikes (parallel batch)
```
createJiraIssue(
  projectKey: engineering_space_key,
  issueTypeName: "Spike",
  parent: engineering_epic,
  summary: "Spike: <question being investigated>",
  description: <description>,
  contentFormat: "markdown"
)
```

Spike descriptions use a different format from Tasks, because Spikes are investigations, not
deliverables:
```markdown
## Question / Unknown
[The specific technical question this Spike must answer. Be precise: a vague question
 produces a vague outcome.]

## Context
[Why this is unknown, why it matters for the Epic, and what happens if it's not resolved
 before implementation begins.]

## Recommended Timebox
[e.g. 2 days. This is a recommendation; the final timebox is set during Refinement.]

## Expected Output
[What the engineer should produce at the end: a decision, a proof of concept, a tech design
 doc, a recommendation with tradeoffs, a feasibility assessment, etc. Be specific.]

## Out of Scope
[What this Spike is NOT expected to solve. Keeps it focused and time-boxed.]

## Work This May Generate
[Tasks or further Spikes that are likely to result from this investigation. This gives the
 team visibility into downstream impact before committing to the timebox.]
```

### Step 5.3: Blocking links (parallel batch)
```
createIssueLink(
  type: <blocks_type>,      // exact name from Phase 4
  inwardIssue: <blocker>,   // the task doing the blocking
  outwardIssue: <blocked>   // the task being blocked
)
```

### Step 5.4: Source cross-links (parallel batch, tracker sources only)
When source requirements exist as issues in the same tracker, link each engineering Task to what
it implements:
```
createIssueLink(
  type: <relates_type>,          // exact name from Phase 4
  inwardIssue: <eng_task_key>,
  outwardIssue: <source_issue_key>
)
```
For sources outside the tracker (wiki pages, Figma, docs), the Sources section in the task
description is sufficient; no link needed. Create all links in a single parallel batch; retry any
failures individually.

---

## Phase 6: Codebase Research & Implementation Hints

For each created Task, research implementation context from the team's repos using bash. Commands
below assume GitHub; use the equivalent CLI for another code host.

### Research approach
```bash
# Search for relevant patterns across the org
gh search code "<relevant term>" --owner <org> [--repo <org/repo>] --limit 20

# Grep within a checked-out repo
rg -l "<pattern>" /path/to/repo

# Read a specific file
gh api repos/<org>/<repo>/contents/<path> | jq -r '.content' | base64 -d

# Find recent related commits
gh search commits "<feature area>" --owner <org> --limit 10
```

Focus on:
- **Existing patterns to follow:** how similar features/endpoints/components are structured
- **Files likely to be modified:** give the engineer a concrete starting point
- **Prior art:** similar work already built that can be referenced or reused
- **Gotchas:** deprecated patterns, known tech debt, cross-cutting concerns

Update each task's **Implementation Notes** via `editJiraIssue(contentFormat: "markdown")`.
Keep it concise, 3-6 bullets per task:

```markdown
## Implementation Notes
- Follow endpoint pattern in `src/api/user/preferences.ts`
- Schema migrations: use `db/migrations/create_migration.sh` helper
- FE component likely extends `UserSettingsPanel` in `src/components/settings/`
- ⚠️ `notification_type` enum is defined in 3 places; consolidation tracked in ENG-11
```

If no relevant context is found: "No prior art identified; greenfield implementation."
If no repos are configured: skip this phase and note it in the task descriptions.

---

## Phase 7: Critical Path Comment

**Purpose:** This comment is written for the engineering team, the people who will actually
pick up and execute the work. Its goal is to give them a broad-strokes orientation on how to
sequence and staff the work before Refinement, so they arrive at that ceremony with context
rather than cold. It is not a project plan; it is a starting point.

After all tasks, Spikes, and implementation hints are in place, post a comment to the Epic:
```
addCommentToJiraIssue(
  issueIdOrKey: engineering_epic,
  body: <comment>,
  contentFormat: "markdown"
)
```

```markdown
## Where to Start

[1-2 sentences orienting the team: what the first move is and why, written plainly.
 e.g. "Before any feature work begins, ENG-43 (database schema) must be completed. It is
 the dependency root for everything else in this Epic."]

## Critical Path
[The sequential chain that cannot be parallelized, using actual issue keys.
 e.g. ENG-43 → ENG-44 → ENG-45
 If no critical path exists (all tasks independent), say so plainly.]

## Parallel Workstreams
Once **ENG-43** is complete, the following can be staffed independently:
- ENG-46: [brief description]
- ENG-47: [brief description]
[Omit if work is purely sequential or there is only one engineer.]

## Spikes to Resolve First
[List any Spikes whose outcomes gate downstream Tasks, e.g.:
 "ENG-50 (Spike: real-time delivery approach) should be resolved before ENG-44 is estimated."]
[Omit if no Spikes were created.]

## Suggested Phasing
**Phase 1 (foundation):** ENG-43
**Phase 2 (parallel feature work):** ENG-45, ENG-46, ENG-47
**Phase 3 (dependent/finishing work):** ENG-44, ENG-48
[Adapt to the actual task graph. If the feature is simple enough that phasing adds no clarity,
 skip this section and say so.]

## Risks & Dependencies
- [External team or system dependencies]
- [Decisions that must be made before downstream tasks can start]
- [Open questions from intake still unresolved]
[Omit if none.]
```

---

## Phase 8: Final Summary

```
✅ Requirements Breakdown Complete

Epic:  ENG-42 "Implement user notification preferences"
       Sources: PM-85, PRD (wiki), Figma (Notifications spec)

Tasks:
  ├── ENG-43  Database schema & write API     [no blockers]
  ├── ENG-44  Read/query API                  [blocked by ENG-43]
  ├── ENG-45  Notification preference UI      [blocked by ENG-44, ENG-46]
  ├── ENG-46  Access control                  [blocked by ENG-43]
  ├── ENG-47  Email delivery integration      [blocked by ENG-43]
  ├── ENG-48  Feature flag & rollout config   [no blockers]              📋 Placeholder
  └── ENG-49  E2E test coverage               [blocked by ENG-45]        📋 Placeholder

Spikes:
  └── ENG-50  Spike: Evaluate real-time delivery options   [no blockers]  🔬 2-day timebox
              (gates ENG-44 estimation)

Source links created: ENG-44 → PM-88, ENG-45 → PM-89
                      (Non-tracker refs in task descriptions)

⚠️  Concerns raised during intake (resolved):
    - [Concern + how EM directed it to be handled]

⚠️  Open questions for Refinement:
    - [Any unresolved questions from Phase 1]

Implementation hints added. Critical path comment posted.
Ready for Sprint Refinement.
```

---

## Error Handling & Edge Cases

| Situation | Action |
|---|---|
| Input inaccessible (403, auth, broken link) | Flag, ask to skip or wait |
| Connector for an input or the tracker is missing | Stop and tell the EM; do not substitute another source |
| Non-Jira tracker named | Present the concept mapping from Phase 0; confirm before Phase 2 |
| Requirements with no source link | Ask for named source (person/team/doc); omit if none available |
| Requirements too thin to break down | Tier 1 circuit breaker: offer needs list or best-effort |
| Ambiguous requirement | Surface as open question in Epic; do not guess |
| Very large spec (50+ requirements) | Suggest splitting into multiple Epics; confirm with EM |
| "Spike" issue type not available in project | Create as Task with "Spike:" prefix and a `spike` label; note in summary |
| No repos configured | Skip Phase 6; note in task descriptions |
| Source requirements outside the tracker | Use Sources section in task description instead |
| Link creation fails | Retry individually; report persistent failures in summary |

---

## Notes for Shared Use

Each EM configures their own tracker, project key, site, and repos at session start. The skill is
project-agnostic and source-agnostic: it works whether requirements arrive via a tracker, a wiki,
Figma, shared or uploaded docs, or plain text.
