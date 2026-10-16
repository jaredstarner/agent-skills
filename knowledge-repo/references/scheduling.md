# Scheduling upkeep

The routine runs `/knowledge-upkeep --scheduled` once a day: harvest new transcripts into the bundle, and on the maintenance day also fix warnings and re-check stale concepts. Present the options below, let the user pick, then set up the one they chose.

## Before any schedule

1. Install the `knowledge-upkeep` skill where scheduled sessions can load it (user skills folder, or synced from claude.ai)
2. Run `/knowledge-upkeep` once by hand, from the bundle folder. A manual run works in a worktree and ends in a PR, so the user can review what a harvest does before letting it commit to `main` unattended
3. The first run can mark old history as read instead of harvesting all of it: `python <upkeep skill>/scripts/condense.py <scratch> --state tools/harvest-state.json --update-state` with `--since <date>` set to where harvesting should start. Ask the user which they want

## Options

| | Claude Desktop local routine | OS scheduler | Cloud routine |
|---|---|---|---|
| Runs on | This machine, inside the Desktop app | This machine, headless `claude -p` | Anthropic's cloud, on a fresh clone |
| Needs | Desktop app open, machine awake | Machine awake (the OS can wake it) | Nothing local |
| Missed runs | One catch-up run on wake for misses in the last 7 days | Per scheduler: Task Scheduler "run as soon as possible after a missed start", anacron, or launchd on wake | Runs on schedule |
| Reads local transcripts | Yes | Yes | No |
| Can do | Harvest and maintenance | Harvest and maintenance | Maintenance only (`--maintenance-only`) |
| Permission prompts | Mode set per task; a stalled prompt waits in the sidebar | None can be answered; pre-approve tools | Runs autonomously |

Recommend the Desktop routine when the user already runs the Desktop app; the OS scheduler when they live in a terminal or want runs while the app is closed; a cloud routine only as an addition for maintenance, since it can't see transcripts.

Pick a time when the machine is usually on, before the user's day starts, and ahead of any other routine that reads the bundle, so those start from fresh knowledge.

## Claude Desktop local routine

1. In the Desktop app's **Code** tab, open **Routines**, click **New routine**, choose **Local** (needs Desktop 1.1.5368 or later)
2. Name: `knowledge-upkeep` (the condenser skips sessions this routine starts by matching that name)
3. Instructions: `/knowledge-upkeep --scheduled`
4. Permission mode: Auto if available, otherwise one that allows file edits and the git, python, and code host commands the run needs. Model: the user's choice; a capable model merges better
5. Folder: the bundle. Worktree: **off**. A worktree run edits a copy that other sessions don't read, while the Stop hook keeps committing in the main folder
6. Schedule: Daily at the chosen time
7. Optional: **Settings > This computer > System > Keep computer awake** so idle sleep doesn't skip runs (closing a laptop lid still sleeps it)
8. Click **Run now**, watch for permission prompts, and choose "always allow" for each so future runs don't stall

The prompt is stored at `~/.claude/scheduled-tasks/knowledge-upkeep/SKILL.md`; schedule, folder, and model are set in the app.

## OS scheduler

The command, run from the bundle folder:

```
claude -p "/knowledge-upkeep --scheduled" --permission-mode auto --permission-prompts none
```

Check `claude --help` for the flags on the installed version (`--permission-prompts` needs v2.1.259 or later). If auto mode isn't available, use `--permission-mode acceptEdits` with `--allowedTools` entries for the commands the run needs, for example `"Bash(git *),Bash(python *),Bash(gh issue create *)"`. Don't use `--bare`: it skips skills, hooks, and the subscription login. Run the command once by hand and confirm it finishes before scheduling it.

Write a small wrapper script so the scheduler has one thing to call, and log its output:

- **Windows (Task Scheduler)**: a `.ps1` that `Set-Location`s to the bundle and runs the command, appending output to a log. Register it with `Register-ScheduledTask` (daily trigger, "run only when user is logged on" so it sees the user's login, settings `-StartWhenAvailable` for missed runs, optional `-WakeToRun`). Show the user the command and let them run it
- **macOS (launchd)**: a `~/Library/LaunchAgents/<label>.plist` with `StartCalendarInterval`, `WorkingDirectory` set to the bundle, and `StandardOutPath`; load it with `launchctl bootstrap gui/$(id -u) <plist>`. launchd runs a job missed during sleep once on wake, but not one missed while the machine was off
- **Linux (cron)**: `crontab -e` with a line such as `30 5 * * * cd <bundle> && claude -p ... >> <log> 2>&1`. cron skips missed runs; use anacron or a systemd timer with `Persistent=true` if the machine is often off at that time

PATH under a scheduler is minimal: use the absolute path to `claude` (and to `python` in hooks if needed).

## Cloud routine

Cloud routines run on a fresh clone of the bundle's repo, so they can't read local transcripts. They can run maintenance: `/knowledge-upkeep --scheduled --maintenance-only`.

- Create one with `/schedule` in the CLI or **Routines > New routine > Remote** in the Desktop app, with the bundle's repo attached
- The skill must be available to cloud sessions: committed to the repo under `.claude/skills/`, or enabled on claude.ai
- Commits made in the cloud may be authored by the cloud agent rather than the user. If the user requires their own signed commits on the bundle, cloud runs should open a PR instead of pushing to `main`
- Minimum interval is 1 hour; once a week is plenty for maintenance

## After setup

Record the choice in the bundle's `projects/knowledge.md` under **Upkeep**: scheduler, time, prompt, folder, model, and how to pause it. Check the first scheduled run's result the next day.
