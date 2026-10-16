"""Check and maintain an OKF knowledge bundle. Lives in the bundle's tools/ folder.

    python tools/okf_check.py          report only; exit 1 on conformance errors
    python tools/okf_check.py --fix    also add OKF fields to agent-written memories and rebuild every index.md

Conformance errors: a non-reserved .md without parseable frontmatter or `type`, or text matching a token pattern.
Warnings: broken bundle links, past stale_after, memory files missing from MEMORY.md, project memories that
hold details instead of pointing to projects/, and (when style.no_em_dashes is on) em-dashes.

Settings come from tools/knowledge.json (see the knowledge-repo skill). Needs Python 3.10+ and PyYAML.
"""
import datetime as dt
import json
import os
import re
import sys

import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_PATH = os.path.join(ROOT, "tools", "knowledge.json")
RESERVED = {"index.md", "log.md"}
SKIP_DIRS = {".git", "tools"}
# Claude Code auto-memory kinds -> OKF types
TYPE_MAP = {"user": "Profile", "feedback": "Preference", "project": "Project", "reference": "Reference"}
TYPE_ORDER = ["Preference", "Profile", "Project", "Approach", "Research", "Environment", "Reference"]
SECRET_PATTERNS = re.compile(
    r"(ghp_[A-Za-z0-9]{30,}|gho_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|glpat-[A-Za-z0-9_-]{20,}"
    r"|sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{32,}|xox[abprs]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----)")
POINTER_MAX_BODY = 900  # chars; a project memory longer than this probably holds details
EM_DASH = chr(0x2014)


def load_config():
    try:
        return json.load(open(CONFIG_PATH, encoding="utf-8"))
    except (OSError, ValueError):
        return {}


CONFIG = load_config()
MEMORY_DIR = CONFIG.get("memory_dir", "memory")
AREAS = CONFIG.get("areas", {})
NO_EM_DASHES = (CONFIG.get("style") or {}).get("no_em_dashes", False)


def split(text):
    text = text.replace("\r\n", "\n")
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---\n", 4)
    if end < 0:
        return None, text
    return text[4:end], text[end + 5:]


def concepts():
    for d, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(x for x in dirs if x not in SKIP_DIRS and not x.startswith("."))
        for f in sorted(files):
            if f.endswith(".md") and f not in RESERVED:
                yield os.path.join(d, f)


def rel(p):
    return os.path.relpath(p, ROOT).replace("\\", "/")


def now_utc():
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def memory_index_path():
    return os.path.join(ROOT, MEMORY_DIR, "MEMORY.md")


def memory_titles():
    p = memory_index_path()
    text = open(p, encoding="utf-8").read() if os.path.exists(p) else ""
    return dict((f, t) for t, f in re.findall(r"^- \[(.+?)\]\((.+?\.md)\)", text, re.M))


def normalize_memory_index(path):
    """The agent may write MEMORY.md without frontmatter; give it the OKF type it needs."""
    text = open(path, encoding="utf-8").read()
    if split(text)[0] is not None:
        return False
    fm = f'type: Memory Index\ntitle: "Memory index"\ngenerated: {{ by: claude-code/unknown, at: {now_utc()} }}\n'
    open(path, "w", encoding="utf-8", newline="\n").write(f"---\n{fm}---\n{text}")
    return True


