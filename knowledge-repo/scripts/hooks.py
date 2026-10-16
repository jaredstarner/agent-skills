"""Claude Code hooks that bind every session to an OKF knowledge bundle. Lives in the bundle's tools/ folder.

    python tools/hooks.py session-start   SessionStart: point at the bundle and this folder's concept
    python tools/hooks.py prompt          UserPromptSubmit: point at concepts a prompt names (once each)
    python tools/hooks.py stop            Stop: after substantial work with nothing filed, ask once to file
    python tools/hooks.py sync            Stop (async): okf_check --fix, then commit and push any changes

Hook input arrives as JSON on stdin. Per-session state and a log live in <temp>/claude-knowledge-hooks.
Every mode fails open: an error never blocks a session. Settings come from tools/knowledge.json.
"""
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, "tools", "knowledge.json")
STATE_DIR = os.path.join(tempfile.gettempdir(), "claude-knowledge-hooks")
LOG = os.path.join(STATE_DIR, "hooks.log")
CONVENTIONS = "projects/knowledge.md"
# Unattended runs, and the upkeep skill's own sessions, skip the filing nudge.
SKIP_MARKERS = ("--scheduled", "/knowledge-upkeep", ":knowledge-upkeep", "[knowledge-upkeep]")
MIN_MATCH_LEN = 6  # shorter project names match too much ordinary text


def load_config():
    try:
        return json.load(open(CONFIG_PATH, encoding="utf-8"))
    except (OSError, ValueError):
        return {}


CONFIG = load_config()
NUDGE_AFTER = int((CONFIG.get("hooks") or {}).get("nudge_after_tool_calls", 25))
OKF_VERSION = CONFIG.get("okf_version", "0.2")


def norm(p):
    """Comparable form of a path: absolute, normalized, case-folded where the OS is case-insensitive."""
    p = (p or "").strip()
    if not p:
        return ""
    if os.name == "nt":
        m = re.match(r"^/([a-zA-Z])/(.*)$", p.replace("\\", "/"))  # Git Bash /c/Users -> c:/Users
        if m:
            p = f"{m.group(1)}:/{m.group(2)}"
    return os.path.normcase(os.path.normpath(os.path.expanduser(p)))


def under(path, folder):
    return bool(folder) and (path == folder or path.startswith(folder.rstrip(os.sep) + os.sep))


def frontmatter(path):
    text = open(path, encoding="utf-8").read().replace("\r\n", "\n")
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    fm = {}
    for line in text[4:end].splitlines():  # flat keys only; no YAML dependency in hooks
        m = re.match(r"^(title|description|local_path|type):\s*(.*)$", line)
        if m:
            fm[m.group(1)] = m.group(2).strip().strip('"')
    return fm


def projects():
    out = []
    d = os.path.join(ROOT, "projects")
    if not os.path.isdir(d):
        return out
    for f in sorted(os.listdir(d)):
        if f.endswith(".md") and f not in ("index.md", "log.md"):
            fm = frontmatter(os.path.join(d, f))
            out.append({"slug": f[:-3], "path": f"projects/{f}", **fm})
    return out


def state_path(session_id):
    os.makedirs(STATE_DIR, exist_ok=True)
    return os.path.join(STATE_DIR, re.sub(r"[^A-Za-z0-9_-]", "", session_id or "unknown") + ".json")


def load_state(session_id):
    try:
        return json.load(open(state_path(session_id), encoding="utf-8"))
    except (OSError, ValueError):
        return {"pointed": [], "offset": 0, "tools": 0, "filed": False, "skip": None}


def save_state(session_id, st):
    json.dump(st, open(state_path(session_id), "w", encoding="utf-8"))


def emit(event, context):
    print(json.dumps({"hookSpecificOutput": {"hookEventName": event, "additionalContext": context}}))


def concept_line(p):
    return f"{os.path.join(ROOT, *p['path'].split('/'))} ({p.get('title', p['slug'])}: {p.get('description', '')})"


def session_start(inp):
    cwd = norm(inp.get("cwd"))
    st = load_state(inp.get("session_id"))
    match = None
    for p in projects():
        lp = norm(p.get("local_path"))
        if under(cwd, lp) and (not match or len(lp) > len(norm(match.get("local_path")))):
            match = p
    lines = [
        f"Knowledge bundle (OKF v{OKF_VERSION}): {ROOT}. Read its index.md for the map before work on a known project or topic.",
        f"File settled decisions, rules, gotchas, and facts into the matching concept and add a log.md line, per {CONVENTIONS}. "
        "Indexes, checks, commit, and push happen automatically when you stop.",
    ]
    if match:
        lines.insert(1, f"This folder's concept, read it before working here: {concept_line(match)}")
        st["pointed"] = sorted(set(st["pointed"]) | {match["slug"]})
    save_state(inp.get("session_id"), st)
    emit("SessionStart", "\n".join(lines))


