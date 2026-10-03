# Multi-session continuity

A site build usually spans several sessions. The source build ran 8, and the sessions that started cleanly were the ones with a deliberate doc set. Set it up in phase 3 and keep it current.

## Doc set

| File | Audience | Tracked | Contents |
|---|---|---|---|
| `README.md` | Humans | Yes | What the site is, dev and build commands, content map (which file drives which page), deploy summary. |
| `AGENTS.md` (plus a `CLAUDE.md` that points to or links it) | Agents, auto-loaded | Yes | Commands, structure, conventions, gotchas, verification steps, where decisions live. Rewrite any template version immediately. |
| `docs/decisions.md` | Both | Yes | Dated entries of 2 to 3 lines: the choice, the reason, what was rejected. Log every intentional choice and exception as it is made, so later work does not "fix" it. Supersede entries rather than deleting them. |
| Design-system README (for example `src/theme/README.md`) | Both | Yes | Token layers, roles, exceptions, how to add a component. |
| `CHANGELOG.md` | Humans | Yes | Updated at releases only, if the owner wants one. |
| `docs/session-handoff.md` | Next session | **No** (untracked) | Current state only: commit SHA, what is open, tooling notes, next steps. Overwrite it; history lives in git and decisions. |

Keep docs in sync in the same commit as the feature that changes them (README content map, design-system README, styleguide demo).

## Starting a session

1. Read the handoff, `AGENTS.md`, and `docs/decisions.md`.
2. Verify repo state against the handoff: branch, SHA, signatures if used, untracked files. Report any mismatch before proposing work.
3. Inventory `[TBD]`s by page if content work is next.
4. Ask the open questions the handoff lists, each with a recommended default.

After a dropped turn or API error, check `git status` and `git log` before redoing anything; small commits make this cheap.

## Ending a session

When the session is getting long or the owner asks, update the handoff and produce a full next-session prompt. A one-line starter was not enough in the source build.

### Next-session prompt template

```
New session in <repo path>. Read docs/session-handoff.md, docs/decisions.md, AGENTS.md, and README.md first.

State: <branch> at <SHA>, <pushed or not>, live at <URL>.

Goal for this session: <one sentence>.

Plan, in order:
1. <step>
2. <step>

Before building, ask me: <the open questions, each with your recommended default>.

Rules that matter most here:
- <project-specific verification steps, e.g. run check and build before every commit; grep dist for the change>
- <staging rules, e.g. stage by path; never stage docs/session-handoff.md>
- <content rules, e.g. never invent facts; [TBD] for gaps>

Tooling notes: <anything environment-specific from the handoff>.
```

## Parallel sessions

Sessions running at the same time can edit the same file (memory, handoff). Re-read and merge before writing; never overwrite blind.
