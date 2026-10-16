"""Validate every skill in the repo. Run from the repo root: python .github/scripts/validate_skills.py

A skill is any tracked top-level folder (dot folders excluded). Checks:
- the folder has a SKILL.md whose frontmatter parses as YAML
- frontmatter uses only the keys claude.ai accepts on upload
- name matches the folder and the Agent Skills naming rules
- description is present and at most 1024 characters
- the skill is listed in README.md and in each issue form's skill dropdown
- no tracked text file contains an em-dash (house style)
"""

import re
import subprocess
import sys
from pathlib import Path

import yaml

ALLOWED_KEYS = {"name", "description", "license", "compatibility", "metadata", "allowed-tools"}
NAME_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_NAME = 64
MAX_DESCRIPTION = 1024
EM_DASH = chr(0x2014)
ISSUE_FORMS = [".github/ISSUE_TEMPLATE/skill-bug.yml", ".github/ISSUE_TEMPLATE/skill-change.yml"]


def tracked_files():
    out = subprocess.run(["git", "ls-files", "-z"], capture_output=True, text=True, check=True).stdout
    return [Path(p) for p in out.split("\0") if p]


def frontmatter(text):
    if not text.startswith("---\n"):
        return None
    head, sep, _ = text[4:].partition("\n---\n")
    return yaml.safe_load(head) if sep else None


def check_skill(folder, errors):
    path = folder / "SKILL.md"
    if not path.is_file():
        errors.append(f"{folder}: no SKILL.md")
        return
    try:
        meta = frontmatter(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as e:
        errors.append(f"{path}: frontmatter is not valid YAML ({e.__class__.__name__}); quote a description that contains colons")
        return
    if not isinstance(meta, dict):
        errors.append(f"{path}: missing frontmatter between --- lines")
        return
    extra = set(meta) - ALLOWED_KEYS
    if extra:
        errors.append(f"{path}: frontmatter keys not accepted on upload: {', '.join(sorted(extra))}")
    name = meta.get("name")
    if name != folder.name:
        errors.append(f"{path}: name '{name}' does not match folder '{folder.name}'")
    elif len(name) > MAX_NAME or not NAME_RE.match(name):
        errors.append(f"{path}: name must be lowercase letters, digits, and single hyphens, at most {MAX_NAME} characters")
    description = meta.get("description")
    if not isinstance(description, str) or not description.strip():
        errors.append(f"{path}: description is missing")
    elif len(description) > MAX_DESCRIPTION:
        errors.append(f"{path}: description is {len(description)} characters (max {MAX_DESCRIPTION})")


def main():
    files = tracked_files()
    skills = sorted({p.parts[0] for p in files if len(p.parts) > 1 and not p.parts[0].startswith(".")})
    errors = []

    for name in skills:
        check_skill(Path(name), errors)

    readme = Path("README.md").read_text(encoding="utf-8")
    for name in skills:
        if f"]({name}/SKILL.md)" not in readme:
            errors.append(f"README.md: skills table has no row for {name}")

    for form in ISSUE_FORMS:
        body = yaml.safe_load(Path(form).read_text(encoding="utf-8"))["body"]
        options = next(b["attributes"]["options"] for b in body if b.get("id") == "skill")
        for name in skills:
            if name not in options:
                errors.append(f"{form}: skill dropdown is missing {name}")

    for p in files:
        try:
            text = p.read_text(encoding="utf-8")
        except (UnicodeDecodeError, FileNotFoundError):
            continue
        for i, line in enumerate(text.splitlines(), 1):
            if EM_DASH in line:
                errors.append(f"{p}:{i}: em-dash; use a comma, colon, semicolon, or parentheses")

    for e in errors:
        print(f"error: {e}")
    print(f"{len(skills)} skills checked, {len(errors)} errors")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
