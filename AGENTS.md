# agent-skills

Shareable skills in the [Agent Skills](https://agentskills.io) format. Each top-level folder is one skill: a `SKILL.md` plus optional `references/` and `scripts/`. `CLAUDE.md` is a symlink to this file; edit `AGENTS.md`.

## Workflow

- Never push to `main`; work on a branch and open a pull request into `main`
- Sign every commit; the `main` ruleset rejects unsigned commits
- Keep commits small and focused; PRs merge with a merge commit, so each commit lands on `main`
- Write commit messages as [Conventional Commits](https://www.conventionalcommits.org), scoped to the skill where it fits (`feat(website): ...`). There are no releases; `main` is what users install
- Name branches `<type>/<short-description>`, using a Conventional Commit type
- Run `python .github/scripts/validate_skills.py` before pushing; CI runs it as the required `validate-skills` check
- Every PR needs the owner's approval (`.github/CODEOWNERS`). The owner merges their own PRs with the admin bypass once checks pass
- Agents stop for a local review before pushing a branch or opening a PR

## Skill rules

- A skill holds its domain method only. Personal working preferences (tone, approval gates, formatting habits) belong in the user's own agent instructions, not in a skill
- Tool-agnostic by default: name a common default (for example Jira for tickets, `gh` for the code host) and work with another tool when the user names one. Map the concepts the skill needs to that tool and confirm before proceeding; if no tool exists for it, stop
- Nothing personal or employer-specific: no names, emails, local paths, internal hosts, or real ticket keys. Use generic examples
- Frontmatter keeps to `name`, `description`, and `license: MIT`. `name` matches the folder. `description` stays under 1024 characters and says what the skill does and when to load it; write it as a `>-` block or quote it, since a bare colon breaks the YAML
- Refer to agent actions generically ("ask the user"), not by one agent's tool names
- Requirements (runtimes, CLIs, accounts) go in a "Requirements" section of the body
- Scripts state their runtime in `--help` and the README; avoid dependencies where possible
- No em-dashes in any file
- Adding a skill: add its README table row and add it to the skill dropdown in `.github/ISSUE_TEMPLATE/skill-bug.yml` and `skill-change.yml`; the validator checks all three

## Not in the repo

`research/` (source material used to write skills) and `dist/` (packaged zips) stay local and are gitignored. Never commit transcripts or extracts.
