# Pitfalls

Corrections and wrong guesses from the source build, generalized. Each one cost a round trip with the owner. Scan this before calling a phase done.

## Process

| Pitfall | Do instead |
|---|---|
| Next-step menus that omit what the owner actually wants (going live early) | Ask about launch timing in discovery; include "deploy now" as an option when it is plausible. |
| Building draft gating or hiding nobody asked for | Ask how much the owner minds unfinished content being public. |
| Asking the owner to supply references they already supplied | Re-read the conversation and attachments first. |
| Assuming the recommended option wins | Present options neutrally with a recommendation; expect the owner to pick differently. |
| Proposing extra navigation (hero buttons, duplicate links) | Keep navigation minimal; propose additions as questions. |
| Polishing a complex feature before saving the working version | Commit the "good enough" version first, then iterate. |
| Proposing next work right after the owner approved a push | Push, let the owner review live, then ask. |
| Jargon from internal notes ("candidate pages", "the detector") surfaced without definition | Define terms when they first reach the owner; use precise terms the owner can repeat to others. |
| A one-line next-session starter | Write the full next-session prompt (`continuity.md`). |

## Content

| Pitfall | Do instead |
|---|---|
| Inventing or rounding facts to fill a gap | `[TBD]` and ask. |
| Copy in the owner's voice shipped unconfirmed (greetings, captions) | Draft in chat, confirm, then place. |
| Underselling the owner's experience or credentials | Read framing from the owner's point of view; offer stronger alternatives. |
| Time-relative words ("now", "new", "a decade ago") | Absolute facts. |
| Overcorrecting a voice rule until the copy is stiff | Ask where exceptions are allowed. |
| Adding labels that repeat nearby words | Check the whole tile or card after adding labels. |
| Mentioning an internal marker ("the draft comment") without explaining it | Say what and where it is. |
| Inferring hobbies or facts from photos | Ask. |

## Visual

| Pitfall | Do instead |
|---|---|
| Adopting a novelty display font from a brief without seeing it | Render it at real size with real content first. |
| Shipping visual changes after only a build | Screenshot and read back every visual batch. |
| "Looks right" from screenshots that missed unequal card heights | Check cross-item alignment explicitly. |
| Verifying with a method that hides the bug (hidden scrollbars, a short window) | Ask "could this check show the bug?" before trusting it. |
| Judging an animated page from a mid-animation capture | Wait long enough, or set the animation state with an injected script. |
| A test window too short for a first-run asset fetch | Give first loads slack. |
| Composite CSS variables not following re-themed colors | Redeclare composites in each themed scope. |
| A stretched-link card overlay blocking buttons inside the card | Lift only the interactive elements above the overlay. |
| Decorative triangles or arrows that look like controls | Non-directional glyphs for decoration. |
| An icon-only toggle | An action label. |
| Animation details drifting from the reference (layering, timing, sound) | Decompose the reference frame by frame and match it. |

## Tooling and environment

| Pitfall | Do instead |
|---|---|
| Scripted edits silently breaking files (lost backslashes, reformatted JSON, duplicated headings) | Use small script files with exact find/replace pairs that throw on a missing anchor; diff after. |
| Claims about hosts, registrars, platforms, or headers stated without checking | `curl -I`, DNS queries, the host's API; or say "unverified". |
| Commit hashes quoted from memory | Quote from tool output. |
| Commit message prefixes guessed | Read `git log` for the repo's conventions first. |
| Making one commit after proposing two | Do what was proposed, or say why not first. |
| Intermediate commits from partial staging never built on their own | Build each slice, or say it was not built. |
| `git mv` plus a heavy rewrite showing as delete plus add | Explain it so it does not look like data loss. |
| Windows: PowerShell mangling quotes in `node -e` and `ssh-keygen -N '""'` | Use script files or bash for anything with escapes. |
| Windows: CRLF breaking exact-match edits in an LF repo | Normalize line endings before matching. |
| Git Bash rewriting leading-slash arguments | `MSYS_NO_PATHCONV=1`. |
| Background preview servers left holding ports | Stop them at the end of each batch; kill by PID if the task stop leaves the process. |
| Scratch files and headless browser profiles piling up | Scripts remove their own temp dirs; at the end, inventory scratch output and clean up with the owner's approval. |
| Previews in a structured question widget that the owner cannot see | Put anything to approve in plain chat or a file you open for them. |
| Automated permission checks blocking commits when the owner only picked an option letter | Ask the owner to say "commit" explicitly. |