def prompt(inp):
    text = (inp.get("prompt") or "").lower()
    st = load_state(inp.get("session_id"))
    if st["skip"] is None:
        st["skip"] = any(m in text for m in SKIP_MARKERS)
    root = norm(ROOT)
    hits = []
    for p in projects():
        if p["slug"] in st["pointed"] or norm(p.get("local_path")) == root:
            continue  # already pointed at, or the bundle's own concept
        names = {p["slug"], p.get("title", "").lower(), os.path.basename(norm(p.get("local_path")))}
        if any(len(n) >= MIN_MATCH_LEN and re.search(r"(?<![\w.-])" + re.escape(n) + r"(?![\w-])", text) for n in names if n):
            hits.append(p)
    if hits:
        st["pointed"] = sorted(set(st["pointed"]) | {p["slug"] for p in hits})
        emit("UserPromptSubmit", "Knowledge concepts for what this prompt names; read before acting:\n" +
             "\n".join(concept_line(p) for p in hits))
    save_state(inp.get("session_id"), st)


def scan_transcript(path, st):
    """Count tool calls and knowledge writes since the stored offset."""
    root = norm(ROOT)
    with open(path, "rb") as fh:
        fh.seek(st["offset"])
        for raw in fh:
            st["offset"] += len(raw)
            try:
                e = json.loads(raw)
            except ValueError:
                continue
            if st["skip"] is None and e.get("type") == "user":
                c = (e.get("message") or {}).get("content")
                t = c if isinstance(c, str) else " ".join(b.get("text", "") for b in c or [] if isinstance(b, dict))
                if t.strip():
                    st["skip"] = any(m in t for m in SKIP_MARKERS)
            if e.get("type") != "assistant" or e.get("isSidechain"):
                continue
            for b in (e.get("message") or {}).get("content") or []:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    st["tools"] += 1
                    target = norm((b.get("input") or {}).get("file_path"))
                    if b.get("name") in ("Edit", "Write", "NotebookEdit") and under(target, root):
                        st["filed"] = True


def stop(inp):
    if inp.get("stop_hook_active"):
        return
    sid = inp.get("session_id")
    st = load_state(sid)
    path = inp.get("transcript_path")
    if path and os.path.exists(path):
        scan_transcript(path, st)
    nudge = NUDGE_AFTER > 0 and not st["skip"] and st["tools"] >= NUDGE_AFTER and not st["filed"]
    if st["filed"] or nudge:
        st["tools"], st["filed"] = 0, False
    save_state(sid, st)
    if nudge:
        print(json.dumps({"decision": "block", "reason": (
            f"Knowledge check (automatic, about every {NUDGE_AFTER} tool calls): if this stretch of work settled decisions, "
            f"rules, gotchas, or durable facts, file them now in {ROOT} per {CONVENTIONS} (update the concept, add a "
            "log.md line). Commit and push happen automatically. If nothing durable came up, reply with one short line saying so.")}))


def git(*args):
    return subprocess.run(["git", "-C", ROOT, *args], capture_output=True, text=True, encoding="utf-8")


def sync(inp):
    lock = os.path.join(STATE_DIR, "sync.lock")
    os.makedirs(STATE_DIR, exist_ok=True)
    try:
        os.mkdir(lock)
    except FileExistsError:
        if dt.datetime.now().timestamp() - os.path.getmtime(lock) < 300:
            return  # another session is syncing
        os.rmdir(lock)
        os.mkdir(lock)
    try:
        if not git("status", "--porcelain").stdout.strip():
            return
        check = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "okf_check.py"), "--fix"],
                               capture_output=True, text=True, encoding="utf-8", env={**os.environ, "PYTHONIOENCODING": "utf-8"})
        if check.returncode != 0:
            log(f"sync skipped, checker errors:\n{check.stdout}")
            return
        git("add", "-A")
        files = git("diff", "--cached", "--name-only").stdout.split()
        if not files:
            return
        sid = (inp.get("session_id") or "unknown")[:8]
        body = "\n".join(f"- {f}" for f in files[:40])
        # The working tree is shared, so pending edits may come from any session; say which stop picked them up.
        r = git("commit", "-q", "-m", "sync: pending knowledge changes", "-m",
                f"Committed by the Stop hook of session {sid}; may include other sessions' edits.\n\n{body}")
        if r.returncode != 0:
            log(f"commit failed: {r.stderr}")
            return
        if git("remote").stdout.strip():
            git("pull", "-q", "--rebase")
            r = git("push", "-q")
            log(f"synced {len(files)} files from {sid}" + (f"; push failed: {r.stderr}" if r.returncode else ""))
        else:
            log(f"committed {len(files)} files from {sid}; no remote to push to")
    finally:
        os.rmdir(lock)


def log(msg):
    os.makedirs(STATE_DIR, exist_ok=True)
    with open(LOG, "a", encoding="utf-8") as fh:
        fh.write(f"{dt.datetime.now().isoformat(timespec='seconds')} {msg}\n")


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    try:
        inp = json.loads(sys.stdin.read() or "{}")
        {"session-start": session_start, "prompt": prompt, "stop": stop, "sync": sync}[mode](inp)
    except Exception as e:  # fail open
        try:
            log(f"{mode} error: {e!r}")
        except OSError:
            pass


if __name__ == "__main__":
    main()
