# Contributing

Suggestions and fixes are welcome: bug reports, improvements to an existing skill, and ideas for new ones. By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Suggesting a change

Open an issue with one of the forms: **Skill bug**, **Skill improvement**, or **New skill idea**. For anything beyond a small fix, start with an issue so the idea can be discussed before you write it. Report security issues privately; see [SECURITY.md](SECURITY.md).

## Making a change

1. Fork the repo and clone your fork
2. Set up commit signing (SSH or GPG) and add the key to your GitHub account as a **signing** key; see [GitHub's guide](https://docs.github.com/en/authentication/managing-commit-signature-verification/about-commit-signature-verification). Your commit email must be a verified email on your GitHub account, or the signature shows as unverified. Unverified commits cannot be merged
3. Branch from `main`, named `<type>/<short-description>` (for example `fix/website-screenshot-wait`)
4. Make small, focused, signed commits with [Conventional Commit](https://www.conventionalcommits.org) messages, scoped to the skill where it fits (`fix(website): ...`)
5. Run the validator (Python 3.10+): `pip install -r .github/scripts/requirements.txt`, then `python .github/scripts/validate_skills.py`
6. Run the changed skill end to end in an agent
7. Open a pull request into `main` and fill in the template

The rules for skill content are in the **Skill rules** section of [AGENTS.md](AGENTS.md), which both people and coding agents follow.

## Review and merge

Every pull request into `main` needs the `validate-skills` check to pass, signed and verified commits, and the owner's approval. CI on a fork pull request runs only after the owner approves it. Pull requests merge with a merge commit; merged branches are deleted automatically.
