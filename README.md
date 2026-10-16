# agent-skills

Shareable skills in the [Agent Skills](https://agentskills.io) format: each top-level folder is one skill, defined by its `SKILL.md`. Built and tested in Claude Code; the format also loads in other agents that support Agent Skills.

| Skill | Command | What it does |
|---|---|---|
| [knowledge-repo](knowledge-repo/SKILL.md) | `/knowledge-repo` | Set up a personal knowledge repo in [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format): conventions, checker, seeding from notes or agent memory, agent wiring (Claude Code hooks and shared auto memory), and a scheduled upkeep routine |
| [knowledge-upkeep](knowledge-upkeep/SKILL.md) | `/knowledge-upkeep` | What the routine runs: harvest durable knowledge from Claude Code transcripts into the repo, plus weekly maintenance. Unattended with `--scheduled`; manual runs end in a PR |
| [nudge-ticket](nudge-ticket/SKILL.md) | `/nudge-ticket` | Turn a stalled ticket into an approach comment: pull linked context, find a completed analog in the code host, diff the two, draft steps and starter code. Drafts only; posts after approval. Jira and GitHub by default |
| [requirements-breakdown](requirements-breakdown/SKILL.md) | `/requirements-breakdown` | EM pre-refinement: turn product requirements from any source into an Epic with Tasks, Spikes, placeholder tasks, blocking links, codebase implementation hints, and a critical path comment. Jira by default, other trackers on request |
| [website](website/SKILL.md) | `/website` | Plan, design, build, and launch a website: discovery, visual direction, stack and hosting fit check, tokens, content, rendered QA, SEO and social image, deploy, DNS, releases |

## Install

**claude.ai sync (every signed-in Claude Code session):** package the skill and upload it. Set `$skill` to the folder name.

```powershell
$skill = 'website'
python -c "import sys, zipfile, pathlib; n = sys.argv[1]; z = zipfile.ZipFile(f'dist/{n}.zip', 'w', zipfile.ZIP_DEFLATED); [z.write(p, p.as_posix()) for p in sorted(pathlib.Path(n).rglob('*')) if p.is_file()]; z.close()" $skill
```

1. Code execution must be on (Settings > Capabilities on Pro or Max).
2. [Customize > Skills](https://claude.ai/customize/skills) > **+** > **+ Create skill** > **Upload a skill**, then choose `dist/<skill>.zip`.
3. In a new Claude Code session, `/skills` lists it under `claude.ai sync`. Synced copies land in `~/.claude/skills/synced/` and are download-only: edit here, then re-upload.

**Local only (this machine):** copy or link the folder to `~/.claude/skills/<skill>/`. A local skill takes `/<skill>` over a synced one with the same name, which then runs as `/anthropic-skills:<skill>`.

## Scripts

The website skill's scripts need Node 22+ and Chrome or Edge; `photo-intake.mjs` also needs `sharp` in the site project. Run any of them with `--help`. The knowledge skills' scripts need Python 3.10+ and PyYAML.

## Not in this repo

`research/` (transcript extracts used to write the skills) stays local and is gitignored.

## Contributing

Bug reports, improvements, and new skill ideas are welcome through the issue forms. See [CONTRIBUTING.md](CONTRIBUTING.md) for how changes are proposed and reviewed.

## License

[MIT](LICENSE)
