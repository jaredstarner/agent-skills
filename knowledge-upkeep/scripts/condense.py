"""Condense Claude Code session transcripts for knowledge harvesting.

    python condense.py OUT_DIR [--state STATE.json] [--config knowledge.json] [--since YYYY-MM-DD]
                       [--max-chars N] [--update-state]

Keeps user prompts (including ones typed while Claude was mid-turn), assistant text, one-line tool calls,
and tool errors; drops tool output, thinking, and subagent transcripts. Transcripts are taken oldest first
from <config dir>/projects/*/*.jsonl, where <config dir> is CLAUDE_CONFIG_DIR or ~/.claude.

--state      only lines after each transcript's recorded cursor are condensed; the advanced cursors are
             written to OUT_DIR/harvest-state.next.json, which the run copies over STATE once it has committed
--config     the bundle's tools/knowledge.json; reads upkeep.exclude_projects (transcript folder names to skip)
--max-chars  defers sessions past the budget to the next run (their cursors stay put)
--update-state  writes STATE directly (for a first run that should mark old history as read)

Short sessions still active within IDLE_SECONDS keep their cursor so new lines accumulate.
Upkeep sessions (a knowledge-upkeep marker in the transcript's opening lines) are skipped whole, including
lines they wrote after a previous run condensed them.
"""
import datetime as dt
import glob
import json
import os
import re
import sys

CONFIG_DIR = os.environ.get("CLAUDE_CONFIG_DIR") or os.path.expanduser("~/.claude")
PROJECTS = os.path.join(CONFIG_DIR, "projects")
UPKEEP_MARKER = re.compile(r'<command-name>/(?:[\w.-]+:)?knowledge-upkeep\b|<scheduled-task name="knowledge-upkeep"|\[knowledge-upkeep\]')
OPENING_LINES = 40  # transcript lines searched for an upkeep marker
MIN_CHARS = 1500  # condensed sessions shorter than this hold nothing worth harvesting
IDLE_SECONDS = 48 * 3600  # a transcript untouched this long is treated as finished


def clip(s, n):
    s = " ".join(str(s).split())
    return s if len(s) <= n else s[:n] + " ..."


def text_of(content):
    if isinstance(content, str):
        return content
    return " ".join(b.get("text", "") for b in content or [] if isinstance(b, dict) and b.get("type") == "text")


def is_upkeep(lines):
    """True if the session was started by the knowledge-upkeep skill (manual, scheduled, or headless)."""
    for line in lines[:OPENING_LINES]:
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if e.get("type") == "user" and UPKEEP_MARKER.search(text_of((e.get("message") or {}).get("content"))):
            return True
        if e.get("type") == "attachment" and UPKEEP_MARKER.search(json.dumps(e.get("attachment") or {})):
            return True
        if e.get("type") == "assistant" and not e.get("isSidechain"):  # routines load the skill with a tool call
            for b in (e.get("message") or {}).get("content") or []:
                if isinstance(b, dict) and b.get("type") == "tool_use" and b.get("name") == "Skill" \
                        and str((b.get("input") or {}).get("skill", "")).split(":")[-1] == "knowledge-upkeep":
                    return True
    return False


def tool_line(b):
    i = b.get("input") or {}
    detail = i.get("description") or i.get("command") or i.get("file_path") or i.get("pattern") or i.get("prompt") or json.dumps(i)
    return f"[tool {b.get('name')}] {clip(detail, 220)}"


def queued_prompt(e):
    """Text of a prompt typed while Claude was mid-turn (stored as an attachment, not a user entry), else None.
    Task notifications and agent messages queue the same way; they carry a non-human origin and are skipped."""
    a = e.get("attachment") or {}
    if e.get("type") != "attachment" or a.get("type") != "queued_command" or a.get("commandMode") != "prompt":
        return None
    if (a.get("origin") or {}).get("kind") not in (None, "human"):
        return None
    p = a.get("prompt")
    txt = p if isinstance(p, str) else text_of(p)
    return txt if txt.strip() else None


