# GitHub Pages notes

Verified during a cutover from a Squarespace-registered domain (2026-09). Re-check GitHub's current docs for anything that looks different.

## Fit

- Read the usage terms in `../stack-choice.md` section 5 before choosing Pages for a commercial site.
- A Pages site from a private repository needs a paid plan (the source build used GitHub Pro). The repo stays private; the published site is public.
- A private repo cannot offer a public "source" link on the site; check with `gh repo view --json visibility`.
- Create the repo with `gh repo create <name> --private --source . --push`, guarded by `gh repo view` so it is not created twice.

## Cutover order

1. **Verify the domain at the account level** (Settings, Pages, Add a domain). The owner adds a TXT record `_github-pages-challenge-<user>` at the registrar. Keep that TXT record permanently.
2. **Add the deploy workflow** (see the stack file).
3. **Set Pages source to "GitHub Actions"** in the repo settings before the first push of the workflow.
4. **Push** and confirm the run succeeded: `gh run list --json headSha,status,conclusion`, or `gh run watch <id> --exit-status`. `gh run list` can lag right after a push.
5. **Set the custom domain** in the repo's Pages settings.
6. **Change DNS** at the registrar (record set below), after getting a paste of the full current zone from the owner.
7. **Wait for the certificate.** Check with the Pages API (`gh api repos/<owner>/<repo>/pages`, field `https_certificate`) and `curl -I https://<domain>`.
8. **Enforce HTTPS** once the certificate is issued.

## Record set (apex canonical)

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | `<user>.github.io` |
| TXT | `_github-pages-challenge-<user>` | value from GitHub (keep permanently) |

Delete the registrar's default records for the apex and www, including any default **HTTPS (SVCB, type 65)** record. Resolvers that do not show type 65 make it easy to miss; query it explicitly. Keep MX and other TXT records the owner uses. Check these IPs against GitHub's "Managing a custom domain" docs at cutover time.

With apex canonical, GitHub serves `www` as a redirect to the apex.

## Known behaviors

- GitHub's DNS check can cache the old TTL for hours (4 hours in the source build). Errors such as `NotServedByPagesError` and a failed certificate request cleared on their own. Set that expectation before asking the owner to retry.
- Removing and re-adding the custom domain to force a certificate was predicted and turned out unnecessary.
- `public/CNAME` is not needed with Actions-based deploys (the custom domain lives in the repo settings). Whether it had any effect in the source build was never confirmed; it was kept as harmless.
- Pages served HTML with `Cache-Control: max-age=600` in the source build. After a deploy that replaces a hashed stylesheet, a browser with cached HTML can render a page unstyled until a hard refresh.
- Pages does not let you set response headers. Browser console warnings about `Permissions-Policy` came from the client (extensions or browser features), not from Pages headers; check with `curl -I` before attributing headers to the host.
- `gh release view` has no `isLatest` field.

## DNS verification commands

- Windows: `Resolve-DnsName <domain> -Type A -Server 8.8.8.8` (also AAAA, CNAME, CAA, TXT). For type 65 records, use a DNS-over-HTTPS JSON endpoint, for example `curl -s "https://dns.google/resolve?name=<domain>&type=65"`.
- Authoritative check: find the registrar's nameservers (`-Type NS`) and query one directly to see what is actually published.
- Bypass DNS to test the host: `curl -sI --resolve <domain>:443:185.199.108.153 https://<domain>`.
- Windows `curl` (schannel) does not print certificate subjects; exit code 60 means a certificate mismatch. Use `-o NUL` in cmd or PowerShell.
