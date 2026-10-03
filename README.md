# claude-skills

Personal Claude Code skills. Each top-level folder is one skill.

| Skill | Command | What it does |
|---|---|---|
| [website](website/SKILL.md) | `/website` | Plan, design, build, and launch a website: discovery, visual direction, stack and hosting fit check, tokens, content, rendered QA, SEO and social image, deploy, DNS, releases |

## Install

**claude.ai sync (every signed-in Claude Code session):** package the skill and upload it.

```powershell
python -c "import zipfile, pathlib; s = pathlib.Path('website'); z = zipfile.ZipFile('dist/website.zip', 'w', zipfile.ZIP_DEFLATED); [z.write(p, p.as_posix()) for p in sorted(s.rglob('*')) if p.is_file()]; z.close()"
```

1. Code execution must be on (Settings > Capabilities on Pro or Max).
2. [Customize > Skills](https://claude.ai/customize/skills) > **+** > **+ Create skill** > **Upload a skill**, then choose `dist/website.zip`.
3. In a new Claude Code session, `/skills` lists it under `claude.ai sync`. Synced copies land in `~/.claude/skills/synced/` and are download-only: edit here, then re-upload.

**Local only (this machine):** copy or link the folder to `~/.claude/skills/website/`. A local skill named `website` takes `/website` over a synced one, which then runs as `/anthropic-skills:website`.

## Scripts

The website skill's scripts need Node 22+ and Chrome or Edge; `photo-intake.mjs` also needs `sharp` in the site project. Run any of them with `--help`.

## Not in this repo

`research/` (transcript extracts used to write the skills) stays local and is gitignored.