def condense(lines, start):
    out, title, cwd, first, last = [], None, None, None, None
    for line in lines[start:]:
        try:
            e = json.loads(line)
        except json.JSONDecodeError:
            continue
        if e.get("type") == "ai-title":
            title = e.get("aiTitle") or e.get("title") or title
        queued = queued_prompt(e)
        if e.get("isSidechain") or e.get("isMeta") or (e.get("type") not in ("user", "assistant") and queued is None):
            continue
        cwd = e.get("cwd") or cwd
        ts = (e.get("timestamp") or "")[:16].replace("T", " ")
        first = first or ts
        last = ts or last
        if queued is not None:
            out.append(f"\n## USER {ts} (queued mid-turn)\n{clip(queued, 3000)}")
            continue
        content = (e.get("message") or {}).get("content")
        if isinstance(content, str):
            content = [{"type": "text", "text": content}]
        for b in content or []:
            t = b.get("type")
            if e["type"] == "user" and t == "text":
                txt = b["text"]
                if txt.startswith("<") and ("system-reminder" in txt[:40] or "browser_instruction" in txt[:40]):
                    continue
                out.append(f"\n## USER {ts}\n{clip(txt, 3000)}")
            elif e["type"] == "user" and t == "tool_result" and b.get("is_error"):
                c = b.get("content")
                c = c if isinstance(c, str) else " ".join(x.get("text", "") for x in c or [])
                out.append(f"[tool error] {clip(c, 300)}")
            elif e["type"] == "assistant" and t == "text" and b["text"].strip():
                out.append(f"\n## CLAUDE {ts}\n{clip(b['text'], 3000)}")
            elif e["type"] == "assistant" and t == "tool_use":
                out.append(tool_line(b))
    return out, title, cwd, first, last


def arg(args, name, default=None):
    return args[args.index(name) + 1] if name in args else default


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        sys.exit(2)
    out_dir = args[0]
    since = arg(args, "--since")
    state_path = arg(args, "--state")
    config_path = arg(args, "--config")
    max_chars = int(arg(args, "--max-chars", 0)) or None
    state = json.load(open(state_path, encoding="utf-8")) if state_path and os.path.exists(state_path) else {}
    config = json.load(open(config_path, encoding="utf-8")) if config_path and os.path.exists(config_path) else {}
    exclude = set((config.get("upkeep") or {}).get("exclude_projects", []))
    os.makedirs(out_dir, exist_ok=True)
    cutoff = dt.datetime.fromisoformat(since).timestamp() if since else 0
    now = dt.datetime.now().timestamp()
    written, total_chars, deferred, skipped = [], 0, 0, 0
    paths = sorted(glob.glob(os.path.join(PROJECTS, "*", "*.jsonl")), key=os.path.getmtime)  # oldest first
    for path in paths:
        proj = os.path.basename(os.path.dirname(path))
        if proj in exclude or os.path.getmtime(path) < cutoff:
            continue
        key = f"{proj}/{os.path.basename(path)}"
        start = state.get(key, 0)
        with open(path, encoding="utf-8") as fh:
            lines = fh.readlines()
        if start >= len(lines):
            continue
        if is_upkeep(lines):
            state[key] = len(lines)
            skipped += 1
            continue
        out, title, cwd, first, last = condense(lines, start)
        text = "\n".join(out)
        if len(text) < MIN_CHARS:
            if now - os.path.getmtime(path) > IDLE_SECONDS:
                state[key] = len(lines)  # finished and trivial
            continue  # still active: let new lines accumulate
        if max_chars and written and total_chars + len(text) > max_chars:
            deferred += 1  # over budget: leave its cursor for the next run
            continue
        state[key] = len(lines)
        sid = os.path.basename(path)[:8]
        header = (f"# Session {sid}: {title or '(untitled)'}\n\ncwd: {cwd}\ntime: {first} to {last} UTC\n"
                  f"transcript: {path}\nlines: {start + 1} to {len(lines)}\n")
        dest = os.path.join(out_dir, f"{(first or '')[:10]}_{sid}.md")
        open(dest, "w", encoding="utf-8", newline="\n").write(header + text + "\n")
        written.append((dest, len(text)))
        total_chars += len(text)
    if state_path:
        # Cursors as of this condense; the run copies this over the state file only after it commits.
        json.dump(state, open(os.path.join(out_dir, "harvest-state.next.json"), "w", encoding="utf-8", newline="\n"), indent=1, sort_keys=True)
        if "--update-state" in args:
            json.dump(state, open(state_path, "w", encoding="utf-8", newline="\n"), indent=1, sort_keys=True)
    for dest, size in written:
        print(f"{size:>9,}  {os.path.basename(dest)}")
    print(f"{len(written)} sessions, {total_chars:,} chars"
          + (f"; {deferred} deferred to the next run (over --max-chars)" if deferred else "")
          + (f"; {skipped} upkeep sessions skipped" if skipped else ""))


if __name__ == "__main__":
    main()
