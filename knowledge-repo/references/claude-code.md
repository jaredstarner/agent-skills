# Claude Code module

Wires Claude Code sessions to the bundle. Skip this file for other agents. Every edit here changes the user's agent config: show the exact change and get approval before writing it.

## Contents

- Hooks
- Auto memory
- Moving existing memories in
- Checks
- Gotchas

## Hooks

`tools/hooks.py` (copied from this skill's `scripts/`) has four modes. Each fails open: an error is logged to `<temp>/claude-knowledge-hooks/hooks.log` and never blocks a session.

| Event | Mode | Does |
|---|---|---|
| SessionStart | `session-start` | Tells the session where the bundle is; if the working folder matches a project concept's `local_path`, points at that concept |
| UserPromptSubmit | `prompt` | Points at project concepts the prompt names (slug, title, or folder name, 6+ characters), once per session |
| Stop | `stop` | After `hooks.nudge_after_tool_calls` tool calls (default 25, 0 turns it off) with no edit inside the bundle, asks once to file what was learned. Skipped in `--scheduled` and upkeep sessions |
| Stop (async) | `sync` | If the bundle has changes: runs `okf_check.py --fix`, commits as `sync: pending knowledge changes`, pulls with rebase, pushes. Skips the commit if the checker reports errors |

Merge `assets/claude-settings.json` into `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`). Keep any hooks the user already has: append to each event's list instead of replacing it. Fill in:

- `{{python}}`: the interpreter that has PyYAML, as an absolute path if `python` on PATH is a different one (`python3` on most macOS and Linux machines)
- `{{repo_path_fwd}}`: the bundle's absolute path with forward slashes (works on Windows too)

`sync` only makes sense when the user gave standing approval for the agent to commit and push in the bundle. Without it, leave the `sync` entry out; the user commits by hand or asks the agent to.

## Auto memory

Claude Code keeps auto memory per project in `~/.claude/projects/<project>/memory/` by default. Setting `autoMemoryDirectory` (absolute path or `~/` path) in user settings points every session's memory at the bundle's `memory/` folder, so preferences learned in one project reach all of them.

Memory files Claude Code writes have `name`, `description`, and `metadata.type` (`user`, `feedback`, `project`, `reference`) in frontmatter, but no OKF `type`. `okf_check.py --fix` adds `type` (`Profile`, `Preference`, `Project`, `Reference`), `title`, and `generated` without removing the harness keys, and gives `MEMORY.md` the `type: Memory Index` it needs. Keep memory files flat in `memory/`.

Project memories should be one-line pointers to `projects/<name>.md`; the checker warns when one grows past a pointer.

## Moving existing memories in

1. List `~/.claude/projects/*/memory/` folders that have files. Show the user the count per project and ask which to bring in
2. Copy (never move) the chosen files into the bundle's `memory/`. On a name clash, compare the two and ask which wins or merge them
3. Merge each source `MEMORY.md` into the bundle's `MEMORY.md`, one line per file, no duplicates
4. Project memories that hold details: move the details into a `projects/` concept and leave a pointer
5. Run `python tools/okf_check.py --fix`; resolve every error
6. The old folders stay where they are. Tell the user they can delete them once the new setup has run for a while

## Checks

After wiring, start a new Claude Code session in any folder and confirm:

- The session-start message names the bundle
- Saving a memory writes into the bundle's `memory/`
- After a few tool calls and a stop, `hooks.log` shows a sync line (if `sync` is on) and `git log` in the bundle shows the commit

To test hooks without a session, pipe JSON in: `echo '{"session_id":"test","cwd":"<a project folder>"}' | python tools/hooks.py session-start`

## Gotchas

- Several sessions share the bundle's folder, so a sync commit can carry another session's edits. That's expected; the commit message says so
- Never switch branches in the bundle folder: it is the live memory folder and the Stop hook commits whatever is there. Branch work goes in a worktree beside it
- On Windows, a renamed or moved bundle folder breaks the hook paths and `autoMemoryDirectory`; update both