def normalize_memory(path, fm_text, body, titles):
    """Add type/title/generated to a memory file Claude Code wrote in its own format."""
    fm = yaml.safe_load(fm_text) or {}
    mtype = (fm.get("metadata") or {}).get("type")
    if fm.get("type") or mtype not in TYPE_MAP:
        return False
    name = os.path.basename(path)
    title = (titles.get(name) or fm.get("name") or name[:-3]).replace('"', "'")
    mod = (fm.get("metadata") or {}).get("modified")
    at = mod.isoformat().replace("+00:00", "Z") if isinstance(mod, dt.datetime) else (mod or
        dt.datetime.fromtimestamp(os.path.getmtime(path), dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    new_fm = (f'type: {TYPE_MAP[mtype]}\ntitle: "{title}"\n{fm_text.rstrip()}\n'
              f"generated: {{ by: claude-code/unknown, at: {at} }}\n")
    open(path, "w", encoding="utf-8", newline="\n").write(f"---\n{new_fm}---\n{body}")
    return True


def build_indexes(meta):
    by_dir = {}
    for path, fm in meta.items():
        d = os.path.dirname(path)
        if d != ROOT and os.path.basename(path) != "MEMORY.md":
            by_dir.setdefault(d, []).append((path, fm))
    for d, items in by_dir.items():
        groups = {}
        for path, fm in items:
            line = f"* [{fm.get('title') or os.path.basename(path)[:-3]}]({os.path.basename(path)}) - {fm.get('description', '')}".rstrip(" -")
            groups.setdefault(fm["type"], []).append(line)
        order = [t for t in TYPE_ORDER if t in groups] + sorted(t for t in groups if t not in TYPE_ORDER)
        parts = [f"# {t}\n\n" + "\n".join(groups[t]) + "\n" for t in order]
        subdirs = sorted(x for x in os.listdir(d) if os.path.isdir(os.path.join(d, x)) and not x.startswith("."))
        if subdirs:
            parts.append("# Subdirectories\n\n" + "\n".join(f"* [{s}]({s}/index.md)" for s in subdirs) + "\n")
        if os.path.basename(d) == MEMORY_DIR and os.path.exists(os.path.join(d, "MEMORY.md")):
            parts.append("# Index\n\n* [Memory index](MEMORY.md) - Always-loaded index of agent memory, one line per memory file.\n")
        open(os.path.join(d, "index.md"), "w", encoding="utf-8", newline="\n").write("\n".join(parts))
    top = sorted(x for x in os.listdir(ROOT)
                 if os.path.isdir(os.path.join(ROOT, x)) and x not in SKIP_DIRS and not x.startswith("."))
    root_concepts = [(p, fm) for p, fm in meta.items() if os.path.dirname(p) == ROOT]
    root = [f'---\nokf_version: "{CONFIG.get("okf_version", "0.2")}"\n---\n# Subdirectories\n']
    root += [f"* [{s}]({s}/index.md) - {AREAS.get(s, '[TBD] describe this directory in tools/knowledge.json')}" for s in top]
    if root_concepts:
        root += ["\n# Root\n"] + [f"* [{fm.get('title') or os.path.basename(p)}]({os.path.basename(p)}) - {fm.get('description', '')}"
                                  for p, fm in root_concepts]
    open(os.path.join(ROOT, "index.md"), "w", encoding="utf-8", newline="\n").write("\n".join(root) + "\n")


def main():
    fix = "--fix" in sys.argv
    now = dt.datetime.now(dt.timezone.utc)
    errors, warnings, fixed, meta = [], [], [], {}
    if fix and os.path.exists(memory_index_path()) and normalize_memory_index(memory_index_path()):
        fixed.append(f"{rel(memory_index_path())}: added OKF fields")
    titles = memory_titles()
    listed = set(titles)
    for path in concepts():
        text = open(path, encoding="utf-8").read()
        fm_text, body = split(text)
        if fm_text is None:
            errors.append(f"{rel(path)}: no frontmatter")
            continue
        try:
            fm = yaml.safe_load(fm_text) or {}
        except yaml.YAMLError as e:
            errors.append(f"{rel(path)}: bad YAML ({str(e).splitlines()[0]})")
            continue
        in_memory = rel(path).startswith(MEMORY_DIR + "/")
        if not fm.get("type") and in_memory and fix and normalize_memory(path, fm_text, body, titles):
            fixed.append(f"{rel(path)}: added OKF fields")
            fm = yaml.safe_load(split(open(path, encoding="utf-8").read())[0])
        if not fm.get("type"):
            errors.append(f"{rel(path)}: no type")
            continue
        meta[path] = fm
        if SECRET_PATTERNS.search(text):
            errors.append(f"{rel(path)}: looks like it contains a secret")
        if NO_EM_DASHES and EM_DASH in text:
            warnings.append(f"{rel(path)}: em-dash")
        sa = fm.get("stale_after")
        if isinstance(sa, dt.datetime) and sa.tzinfo and sa <= now:
            warnings.append(f"{rel(path)}: stale since {sa.date()}, re-check {fm.get('resource', 'its sources')}")
        for target in re.findall(r"\]\((/[^)#\s]+\.md)", body):
            if not os.path.exists(os.path.join(ROOT, target.lstrip("/"))):
                warnings.append(f"{rel(path)}: broken link {target}")
        if in_memory and os.path.basename(path) != "MEMORY.md":
            if os.path.basename(path) not in listed:
                warnings.append(f"{rel(path)}: not listed in MEMORY.md")
            if fm.get("type") == "Project" and len(body) > POINTER_MAX_BODY:
                warnings.append(f"{rel(path)}: project memory holds details; move them to projects/ and leave a pointer")
    if fix and not errors:
        build_indexes(meta)
        fixed.append("rebuilt index.md files")
    for label, items in (("FIXED", fixed), ("ERROR", errors), ("WARN", warnings)):
        for i in items:
            print(f"{label}  {i}")
    print(f"{len(meta)} concepts, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
